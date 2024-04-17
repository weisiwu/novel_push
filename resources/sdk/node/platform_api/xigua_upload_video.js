import { basename } from 'path'
import puppeteer_manage from './puppeteer_manage.js'
import { CMDS } from '../../../../src/renderer/src/constants.js'

const maxRetryTime = 3
const queryUploadProcessInterval = 500
const uploadPageUrl = 'https://studio.ixigua.com/upload'
const videoUploadInput = 'videoUploadInput'
const videoUploadInputSelector = `#${videoUploadInput}`

const get_cover_from_video = () => {}

const xigua_upload_single_video = async ({
  videoInfo,
  video,
  mainPage,
  fileInput,
  updateProgress,
  removeSuccessVideos,
  uploadVideoProgress
}) => {
  console.log('wswTest: 要上传的视频信息', videoInfo)
  // TODO:(wsw) 临时写死
  await fileInput.uploadFile(video?.path)

  //   $('.video-list-content').querySelector('.status').innerHTML.indexOf('上传成功')

  // $('.video-list-content').querySelector('.percent').innerHTML

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
          if (statusTxt.indexOf('上传成功') >= 0) {
            console.log('wswTest: 上传成功')
            clearInterval(is_finished_timer)
            resolve(true)
          } else {
            reject(false)
          }
        }
      }, queryUploadProcessInterval)
    }))()

  console.log('wswTest: 正式流程圣克鲁斯')
}

const xigua_upload_video = async ({
  videoInfo = {},
  videoList = [],
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
    fileInput: upload_video_input,
    updateProgress,
    removeSuccessVideos,
    uploadVideoProgress
  })
}

export default xigua_upload_video
