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
  await (() =>
    new Promise((resolve, reject) => {
      const is_finished_timer = setInterval(async () => {
        const percentNode = await mainPage.$('.video-list-content .percent')
        const statusNode = await mainPage.$('.video-list-content .status')
        const percentTxt = percentNode ? await percentNode.evaluate((el) => el?.innerHTML) : ''
        const statusTxt = statusNode ? await statusNode.evaluate((el) => el?.innerHTML || '') : ''

        // 如果状态文本和进度文本都为空，则继续等待下一次轮询结果
        if (!statusTxt && !percentTxt) return

        if (percentTxt) {
          console.log(`wswTest:视频${video?.name || ''}上传${platform}中:${percentTxt}`)
          uploadVideoProgress(percentTxt?.replace?.('%', ''))
        } else {
          if (statusTxt && statusTxt?.indexOf?.('上传成功') < 0) {
            return reject(statusTxt)
          }
          clearInterval(is_finished_timer)
          uploadVideoProgress(100)
          updateProgress(`[${platform}]上传${video?.name || ''}成功`)
          resolve(true)
        }
      }, queryUploadProcessInterval)
    }).catch((e) => {
      updateProgress(`[${platform}]上传视频${video?.path || ''}失败。${e || ''}`, 'error')
      return false
    }))()

  // 输入标题
  if (videoInfo?.title) {
    try {
      const titleNode = await mainPage.$('.video-form-item.form-item-title .mentionText')
      if (titleNode) {
        await titleNode.click()
        await mainPage.keyboard.sendCharacter(videoInfo?.title || '')
        console.log(`wswTest: 标题输入完成: ${videoInfo?.title}`)
        updateProgress(`[${platform}]标题输入完成: ${videoInfo?.title}`)
      } else {
        console.log(`wswTest: 标题输入失败: ${videoInfo?.title}`)
        updateProgress(`[${platform}]标题输入失败: ${videoInfo?.title}`, 'error')
        return false
      }
    } catch (e) {
      updateProgress(`[${platform}]标题输入失败: ${e?.message || ''}`, 'error')
      return false
    }
  }

  // 输入视频简介
  if (videoInfo?.desc) {
    try {
      const descNode = await mainPage.$('.video-form-item.form-item-abstract .mentionText')
      if (descNode) {
        await descNode.click()
        await mainPage.keyboard.sendCharacter(videoInfo?.desc || '')
        console.log(`wswTest: 描述输入完成: ${videoInfo?.desc}`)
        updateProgress(`[${platform}]描述输入完成: ${videoInfo?.desc}`)
      } else {
        console.log(`wswTest: 描述输入失败: ${videoInfo?.desc}`)
        updateProgress(`[${platform}]描述输入失败: ${videoInfo?.desc}`, 'error')
      }
    } catch (e) {
      // 描述填写失败，不阻止最终发布
      updateProgress(`[${platform}]描述输入失败: ${e?.message || ''}`, 'error')
    }
  }

  // 输入话题
  const tags = videoInfo.tags || []
  if (tags?.length) {
    try {
      const tagNode = await mainPage.$('.video-form-item.form-item-hash_tag .hash-tag-editor')
      if (tagNode) {
        await tagNode.click()
        for (let tagIdx in tags) {
          await mainPage.keyboard.sendCharacter(`#${tags[tagIdx]}`)
          // 下拉列表出现后，立刻按下enter，再等待500ms
          await mainPage.waitForSelector('.arco-trigger.arco-dropdown')
          await mainPage.keyboard.press('Enter')
          await (() =>
            new Promise((resolve) => setTimeout(() => resolve(), 500)).catch((e) => {
              updateProgress(
                `[${platform}]输入#${tags[tagIdx] || ''}话题失败: ${e?.message || ''}`,
                'error'
              )
            }))()
        }
        console.log(`wswTest: 话题标签输入完成: ${tags?.join?.(',')}`)
        updateProgress(`[${platform}]话题标签输入完成: ${tags?.join?.(',')}`)
      } else {
        console.log(`wswTest: 话题标签输入失败: ${tags?.join?.(',')}`)
        updateProgress(`[${platform}]话题标签输入失败: ${tags?.join?.(',')}`, 'error')
      }
    } catch (e) {
      // 话题输入失败，不会阻止视频的最终发布
      updateProgress(`[${platform}]话题标签输入失败: ${e?.message || ''}`, 'error')
    }
  }

  // 选择视频类型: 原创、转载。默认是原创
  try {
    await mainPage.waitForSelector('.video-form-item.form-item-origin input[type=radio]')
    const videoSourceNode = await mainPage.$$('.video-form-item.form-item-origin .byte-radio')
    if (videoSourceNode) {
      if (videoInfo.isReproduce) {
        await videoSourceNode?.[1]?.click?.()
        // 转载需要标出来源
        const reprintTextNode = await mainPage.$(
          '.video-form-item.form-item-reprint input[type=text]'
        )
        await reprintTextNode?.click?.()
        await mainPage.keyboard.sendCharacter(videoInfo.reproduceDesc || '')
      } else {
        await videoSourceNode?.[0]?.click?.()
      }
      const _text = videoInfo.isReproduce ? '转载' : '原创'
      console.log(`wswTest: [${platform}]选择视频类型完成: ${_text}`)
      updateProgress(`[${platform}]选择视频类型完成: ${_text}`)
    } else {
      console.log(`wswTest: [${platform}]选择视频类型失败: 没有找到对应节点}`)
      updateProgress(`[${platform}]选择视频类型失败: 没有找到对应节点'}`)
      return false
    }
  } catch (e) {
    console.log(`wswTest: [${platform}]选择视频类型失败: ${e?.message || ''}`)
    // 视频类型选择错误，不影响最终发布（有默认值）。
    updateProgress(`[${platform}]选择视频类型失败: ${e?.message || ''}`)
    return false
  }

  // 输入封面
  try {
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
  } catch (e) {
    updateProgress(`[${platform}]:上传封面异常: ${e?.message || ''}`, 'error')
    return false
  }

  // 选择完毕封面后，西瓜会要求进行裁切。默认直接裁切
  try {
    const confirmCoverBtn = await mainPage.waitForSelector('.m-poster-upgrade .btn-sure')
    if (confirmCoverBtn) {
      const confirmCoverBtnDisabled = await mainPage?.$('.m-poster-upgrade .btn-sure.disabled')
      // 如果封面不符合要求
      if (confirmCoverBtnDisabled) {
        const clipCoverBtn = await mainPage.waitForSelector('.m-poster-upgrade .clip-btn-box')
        clipCoverBtn.click()
        // 裁切后，等待0.5s继续
        await (() => new Promise((resolve) => setTimeout(() => resolve(), 500)))()
      }
      await confirmCoverBtn.click()
    }
  } catch (e) {
    // 裁切错误，不影响最终视频发布
    updateProgress(`[${platform}]:视频封面裁切发生异常: ${e?.message || ''}`, 'error')
  }

  console.log(`wswTest: 视频上传完毕`)
  updateProgress(`视频上传完毕`)

  // 发布视频前最终确认点击步骤
  try {
    const reConfirmModel = await mainPage.waitForSelector('.m-xigua-dialog.title-modal')
    const reConfirmBtn = await reConfirmModel.$('.m-button.red')
    await reConfirmBtn.click()
    // 选择活动前，需要等待视频封面选择弹出框消失
    await mainPage.waitForFunction(
      (selector) => !document.querySelector(selector),
      {},
      '.m-poster-upgrade'
    )
  } catch (e) {
    updateProgress(`[${platform}]:发布视频前就绪点击异常: ${e?.message || ''}`, 'error')
  }

  const activity_name = videoInfo.activityName || ''
  // 选择活动
  if (activity_name) {
    try {
      // 获取焦点
      const activityNode = await mainPage.$(
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
    } catch (e) {
      updateProgress(`[${platform}]:选择活动异常: ${e?.message || ''}`, 'error')
    }
  }

  const privacyVal = videoInfo.privacyVal || ''
  // 发布设置-谁可以看
  if (privacyVal) {
    try {
      const privacyNodes = await mainPage?.$$('.video-form-item.form-item-privacy .byte-radio')
      for (const privacyInput of privacyNodes) {
        const _privacyVal = await privacyInput.evaluate((node) =>
          node.querySelector('input[type=radio]')?.getAttribute?.('value')
        )
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
      console.log(
        `wswTest: 成功修改发布设置(谁可以看): ${privacyVal == 1 ? '仅我可见' : '粉丝可见'}`
      )
      updateProgress(`成功修改发布设置(谁可以看): ${privacyVal == 1 ? '仅我可见' : '粉丝可见'}`)
    } catch (e) {
      // 有默认值，选择失败也可以发布
      updateProgress(`[${platform}]:修改发布设置(谁可以看)失败 ${e?.message || ''}`, 'error')
    }
  }

  const dtime = videoInfo.dtime
  // 发布设置-定时发布
  if (dtime) {
    try {
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
          for (let availableDate of availableDates) {
            // 对每个元素执行页面函数，检查它是否包含特定文本
            const text = await mainPage.evaluate((el) => el.textContent, availableDate)
            if (text?.trim?.() === String(dDate)) {
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
              if (text?.trim?.() === String(dHours).padStart(2, 0)) {
                await hour.click()
              }
            }
          }
          if (minutesNode) {
            const minutesList = (await minutesNode?.$$('.byte-timepicker-cell')) || []
            for (const minute of minutesList) {
              const text = await mainPage.evaluate((el) => el.textContent, minute)
              if (text?.trim?.() === String(dMinutes).padStart(2, 0)) {
                await minute.click()
              }
            }
          }
          console.log(`wswTest: 成功修改发布设置(定时发布): ${videoInfo.dtime}`)
          updateProgress(`成功修改发布设置(定时发布): ${videoInfo.dtime}`)
        }
      }
    } catch (e) {
      // 发布时间不阻止
      updateProgress(`[${platform}]:修改发布设置(定时发布)失败: ${e?.message || ''}`, 'error')
    }
  }

  const allowDownload = videoInfo.allowDownload || false
  // 发布设置-下载权限(默认允许下载)
  if (!allowDownload) {
    try {
      const allowDownloadNode = await mainPage?.$(
        '.video-form-item.form-item-download .byte-checkbox'
      )
      await allowDownloadNode.click()
      console.log(`wswTest: 成功修改发布设置(下载权限): 允许他人下载`)
      updateProgress(`成功修改发布设置(下载权限): 允许他人下载`)
    } catch (e) {
      updateProgress(`[${platform}]:修改发布设置(下载权限)失败: ${e?.message || ''}`, 'error')
    }
  }

  try {
    const submitBtn = await mainPage?.$('.video-batch-footer .submit.red')
    if (submitBtn) {
      await submitBtn.click()
      console.info(`wswTest: 视频${video?.name || ''}发布成功`)
      updateProgress(`视频${video?.name || ''}发布成功`, 'success')
    }
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
  updateProgress = () => {},
  uploadVideoProgress = () => {},
  uploadVideoStepProgress = () => {}
}) => {
  const headless = true
  const uploadBrowser = await puppeteer_manage.launch(headless)
  const mainPage = await uploadBrowser.newPage()
  const screenWidth = await mainPage.evaluate(() => window.screen.width)
  const screenHeight = await mainPage.evaluate(() => window.screen.height)
  await mainPage.setViewport({ width: screenWidth, height: screenHeight })

  let distribute_times = 0
  let distribute_success = 0
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
    const upload_resut = await xigua_upload_single_video({
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

export default xigua_upload_video
