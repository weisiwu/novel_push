import { contextBridge, ipcRenderer, shell, dialog } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const mainWindowChannels = [
  'open-new-window',
  'open-dialog',
  'select-folder',
  'fetch-config',
  'read-config',
  'save-config',
  'platform-login',
  'platform-send-video',
  'distribute-update-process',
  'distribute-read-tpl-model',
  'distribute-read-tpl-model-result',
  'distribute-save-tpl-model'
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
