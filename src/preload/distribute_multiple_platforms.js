import { contextBridge, ipcRenderer, shell, dialog } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const mainWindowChannels = [
  'open-new-window',
  'open-dialog',
  'select-folder',
  'fetch-config',
  'read-config',
  'save-config',
  'fetch-distribute-config',
  'fetch-distribute-config-result',
  // 平台信息初始化，主进程读取本地视频模板
  // 获取tid相关的话题和任务id
  'platform-init',
  'platform-init-result', // 读取本地视频模板结果
  'platform-login', // 授权登录平台
  'platform-send-video', // 开始分发投稿视频
  'distribute-update-process', // 更新分发进程日志
  'distribute-save-tpl-model', // 保存视频模板
  'upload-video-progress', // 上传视频百分比进度
  'upload-video-step-progress', // 更新上传步骤级别进度结果
  'create-new-environment', // 新建环境
  'create-new-environment-result', // 新建环境结果
  'bilibili-refresh-tid', // b站刷新tid相关字段
  'xigua-fetch-activity-list', // 请求西瓜活动列表
  'xigua-fetch-activity-list-result' // 获取西瓜活动列表返回值
  // 'kuaishou-fetch-typelist' // 获取快手视频类型列表
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
      },
      remove: (channel, func) => {
        if (mainWindowChannels.includes(channel)) {
          ipcRenderer.removeAllListeners(channel)
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
