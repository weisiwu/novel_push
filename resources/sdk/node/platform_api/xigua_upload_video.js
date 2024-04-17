import { basename } from 'path'
import puppeteer_manage from './puppeteer_manage.js'
import { CMDS } from '../../../../src/renderer/src/constants.js'

const maxRetryTime = 3
const uploadPageUrl = 'https://studio.ixigua.com/upload'
const videoUploadInput = 'videoUploadInput'
const videoUploadInputSelector = `#${videoUploadInput}`

const get_cover_from_video = () => {}

const xigua_upload_video = async ({
  videoInfo = {},
  videoList = [],
  updateProgress,
  removeSuccessVideos,
  uploadVideoProgress,
  uploadVideoStepProgress
}) => {
  const headless = true
  const uploadBrowser = await puppeteer_manage.launch(headless)
  const mainPage = await uploadBrowser.newPage()

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
    if (m_text?.indexOf?.(CMDS.HANDLE_VIDEO_STEP_PROGRESS) >= 0) {
      const msg_text = m_text?.replace?.(CMDS.HANDLE_VIDEO_STEP_PROGRESS, '')?.trim()
      return uploadVideoStepProgress?.(msg_text)
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
  // 向页面添加input，并传入视频
  await mainPage.evaluate(
    (params) => {
      const newInput = document.createElement('input')
      newInput.setAttribute('type', 'file')
      newInput.setAttribute('multiple', 'true')
      newInput.setAttribute('id', params?.videoUploadInput)
      document.body.appendChild(newInput)
    },
    { videoUploadInput }
  )
  // 等待input元素加载到页面
  await mainPage.waitForSelector(videoUploadInputSelector)

  // 触发文件上传，开始投稿流程
  const elementHandle = await mainPage.$(videoUploadInputSelector)
  const drafts_list = []
  // TODO:(wsw) 暂时不用
  // 获取封面图片，保存并上传
  // for (let vid = 0; vid < videoList.length; vid++) {
  //   const videoObj = videoList[vid]
  //   // 无值下一个
  //   if (!videoObj) continue
  //   const cover_path = await get_cover_from_video(videoObj?.path)
  //   console.log('wswTest: cover_path', cover_path)
  //   console.log('wswTest: videoObj', videoObj)
  //   drafts_list.push(cover_path)
  //   drafts_list.push(videoObj?.path)
  // }
  // await elementHandle.uploadFile(...drafts_list)
}

export default xigua_upload_video
