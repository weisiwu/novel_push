import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {}
const mainWindowChannels = [
  'open-new-window',
  'check-account-password-valid',
  'check-account-password-result',
  'register-account',
  'register-account-result'
]

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('electron', electronAPI)
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
          ipcRenderer.on(channel, (event, ...args) => func(...args))
        }
      }
    })
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
