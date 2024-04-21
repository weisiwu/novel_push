import puppeteer_manage from './puppeteer_manage.js'
import kuaishouTypes from '../../node/platform_api/kuaishou_type_list.json'
import { CMDS, platformNames } from '../../../../src/renderer/src/constants.js'

const platform = platformNames.KUAISHOU
const queryUploadProcessInterval = 500
const hourMilSec = 60 * 60 * 1e3
const uploadPageUrl = 'https://cp.kuaishou.com/article/publish/video'

/**
 * 上传单个快手视频
 * @param video {Object} 视频
 * @param cover {String} 封面
 * @param mainPage {Browser} 无头浏览器页面
 * @param videoInfo {Object} 视频模板信息
 * @param updateProgress {Function} 上传日志回调
 * @param uploadVideoProgress {Function} 上传进度回调
 */
const kuaishou_upload_single_video = async ({
  video,
  mainPage,
  videoInfo,
  updateProgress,
  uploadVideoProgress
}) => {
  await mainPage.goto(uploadPageUrl, { waitUntil: 'load' })
  // 快手是先页面结构ready，后渲染上传组件
  await mainPage.waitForSelector('input[type=file]')
  const fileInput = await mainPage.$('input[type=file]')

  if (!fileInput) {
    await mainPage.close()
    updateProgress(`[${platform}]上传视频${video?.name || ''}失败`, 'error')
    return false
  }

  // 将传入的视频上传到input中
  try {
    await fileInput.uploadFile(video?.path)
  } catch (e) {
    updateProgress(`[${platform}]选择视频${video?.path || ''}失败。${e?.message || ''}`, 'error')
    return false
  }

  // 每0.5秒查询一次上传进度
  await mainPage.waitForSelector('.anticon-info-circle')
  await new Promise((resolve, reject) => {
    const is_finished_timer = setInterval(async () => {
      const bodyNode = await mainPage.$('#onvideo_creator_platform')
      // 因为快手的所有节点的class都是hash值，没有办法和节点产生大致的关联
      // 所以上传进度百分值节点，通过限定上层的节点范围，以求尽量准确
      const percentNode = await bodyNode.$('text/%')
      const isSuccessNode = await bodyNode.$('.anticon-check-circle')
      const isFailNode = await bodyNode.$('.anticon-close-circle')
      const isProcessingNode = await bodyNode.$('.anticon-info-circle')
      const percentNodeTagName = percentNode
        ? await percentNode.evaluate((node) => node.tagName)
        : ''

      // 上传进度是数字
      const percentTxt = percentNode ? await percentNode.evaluate((el) => el?.innerHTML) : ''
      const percentNumber = Number(percentTxt?.replace?.('%', ''))

      if (isProcessingNode) {
        // TODO:(wsw) 这里存在问题。如果获取不到进度呢？
        if (percentNodeTagName === 'SPAN' && !Number.isNaN(percentNumber)) {
          // 由于匹配逻辑比较差，所以强行校验是否可以转化为数字
          console.log(`wswTest:视频${video?.name || ''}上传${platform}中:${percentTxt}`)
          uploadVideoProgress(percentTxt?.replace?.('%', ''))
        }
      }

      if (isSuccessNode) {
        // 当已上传文本节点出现的时候，已经开始正常上传，可以等待上传结束(且有上传进度)
        clearInterval(is_finished_timer)
        uploadVideoProgress(100)
        updateProgress(`[${platform}]上传${video?.name || ''}成功`)
        return resolve(true)
      }

      if (isFailNode) {
        clearInterval(is_finished_timer)
        return reject(`[${platform}]上传视频${video?.name || ''}失败`)
      }
    }, queryUploadProcessInterval)
  }).catch((e) => {
    updateProgress(`[${platform}]上传视频${video?.path || ''}失败。${e || ''}`, 'error')
    return false
  })

  // 输入标题
  if (videoInfo?.title) {
    try {
      const titleNode = await mainPage.$('div[contenteditable="true"][placeholder]')
      const kuaishou_title = `${videoInfo?.tags
        ?.map?.((tag) => `#${tag}`)
        ?.join?.(' ')} ${videoInfo?.title || ''}`

      if (titleNode) {
        await titleNode.click()
        await mainPage.keyboard.sendCharacter(kuaishou_title)
        console.log(`wswTest: 标题输入完成: ${kuaishou_title}`)
        updateProgress(`[${platform}]标题输入完成: ${kuaishou_title}`)
      } else {
        console.log(`wswTest: 标题输入失败: ${kuaishou_title}`)
        updateProgress(`[${platform}]标题输入失败: ${kuaishou_title}`, 'error')
        return false
      }
    } catch (e) {
      updateProgress(`[${platform}]标题输入失败: ${e?.message || ''}`, 'error')
      return false
    }
  }

  // 模拟点击:个性化设置
  // 1、拍同框 2、是否允许下载 3、是否同城展示
  try {
    const allowSameFrameNode = await mainPage.$('input[type="checkbox"][value=allowSameFrame]')
    const allowDownloadNode = await mainPage.$('input[type="checkbox"][value=downloadType]')
    const hideInSameCityNode = await mainPage.$('input[type="checkbox"][value=disableNearbyShow]')

    // 默认为真，用户选择假才点击
    if (allowSameFrameNode && !videoInfo?.allowSameScreen) {
      await allowSameFrameNode.click()
      console.log(`wswTest: 个性化设置-拍同框: ${videoInfo?.allowSameScreen}`)
      updateProgress(`[${platform}]个性化设置-拍同框: ${videoInfo?.allowSameScreen}`)
    }

    if (allowDownloadNode && videoInfo?.allowDownload) {
      await allowDownloadNode.click()
      console.log(`wswTest: 个性化设置-不允许下载此作品: ${videoInfo?.allowDownload}`)
      updateProgress(`[${platform}]个性化设置-不允许下载此作品: ${videoInfo?.allowDownload}`)
    }

    if (hideInSameCityNode && videoInfo?.hideInSameCity) {
      await hideInSameCityNode.click()
      console.log(`wswTest: 个性化设置-作品在同城不显示: ${videoInfo?.hideInSameCity}`)
      updateProgress(`[${platform}]个性化设置-作品在同城不显示: ${videoInfo?.hideInSameCity}`)
    }
  } catch (e) {
    updateProgress(`[${platform}]个性化设置: ${e?.message || ''}`, 'error')
  }

  // 模拟点击: 查看权限
  try {
    const publicNode = await mainPage.$('input.ant-radio-input[type=radio][value="1"]')
    const friendSeeNode = await mainPage.$('input.ant-radio-input[type=radio][value="4"]')
    const onlySelfNode = await mainPage.$$('input.ant-radio-input[type=radio][value="2"]')?.[1]

    // 默认为真，用户选择假才点击
    if (Number(videoInfo?.privacyVal) === 1) {
      publicNode && (await publicNode.click())
    } else if (Number(videoInfo?.privacyVal) === 4) {
      friendSeeNode && (await friendSeeNode.click())
    } else if (Number(videoInfo?.privacyVal) === 2) {
      onlySelfNode && (await onlySelfNode.click())
    }
    console.log(`wswTest: 设置查看权限成功: ${videoInfo?.privacyVal}`)
    updateProgress(`[${platform}]设置查看权限成功: ${videoInfo?.privacyVal}`)
  } catch (e) {
    updateProgress(`[${platform}]设置查看权限发生错误: ${e?.message || ''}`, 'error')
  }

  // 模拟点击: 所属领域
  try {
    const typeSearchNode = await mainPage.$('input.ant-select-selection-search-input[type=search]')
    typeSearchNode && (await typeSearchNode.click())

    const type = videoInfo.type
    let firstCls = ''

    kuaishouTypes.forEach((firstClass) => {
      if (firstClass.children.find((item) => item.value === type)) {
        firstCls = firstClass.value
      }
    })
    const firstClsNode = await mainPage.$(
      `.ant-select-item.ant-select-item-option[title="${firstCls}"]`
    )
    firstClsNode && (await firstClsNode.click())
    const selects = await mainPage.$$('.ant-select.ant-select-single')
    selects[1] && (await selects[1].click())
    await mainPage.waitForSelector(`.ant-select-item.ant-select-item-option[title="${type}"]`)
    const secondClsNode = await mainPage.$(
      `.ant-select-item.ant-select-item-option[title="${type}"]`
    )
    secondClsNode && (await secondClsNode.click())
    console.log(`wswTest: 所属领域选择成功: ${firstCls}-${type}`)
    updateProgress(`[${platform}]所属领域选择成功: ${firstCls}-${type}`)
  } catch (e) {
    updateProgress(`[${platform}]选择所属领域错误: ${e?.message || ''}`, 'error')
    return false
  }

  // 模拟点击: 发布时间
  try {
    const dtime = videoInfo.dtime
    const dtimeDate = new Date(dtime)
    const year = String(dtimeDate.getFullYear())
    const month = String(dtimeDate.getMonth() + 1).padStart(2, 0)
    const date = String(dtimeDate.getDate()).padStart(2, 0)
    const hour = String(dtimeDate.getHours()).padStart(2, 0)
    const minutes = String(dtimeDate.getMinutes()).padStart(2, 0)
    const seconds = String(dtimeDate.getSeconds()).padStart(2, 0)
    if (dtime && year) {
      const nodes = await mainPage.$$(
        '.ant-radio-group input.ant-radio-input[type="radio"][value="2"]'
      )
      const dtimeBtn = nodes?.[2]

      if (dtimeBtn) {
        await dtimeBtn.click()
        const pickerInput = await mainPage.$('.ant-picker-input')
        pickerInput && (await pickerInput.click())
        await mainPage.keyboard.sendCharacter(
          `${year}-${month}-${date} ${hour}:${minutes}:${seconds}`
        )
        const pickerBtn = await mainPage.$('.ant-picker-dropdown .ant-picker-ok button')
        pickerBtn && (await pickerBtn.click())
      }
      console.log(`wswTest: 发布时间选择成功: ${dtime}`)
      updateProgress(`[${platform}]发布时间选择成功: ${dtime}`)
    }
  } catch (e) {
    updateProgress(`[${platform}]选择发布时间错误: ${e?.message || ''}`, 'error')
    return false
  }

  try {
    const buttonSpans = await mainPage.$$('button > span')
    for (let buttonSpan of buttonSpans) {
      const _text = await buttonSpan.evaluate((el) => el.innerHTML)
      if (_text === '发布') {
        await buttonSpan.click()
        break
      }
    }
    // 如果是定时发布，需要点击确定
    const btnSpans = await mainPage.$$('.ant-btn-primary span')
    for (let btnSpan of btnSpans) {
      const _text = await btnSpan.evaluate((el) => el.innerHTML)
      if (_text === '确认发布') {
        await btnSpan.click()
        break
      }
    }
    updateProgress(`视频${video?.name || ''}发布成功`, 'success')
  } catch (e) {
    updateProgress(`[${platform}]:视频最终发布失败: ${e?.message || ''}`, 'error')
    return false
  }

  // 发送完毕后，等待2秒，重刷新页面
  await (() => new Promise((resolve) => setTimeout(() => resolve(), 2000)))()
  await mainPage.reload()
  return true
}

/**
 * 批量上传快手视频
 * @param videoInfo {Object} 视频模板信息
 * @param videoList {Array<Object>} 视频列表
 * @param coverList {Array<String>} 封面列表
 * @param updateProgress {Function} 上传日志回调
 * @param uploadVideoProgress {Function} 上传进度回调
 */
const kuaishou_upload_video = async ({
  videoInfo = {},
  videoList = [],
  coverList = [],
  updateProgress = () => {},
  uploadVideoProgress = () => {},
  uploadVideoStepProgress = () => {}
}) => {
  // TODO:(wsw) 模拟操作
  const headless = false
  const uploadBrowser = await puppeteer_manage.launch(headless)
  const mainPage = await uploadBrowser.newPage()
  const screenWidth = await mainPage.evaluate(() => window.screen.width)
  const screenHeight = await mainPage.evaluate(() => window.screen.height)
  await mainPage.setViewport({ width: screenWidth, height: screenHeight })

  let distribute_times = 0
  let distribute_success = 0
  // 依次上传
  for (let index in videoList) {
    const video = videoList[index]
    const cover = coverList[index]
    const videoInfoData = {
      title: `${videoInfo?.title_prefix || ''}${video.name?.split?.('.')?.[0] || ''}`,
      desc: videoInfo?.desc || '',
      tags: videoInfo?.tag?.split?.(',') || [],
      allowSameScreen: Boolean(videoInfo?.kuaishou_allowSameScreen), // 【个性化设置】是否允许同屏
      allowDownload: Boolean(videoInfo?.kuaishou_allowDownload), // 【个性化设置】不允许下载此作品
      hideInSameCity: Boolean(videoInfo?.kuaishou_hideInSameCity), // 【个性化设置】同城不展示
      privacyVal: videoInfo?.kuaishou_privacyVal || 1, // 查看权限: 公开:1 好友可见:4 私密(仅自己可见):2
      type: videoInfo?.kuaishou_type || '', // 所属领域
      dtime: videoInfo?.kuaishou_dtime || '' // 假值: 立刻发送 2024-04-24 14:12:00 定时发送的时间
    }
    const upload_resut = await kuaishou_upload_single_video({
      video,
      cover,
      mainPage,
      videoInfo: videoInfoData,
      updateProgress,
      uploadVideoProgress
    })
    distribute_times++
    upload_resut && (distribute_success = distribute_success + 1)
    console.log('wswTest: 上传视频结果', video.name, upload_resut)
    uploadVideoStepProgress(
      `[${platform}]:${video?.name || ''}上传${upload_resut ? '成功_1' : '失败'}`
    )
  }
  if (distribute_success === distribute_times) {
    uploadVideoStepProgress(
      `[${platform}]当前视频队列已分发完毕，成功${distribute_success}个/共${distribute_times}个`,
      'success'
    )
  } else {
    uploadVideoStepProgress(
      `[${platform}]当前视频队列已分发完毕，成功${distribute_success}个/共${distribute_times}个`,
      'error'
    )
  }
}

export default kuaishou_upload_video
