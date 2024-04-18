import { basename, resolve } from 'path'
import puppeteer_manage from './puppeteer_manage.js'
import { CMDS, platformNames } from '../../../../src/renderer/src/constants.js'

const maxRetryTime = 3
const platform = platformNames.XIGUA
const queryUploadProcessInterval = 500
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
  reConfirmBtn.click()

  // TODO:(wsw) 选择活动

  // TODO:(wsw) 发布设置-谁可以看

  // TODO:(wsw) 发布设置-定时发布

  // TODO:(wsw) 发布设置-下载权限
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
  // TODO:(wsw) 测试使用，
  await mainPage.setViewport({ width: 1080, height: 1080 })

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
