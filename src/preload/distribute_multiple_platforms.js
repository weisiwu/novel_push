import { contextBridge, ipcRenderer, shell, dialog } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const mainWindowChannels = [
  'open-new-window',
  'open-dialog',
  'select-folder',
  'fetch-config',
  'read-config',
  'save-config',
  'platform-login', // 授权登录平台
  'platform-send-video', // 开始分发投稿视频
  'distribute-update-process', // 更新分发进程日志
  'distribute-read-tpl-model', // 主进程读取本地视频模板
  'distribute-read-tpl-model-result', // 读取本地视频模板结果
  'distribute-save-tpl-model', // 保存视频模板
  'distribute-remove-finished-videos' // 删除分发进程中已经投稿完成的视频
]

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('dialog', dialog)
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('openPath', shell.openPath)
    contextBridge.exposeInMainWorld('openExternal', shell.openExternal)

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
            func(...args)
          })
        }
      }
    })
  } catch (error) {
    console.error(error)
  }
} else {
  window.dialog = dialog
  window.electron = electronAPI
  window.openPath = shell.openPath
  window.openExternal = shell.openExternal
}
