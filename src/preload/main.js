import { app, contextBridge, ipcRenderer, shell } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('openExternal', shell.openExternal)
    contextBridge.exposeInMainWorld('openPath', shell.openPath)
    contextBridge.exposeInMainWorld('api', api)

    // 将ipcRenderer暴露出去
    // https://stackoverflow.com/questions/63615355/how-to-import-ipcrenderer-in-vue-js-dirname-is-not-defined
    contextBridge.exposeInMainWorld('ipcRenderer', {
      send: (channel, data) => {
        let validChannels = [
          'open-new-window',
          'get-frame-time',
          'get-frame-size',
          'cut-video',
          'cut-video-complete',
          'image-to-image',
          'image-to-image-complete',
          'amplify-image',
          'amplify-image-complete',
          'amplify-batch-image',
          'amplify-batch-image-complete',
          'concat-video',
          'concat-video-complete',
          'update-video-frame'
        ]
        if (validChannels.includes(channel)) {
          ipcRenderer.send(channel, data)
        }
      },
      receive: (channel, func) => {
        let validChannels = [
          'open-new-window',
          'get-frame-time',
          'get-frame-size',
          'cut-video',
          'cut-video-complete',
          'image-to-image',
          'image-to-image-complete',
          'amplify-image',
          'amplify-image-complete',
          'amplify-batch-image',
          'amplify-batch-image-complete',
          'concat-video',
          'concat-video-complete',
          'update-video-frame'
        ]
        if (validChannels.includes(channel)) {
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
  window.api = api
  window.openExternal = shell.openExternal
}
