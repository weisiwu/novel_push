import { contextBridge, ipcRenderer, shell, dialog } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

/**
 * 新版流程
 * 主线程和渲染进程的交互只有三个事件
 * start-process: 启动处理进程，渲染告诉主进程，本地视频位置，主进程处理
 * update-process: 返回处理进度（每个关键帧都是新进度），主进程的每个处理子任务完成，都会通知渲染进程更新页面
 * finish-process: 结束处理进程，主进程任务完全结束，通知渲染进程
 *
 */
const mainWindowChannels = [
  'open-new-window',
  'open-dialog',
  'select-folder',
  'start-process',
  'update-process',
  'finish-process',
  'fetch-config',
  'read-config',
  'save-config'
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
  window.dialog = dialog
  window.electron = electronAPI
  window.openPath = shell.openPath
  window.openExternal = shell.openExternal
}
