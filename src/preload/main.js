import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    // 将ipcRenderer暴露出去
    // https://stackoverflow.com/questions/63615355/how-to-import-ipcrenderer-in-vue-js-dirname-is-not-defined
    contextBridge.exposeInMainWorld('ipcRenderer', {
      send: (channel, data) => {
        let validChannels = [
          'open-new-window',
          'cut-video',
          'cut-video-complete',
          'image-tagger',
          'image-tagger-complete'
        ]
        if (validChannels.includes(channel)) {
          ipcRenderer.send(channel, data)
        }
      },
      receive: (channel, func) => {
        let validChannels = [
          'open-new-window',
          'cut-video',
          'cut-video-complete',
          'image-tagger',
          'image-tagger-complete'
        ]
        if (validChannels.includes(channel)) {
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
