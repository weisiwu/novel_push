import puppeteer_manage from './puppeteer_manage.js'
import { CMDS, platformNames } from '../../../../src/renderer/src/constants.js'

const platform = platformNames.XIGUA
const queryUploadProcessInterval = 500
const hourMilSec = 60 * 60 * 1e3
const uploadPageUrl = 'https://studio.ixigua.com/upload'

/**
 * 上传单个西瓜视频
 * @param video {Object} 视频
 * @param cover {String} 封面
 * @param mainPage {Browser} 无头浏览器页面
 * @param videoInfo {Object} 视频模板信息
 * @param updateProgress {Function} 上传日志回调
 * @param uploadVideoProgress {Function} 上传进度回调
 */
const xigua_upload_single_video = async ({
  video,
  cover,
  mainPage,
  videoInfo,
  updateProgress,
  uploadVideoProgress
}) => {
  await mainPage.goto(uploadPageUrl, { waitUntil: 'load' })
  // 直接找页面的第一个文件上传，比较冒险
  const fileInput = await mainPage.$('input[type=file]')

  if (!fileInput) {
    await mainPage.close()
    return updateProgress(`[${platform}]上传视频${video?.name || ''}失败`, 'error')
  }

  // 将传入的视频上传到input中
  await fileInput.uploadFile(video?.path)

  // 每0.5秒查询一次上传进度
  await (() =>
    new Promise((resolve, reject) => {
      const is_finished_timer = setInterval(async () => {
        const percentNode = await mainPage?.$?.('.video-list-content .percent')
        const statusNode = await mainPage?.$?.('.video-list-content .status')
        const percentTxt = percentNode ? await percentNode.evaluate((el) => el?.innerHTML) : ''
        const statusTxt = statusNode ? await statusNode.evaluate((el) => el?.innerHTML || '') : ''

        if (percentTxt) {
          console.log(`wswTest:视频${video?.name || ''}上传${platform}中:${percentTxt}`)
          updateProgress(`[${platform}]视频${video?.name || ''}上传中:${percentTxt}`)
          uploadVideoProgress(percentTxt?.replace?.('%', ''))
        } else {
          if (!statusTxt) {
            updateProgress(
              `[${platform}]上传视频${video?.name || ''}失败，无法获取视频上传状态`,
              'error'
            )
            reject(false)
          }
          clearInterval(is_finished_timer)
          if (statusTxt.indexOf('上传成功') >= 0) {
            console.info('wswTest: 上传成功')
            uploadVideoProgress(100)
            updateProgress(`[${platform}]上传${video?.name || ''}成功`, 'success')
            resolve(true)
          } else {
            updateProgress(
              `[${platform}]上传视频${video?.name || ''}失败，${statusTxt || ''}`,
              'error'
            )
            reject(false)
          }
        }
      }, queryUploadProcessInterval)
    }))()

  // 输入标题
  if (videoInfo?.title) {
    const titleNode = await mainPage?.$?.('.video-form-item.form-item-title .mentionText')
    if (titleNode) {
      await titleNode.click()
      await mainPage.keyboard.sendCharacter(videoInfo?.title || '')
      console.log(`wswTest: 标题输入完成: ${videoInfo?.title}`)
      updateProgress(`[${platform}]标题输入完成: ${videoInfo?.title}`)
    } else {
      console.log(`wswTest: 标题输入失败: ${videoInfo?.title}`)
      updateProgress(`[${platform}]标题输入失败: ${videoInfo?.title}`, 'error')
    }
  }

  // 输入视频简介
  if (videoInfo?.desc) {
    const descNode = await mainPage?.$?.('.video-form-item.form-item-abstract .mentionText')
    if (descNode) {
      await descNode.click()
      await mainPage.keyboard.sendCharacter(videoInfo?.desc || '')
      console.log(`wswTest: 描述输入完成: ${videoInfo?.desc}`)
      updateProgress(`[${platform}]描述输入完成: ${videoInfo?.desc}`)
    } else {
      console.log(`wswTest: 描述输入失败: ${videoInfo?.desc}`)
      updateProgress(`[${platform}]描述输入失败: ${videoInfo?.desc}`, 'error')
    }
  }

  // 输入话题
  const tags = videoInfo.tags || []
  if (tags?.length) {
    const tagNode = await mainPage?.$?.('.video-form-item.form-item-hash_tag .hash-tag-editor')
    if (tagNode) {
      await tagNode.click()
      for (let tagIdx in tags) {
        await mainPage.keyboard.sendCharacter(`#${tags[tagIdx]}`)
        // 下拉列表出现后，立刻按下enter，再等待500ms
        await mainPage.waitForSelector('.arco-trigger.arco-dropdown')
        await mainPage.keyboard.press('Enter')
        await (() => new Promise((resolve) => setTimeout(() => resolve(), 500)))()
      }
      console.log(`wswTest: 话题标签输入完成: ${tags?.join?.(',')}`)
      updateProgress(`[${platform}]话题标签输入完成: ${tags?.join?.(',')}`)
    } else {
      console.log(`wswTest: 话题标签输入失败: ${tags?.join?.(',')}`)
      updateProgress(`[${platform}]话题标签输入失败: ${tags?.join?.(',')}`, 'error')
    }
  }

  // 选择视频类型: 原创、转载。默认是原创
  await mainPage.waitForSelector('.video-form-item.form-item-origin input[type=radio]')
  const videoSourceNode = await mainPage.$$('.video-form-item.form-item-origin .byte-radio')
  if (videoInfo.isReproduce) {
    await videoSourceNode[1].click()
    // 转载需要标出来源
    const reprintTextNode = await mainPage?.$('.video-form-item.form-item-reprint input[type=text]')
    await reprintTextNode.click()
    await mainPage.keyboard.sendCharacter(videoInfo.reproduceDesc || '')
  } else {
    await videoSourceNode[0].click()
  }
  console.log(`wswTest: 成功选择视频类型: ${videoInfo.isReproduce ? '转载' : '原创'}`)
  updateProgress(`成功选择视频类型: ${videoInfo.isReproduce ? '转载' : '原创'}`)

  // 输入封面
  const posterNode = await mainPage?.$?.('.video-form-item.form-item-poster .m-xigua-upload')
  await posterNode.click()
  await mainPage.waitForSelector('.m-poster-upgrade')
  const lis = await mainPage?.$$('.m-poster-upgrade .header li')
  for (const li of lis) {
    const isLocalUploadLi = await li.evaluate(
      (linode) => linode.textContent.trim()?.indexOf?.('本地上传') >= 0
    )
    if (isLocalUploadLi) {
      await li.click()
    }
  }
  const posterUploadNode = await mainPage?.$('.xigua-upload-poster-trigger input[type=file]')
  posterUploadNode.uploadFile(cover)
  console.log('wswTest: 成功上传封面')
  updateProgress(`成功上传封面`)

  const confirmCoverBtn = await mainPage.waitForSelector('.m-poster-upgrade .btn-sure')
  const confirmCoverBtnDisabled = await mainPage?.$('.m-poster-upgrade .btn-sure.disabled')
  // 如果封面不符合要求
  if (confirmCoverBtnDisabled) {
    const clipCoverBtn = await mainPage.waitForSelector('.m-poster-upgrade .clip-btn-box')
    clipCoverBtn.click()
    // 裁切后，等待0.5s继续
    await (() => new Promise((resolve) => setTimeout(() => resolve(), 500)))()
  }
  await confirmCoverBtn.click()

  console.log(`wswTest:视频上传完毕`)
  updateProgress(`视频上传完毕`)
  const reConfirmModel = await mainPage.waitForSelector('.m-xigua-dialog.title-modal')
  const reConfirmBtn = await reConfirmModel.$('.m-button.red')
  await reConfirmBtn.click()

  // 选择活动前，需要等待视频封面选择弹出框消失
  await mainPage.waitForFunction(
    (selector) => !document.querySelector(selector),
    {},
    '.m-poster-upgrade'
  )

  // 选择活动
  const activity_name = videoInfo.activityName || ''
  if (activity_name) {
    // 获取焦点
    const activityNode = await mainPage?.$?.(
      '.video-form-item.form-item-activity-tags .form-item-activity-tags__empty'
    )
    await activityNode.click()
    await mainPage.waitForSelector(
      '.byte-list-wrapper .upload-activity-card .upload-activity-card__card-title'
    )

    const activity_list = await mainPage.$$(
      '.byte-list-wrapper .upload-activity-card .upload-activity-card__card-title'
    )
    for (const card of activity_list) {
      const activity_title = await card.evaluate((cardNode) => {
        return cardNode.getAttribute('title')
      })
      if (activity_title === activity_name) {
        await card.click()
        const activityModelBtnNode = await mainPage.$(
          '.upload-activity-modal .red.upload-activity-modal__btn:not(.cannot-click)'
        )
        activityModelBtnNode && (await activityModelBtnNode.click())
        break
      }
    }

    // 等待活动选择弹窗关闭
    await mainPage.waitForFunction(
      (selector) => !document.querySelector(selector),
      {},
      '.byte-list-wrapper .upload-activity-card .upload-activity-card__card-title'
    )
    console.log(`wswTest: 成功选择活动: ${activity_name}`)
    updateProgress(`成功选择活动: ${activity_name}`)
  }

  // 发布设置-谁可以看
  const privacyVal = videoInfo.privacyVal || ''
  if (privacyVal) {
    const privacyNodes = await mainPage?.$$('.video-form-item.form-item-privacy .byte-radio')
    for (const privacyInput of privacyNodes) {
      const _privacyVal = await privacyInput.evaluate((node) => {
        return node.querySelector('input[type=radio]')?.getAttribute?.('value')
      })
      // 点选谁可以看项
      privacyInput && (await privacyInput.click())
      // (默认公开)从公开转化私有，无论哪种形式，都会有弹窗阻止提示
      if (Number(_privacyVal) === Number(privacyVal)) {
        if (privacyVal) {
          const confirmBtn = await mainPage.waitForSelector(
            '.m-xigua-dialog.simple-confirm-modal .m-button.red'
          )
          await confirmBtn.click()
        }
        break
      }
    }
    console.log(`wswTest: 成功修改发布设置(谁可以看): ${privacyVal == 1 ? '仅我可见' : '粉丝可见'}`)
    updateProgress(`成功修改发布设置(谁可以看): ${privacyVal == 1 ? '仅我可见' : '粉丝可见'}}`)
  }

  const dtime = videoInfo.dtime
  // 发布设置-定时发布
  if (dtime) {
    const dtimeObj = new Date(dtime)
    const nowObj = new Date()
    const timeRemain = dtimeObj - nowObj
    // 预定发布时间在2小时后，7天内
    if (timeRemain >= 2 * hourMilSec && timeRemain <= 24 * 7 * hourMilSec) {
      const dDate = dtimeObj.getDate()
      const dHours = dtimeObj.getHours()
      const dMinutes = dtimeObj.getMinutes()
      const dtimeNodes = await mainPage?.$$('.video-form-item.form-item-timer .byte-radio')
      // 如果传入了定时的时间，那么是定时发布
      if (dtime) {
        // 第一个选项是立即发布，第二个是定时发布
        await dtimeNodes[1].click()
        // 点击定时发布后，等待时间输入框出现
        await mainPage.waitForSelector(
          '.video-form-item.form-item-timer .byte-datepicker-input .byte-input'
        )
        const timeBtns = await mainPage.$$(
          '.video-form-item.form-item-timer .byte-datepicker-input .byte-input'
        )
        const [startBtn, endBtn] = timeBtns || []
        // 设置日期
        startBtn && (await startBtn.click())
        const availableDates = await mainPage?.$$(
          '.byte-datepicker td.byte-calendar-cell:not(.byte-calendar-cell-disabled) .byte-calendar-date-value'
        )
        let is_date_set = false
        console.log('wswTest: 目前可以点击的日期', availableDates)
        for (let availableDate of availableDates) {
          // 对每个元素执行页面函数，检查它是否包含特定文本
          const text = await mainPage.evaluate((el) => el.textContent, availableDate)
          if (text?.trim?.() === String(dDate)) {
            console.log('wswTest:找了了日期', dDate)
            is_date_set = true
            await availableDate.click()
          }
        }
        // TODO:(wsw) 这段逻辑没有经过测试
        // 如果在本月没有找到可点击的日期，点击前往下一个月，然后寻找点击
        if (!is_date_set) {
          const nextMonthBtn = await mainPage.$('.byte-datepicker .byte-picker-next-month-btn')
          await nextMonthBtn.click()
          // 等待500ms防止渲染没有完成
          await (() => new Promise((resolve) => setTimeout(() => resolve(), 500)))()
          // 在下个月的日期列表中找到可点击的日期
          const nextMonthAvailableDates = await mainPage?.$$(
            '.byte-datepicker td.byte-calendar-cell:not(.byte-calendar-cell-disabled) .byte-calendar-date-value'
          )
          for (let availableDate of nextMonthAvailableDates) {
            // 对每个元素执行页面函数，检查它是否包含特定文本
            const text = await mainPage.evaluate((el) => el.textContent, availableDate)
            if (text?.trim?.() === String(dDate)) {
              is_date_set = true
              await availableDate.click()
            }
          }
        }

        // 设置时间
        endBtn && (await endBtn.click())
        const [hoursNode, minutesNode] =
          (await mainPage?.$$('.byte-timepicker .byte-timepicker-list')) || []
        if (hoursNode) {
          const hoursList = (await hoursNode?.$$('.byte-timepicker-cell')) || []
          for (const hour of hoursList) {
            const text = await mainPage.evaluate((el) => el.textContent, hour)
            if (text?.trim?.() === String(dHours)) {
              await hour.click()
            }
          }
        }
        if (minutesNode) {
          const minutesList = (await minutesNode?.$$('.byte-timepicker-cell')) || []
          for (const minute of minutesList) {
            const text = await mainPage.evaluate((el) => el.textContent, minute)
            if (text?.trim?.() === String(dMinutes)) {
              await minute.click()
            }
          }
        }
        console.log(`wswTest: 成功修改发布设置(定时发布): ${videoInfo.dtime}`)
        updateProgress(`成功修改发布设置(定时发布): ${videoInfo.dtime}`)
      }
    }
  }

  // 发布设置-下载权限(默认允许下载)
  const allowDownload = videoInfo.allowDownload || false
  const allowDownloadNode = await mainPage?.$('.video-form-item.form-item-download .byte-checkbox')
  if (!allowDownload) {
    await allowDownloadNode.click()
    console.log(`wswTest: 成功修改发布设置(下载权限): 允许他人下载`)
    updateProgress(`成功修改发布设置(下载权限): 允许他人下载`)
  }

  // TODO:(wsw) 临时注释
  // const submitBtn = await mainPage?.$('.video-batch-footer .submit.red')
  // if (submitBtn) {
  //   await submitBtn.click()
  //   console.info(`wswTest: 视频${video?.name || ''}发布成功`)
  //   updateProgress(`视频${video?.name || ''}发布成功`, 'success')
  // }

  // 发送完毕后，等待2秒，重刷新页面
  await (() => new Promise((resolve) => setTimeout(() => resolve(), 2000)))()
  await mainPage.reload()
  return
}

/**
 * 批量上传西瓜视频
 * @param videoInfo {Object} 视频模板信息
 * @param videoList {Array<Object>} 视频列表
 * @param coverList {Array<String>} 封面列表
 * @param updateProgress {Function} 上传日志回调
 * @param uploadVideoProgress {Function} 上传进度回调
 */
const xigua_upload_video = async ({
  videoInfo = {},
  videoList = [],
  coverList = [],
  updateProgress,
  uploadVideoProgress
}) => {
  // TODO:(wsw) 临时为false
  const headless = true
  const uploadBrowser = await puppeteer_manage.launch(headless)
  const mainPage = await uploadBrowser.newPage()
  const screenWidth = await mainPage.evaluate(() => window.screen.width)
  const screenHeight = await mainPage.evaluate(() => window.screen.height)
  await mainPage.setViewport({ width: screenWidth, height: screenHeight })

  // 西瓜依次上传
  for (let index in videoList) {
    const video = videoList[index]
    const cover = coverList[index]
    const videoInfoData = {
      title: `${videoInfo?.title_prefix || ''}${video.name?.split?.('.')?.[0] || ''}`,
      desc: videoInfo?.desc || '',
      tags: videoInfo?.tag?.split?.(',') || [],
      isReproduce: videoInfo?.xigua_isReproduce || false,
      reproduceDesc: videoInfo?.xigua_reproduceDesc || '',
      activityName: videoInfo?.xigua_activityName || '',
      privacyVal: videoInfo?.xigua_privacyVal || '', // 谁可以看，不设置就是都可以看，1: 粉丝可见 2: 仅我可见
      dtime: videoInfo?.xigua_dtime || '', // 假值: 立刻发送 2024-04-24 14:12: 定时发送的时间
      allowDownload: videoInfo?.xigua_allowDownload || false // 是否允许下载
    }
    await xigua_upload_single_video({
      video,
      cover,
      mainPage,
      videoInfo: videoInfoData,
      updateProgress,
      uploadVideoProgress
    })
  }
}

export default xigua_upload_video
