import { contextBridge, ipcRenderer, shell } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const mainWindowChannels = [
  'open-new-window', // 打开新窗口
  'get-frame-time', // 视频帧全部抽取成功后，获取每帧持续时间
  'get-frame-size', // 视频获取第一帧后，获取画面尺寸
  'cut-video', // 剪切视频为片段
  'cut-video-complete', // 剪切视频完成
  'image-to-image', // 图生图开始
  'image-to-image-complete', // 图生图结束
  'amplify-image', // 高清重绘开始
  'amplify-image-complete', // 高清重绘结束
  'amplify-batch-image', // 高清重绘批量
  'amplify-batch-image-complete', //高清重绘批量结束
  'concat-video', // 将重新优化生成的关键帧，组合成视频开始
  'concat-video-complete', //将重新优化生成的关键帧，组合视频完成
  'update-video-frame' // 将更新找到视频关键帧，发送到渲染进程，展示出来
]

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('openExternal', shell.openExternal)
    contextBridge.exposeInMainWorld('openPath', shell.openPath)

    // 将ipcRenderer暴露出去
    // https://stackoverflow.com/questions/63615355/how-to-import-ipcrenderer-in-vue-js-dirname-is-not-defined
    contextBridge.exposeInMainWorld('ipcRenderer', {
      send: (channel, data) => {
        if (mainWindowChannels.includes(channel)) {
          ipcRenderer.send(channel, data)
        }
      },
      receive: (channel, func) => {
        if (mainWindowChannels.includes(channel)) {
          ipcRenderer.on(channel, (event, ...args) => {
            console.log('wswTest: channel', channel, args)
            func(...args)
          })
        }
      }
    })
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.openExternal = shell.openExternal
  window.openPath = shell.openPath
}
