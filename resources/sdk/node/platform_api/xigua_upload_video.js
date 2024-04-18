import { basename, resolve } from 'path'
import puppeteer_manage from './puppeteer_manage.js'
import { CMDS, platformNames } from '../../../../src/renderer/src/constants.js'

const maxRetryTime = 3
const platform = platformNames.XIGUA
const queryUploadProcessInterval = 500
const hourMilSec = 60 * 60 * 1e3
const uploadPageUrl = 'https://studio.ixigua.com/upload'
const videoUploadInput = 'videoUploadInput'
const videoUploadInputSelector = `#${videoUploadInput}`

const xigua_upload_single_video = async ({
  videoInfo,
  video,
  cover,
  mainPage,
  fileInput,
  updateProgress,
  removeSuccessVideos,
  uploadVideoProgress
}) => {
  // console.log('wswTest: 要上传的视频信息', videoInfo)
  // TODO:(wsw) 临时写死
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
          console.log(`wswTest: 上传中: ${percentTxt}`)
        } else {
          if (!statusTxt) {
            return
          }
          clearInterval(is_finished_timer)
          if (statusTxt.indexOf('上传成功') >= 0) {
            console.log('wswTest: 上传成功')
            resolve(true)
          } else {
            reject(false)
          }
        }
      }, queryUploadProcessInterval)
    }))()

  // 输入标题
  const titleNode = await mainPage?.$?.('.video-form-item.form-item-title .mentionText')
  await titleNode.click()
  await mainPage.keyboard.sendCharacter('测试标题想写下')

  // 输入话题
  const testTags = ['测试tag1', '测试tag2', '测试tag3', '测试tag4', '测试tag5']
  const tagNode = await mainPage?.$?.('.video-form-item.form-item-hash_tag .hash-tag-editor')
  await tagNode.click()
  for (let tagIdx in testTags) {
    await mainPage.keyboard.sendCharacter(`#${testTags[tagIdx]}`)
    // 下拉列表出现后，立刻按下enter，再等待500ms
    await mainPage.waitForSelector('.arco-trigger.arco-dropdown')
    await mainPage.keyboard.press('Enter')
    await (() => new Promise((resolve) => setTimeout(() => resolve(), 500)))()
  }

  // 选择视频类型: 原创、转载
  await mainPage.waitForSelector('.video-form-item.form-item-origin input[type=radio]')
  const videoSourceNode = await mainPage.$$('.video-form-item.form-item-origin .byte-radio')
  // TODO:(wsw) 是转载
  if (false) {
    await videoSourceNode[0].click()
  } else {
    await videoSourceNode[1].click()
    // 转载需要标出来源
    const reprintTextNode = await mainPage?.$('.video-form-item.form-item-reprint input[type=text]')
    await reprintTextNode.click()
    await mainPage.keyboard.sendCharacter(`转载来源: https://www.zhihu.com/question/595744321`)
  }

  // 输入封面
  const posterNode = await mainPage?.$?.('.video-form-item.form-item-poster .m-xigua-upload')
  await posterNode.click()
  await mainPage.waitForSelector('.m-poster-upgrade')
  const lis = await mainPage?.$$('.m-poster-upgrade .header li')
  for (const li of lis) {
    const isLocalUploadLi = await li.evaluate(
      (linode) => linode.textContent.trim()?.indexOf?.('本地上传') >= 0
    )
    console.log('wswTest: isLocalUploadLi', isLocalUploadLi)
    if (isLocalUploadLi) {
      await li.click()
    }
  }
  const posterUploadNode = await mainPage?.$('.xigua-upload-poster-trigger input[type=file]')
  posterUploadNode.uploadFile(cover)
  console.log('wswTest: covercover', cover)

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

  console.log(`wswTest: ${platform}-视频上传完毕`)
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
  const activity_name = '聚光创作大赛'
  // 输入话题
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

  // 发布设置-谁可以看
  // TODO:(wsw) 临时假值
  const privacyVal = 1
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

  // TODO:(wsw) 发布设置-定时发布
  // TODO:(wsw) 临时假值
  const dtime = '2024-04-24 14:12'
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
        // console.log('wswTest: hoursList', hoursList)
        for (const hour of hoursList) {
          const text = await mainPage.evaluate((el) => el.textContent, hour)
          if (text?.trim?.() === String(dHours)) {
            await hour.click()
          }
        }
      }
      if (minutesNode) {
        const minutesList = (await minutesNode?.$$('.byte-timepicker-cell')) || []
        // console.log('wswTest:minutesList ', minutesList)
        for (const minute of minutesList) {
          const text = await mainPage.evaluate((el) => el.textContent, minute)
          if (text?.trim?.() === String(dMinutes)) {
            await minute.click()
          }
        }
      }
    }
  }

  // TODO:(wsw) 临时测试
  // 发布设置-下载权限
  const allowDownload = false
  const allowDownloadNode = await mainPage?.$('.video-form-item.form-item-download .byte-checkbox')
  if (!allowDownload) {
    await allowDownloadNode.click()
  }
}

const xigua_upload_video = async ({
  videoInfo = {},
  videoList = [],
  coverList = [],
  updateProgress,
  removeSuccessVideos,
  uploadVideoProgress
}) => {
  // TODO:(wsw) 临时为false
  const headless = false
  const uploadBrowser = await puppeteer_manage.launch(headless)
  const mainPage = await uploadBrowser.newPage()
  const screenWidth = await mainPage.evaluate(() => window.screen.width)
  const screenHeight = await mainPage.evaluate(() => window.screen.height)
  await mainPage.setViewport({ width: screenWidth, height: screenHeight })

  mainPage.on('console', async (msg) => {
    const m_type = msg.type()
    const m_text = msg.text()
    if (m_text?.indexOf('wswTest:') < 0) {
      return
    }
    console.log(`BROWSER LOG: ${m_text}`)
    // 处理指令
    if (m_text?.indexOf?.(CMDS.RM_SUCCESS_VIDEOS) >= 0) {
      const msg_text = m_text?.replace?.(CMDS.RM_SUCCESS_VIDEOS, '')?.trim()
      return removeSuccessVideos?.(msg_text)
    }
    if (m_text?.indexOf?.(CMDS.UPLOAD_PROGRESS) >= 0) {
      const msg_text = m_text?.replace?.(CMDS.UPLOAD_PROGRESS, '')?.trim()
      return uploadVideoProgress?.(msg_text)
    }
    if (m_text?.indexOf?.(CMDS.CLOSE_BROWSER) >= 0) {
      return uploadBrowser?.close()
    }

    const msg_text = m_text?.replace?.('wswTest:', '')?.trim()
    if (m_type === 'log') {
      updateProgress(msg_text)
    } else if (m_type === 'info') {
      updateProgress(msg_text, 'success')
    } else if (m_type === 'error') {
      updateProgress(msg_text, 'error')
    }
  })

  await mainPage.goto(uploadPageUrl, { waitUntil: 'load' })
  const upload_video_input = await mainPage.$('input[type=file]')

  // TODO:(wsw) 如果没有找到上传的input 如何处理？
  if (!upload_video_input) {
    return
  }

  // 西瓜依次上传
  // TODO:(wsw) 多个列表处理
  await xigua_upload_single_video({
    mainPage,
    videoInfo,
    video: videoList[0],
    cover: coverList[0],
    fileInput: upload_video_input,
    updateProgress,
    removeSuccessVideos,
    uploadVideoProgress
  })
}

export default xigua_upload_video
