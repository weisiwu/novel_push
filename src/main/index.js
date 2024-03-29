import asar from 'asar'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/imgs/icon.png?asset'
import macIcon from '../../resources/imgs/icon.png?asset'
import configPath from '../../resources/BaoganAiConfig.json?commonjs-external&asset&asarUnpack'
import {
  processTextToPrompts,
  processPromptsToImgsAndAudio,
  drawImageByPrompts
} from '../../resources/sdk/node/text_to_img/textToImg.js'
import { converTextToSpeech } from '../../resources/sdk/node/ms_azure_tts/getWavFromText.js'

let startWindow = null
let mainWindow = null
const resourcesPath = process.resourcesPath
const asarPath = join(process.resourcesPath, 'app.asar')

// 打包资源文件到 app.asar
asar.createPackage(resourcesPath, asarPath)

function createWindow() {
  startWindow = new BrowserWindow({
    width: 900,
    height: 500,
    show: false,
    maximizable: false,
    autoHideMenuBar: true,
    contextIsolation: !process.env.ELECTRON_NODE_INTEGRATION,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  startWindow.on('ready-to-show', () => {
    startWindow.show()
  })

  startWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    startWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    startWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// 打开指定窗口
function openSpecialWindow(pageName = 'main') {
  const size = require('electron').screen.getPrimaryDisplay().workAreaSize
  const wsWidth = parseInt(size.width)
  const wsHeight = parseInt(size.height)
  const targetWidth = 1920
  const targetHeight = 1080
  // 自适应放缩，范围在80%-100%
  const ratio = Math.max(Math.min(wsHeight / targetHeight, wsWidth / targetWidth, 0.8), 1)

  mainWindow = new BrowserWindow({
    width: 1920 * ratio,
    height: 1080 * ratio,
    show: true,
    autoHideMenuBar: true,
    contextIsolation: !process.env.ELECTRON_NODE_INTEGRATION,
    icon,
    webPreferences: {
      preload: join(__dirname, `../preload/${pageName}.js`),
      sandbox: false
    }
  })

  // 加载新窗口的页面
  mainWindow.loadFile(join(__dirname, `../renderer/${pageName}.html`))

  // 关闭旧窗口
  startWindow.close()
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('open-new-window', () => {
    if (startWindow) {
      openSpecialWindow()
    }
  })

  /**
   * 对输入的文章开始智能分析，生成绘图任务和音频任务
   */
  ipcMain.on('texttovideo-process-start', async (event, text) => {
    if (!mainWindow) {
      return
    }
    const everyUpdate = (args) => {
      if (!event?.sender?.send) {
        return
      }
      event.sender.send('texttovideo-process-update', args)
    }
    const finish = () => {
      if (!event?.sender?.send) {
        return
      }
      event.sender.send?.('texttovideo-parsetext-process-finish')
    }
    processTextToPrompts(text, everyUpdate, finish)
  })

  /**
   * 开始执行音频、绘图任务
   */
  ipcMain.on('generate-image-audio-process-start', (event) => {
    if (!mainWindow) {
      return
    }
    const everyUpdate = (args) => {
      if (!event?.sender?.send) {
        return
      }
      event.sender.send('texttovideo-process-update', args)
    }
    processPromptsToImgsAndAudio(everyUpdate)
  })

  /**
   * 单图重绘
   */
  ipcMain.on('start-redraw', async (event, params) => {
    if (!mainWindow) {
      return
    }
    const everyUpdate = (args) => {
      if (!event?.sender?.send) {
        return
      }
      event.sender.send('texttovideo-process-update', args)
    }
    drawImageByPrompts({
      type: params?.type,
      prompt: params?.prompt,
      sIndex: params?.sIndex,
      relatedCharactor: params?.relatedCharactor,
      everyUpdate
    })
  })

  /**
   * 将已生成的图片、音频合并为视频
   */
  ipcMain.on('concat-video', async (event, dataStr) => {
    if (!mainWindow) {
      return
    }
    let data = []
    try {
      data = JSON.parse(dataStr)
    } catch (e) {
      data = []
    }
    console.log('wswTest: 合成视频收到的数据', data)
    // const voiceText = data?.map?.((item) => item?.text || '')?.join?.(' ')
    // let isVoiceComplete = false
    // 转语音
    // converTextToSpeech(voiceText, () => {
    //   isVoiceComplete = true
    // })
    // 将图片组合成视频
    // 合并视频和语音
    // while (!isVoiceComplete) {
    //   await new Promise((resolve) => setTimeout(resolve, 1000))
    // }
  })

  // 监听打开文件夹
  ipcMain.on('open-dialog', (event) => {
    const result = dialog.showOpenDialogSync(mainWindow, {
      title: '请选择视频保存文件夹',
      defaultPath: process.resourcesPath,
      buttonLabel: '选取',
      properties: ['openDirectory']
    })
    // 用户取消
    if (result?.canceled || !result?.length) {
      return
    }
    event.sender.send('select-folder', result?.[0] || process.resourcesPath || '')
  })

  // 保存全局配置
  ipcMain.on('save-config', (event, params) => {
    if (!existsSync(configPath)) {
      mkdirSync(configPath, { recursive: true })
    }
    try {
      const userConfig = JSON.parse(params)
      const config = JSON.parse(readFileSync(configPath).toString())
      // 将要写入本地的配置
      const localConfig = JSON.stringify({
        ...config,
        skipRmWatermark: userConfig.skipRmWatermark || false,
        steps: userConfig.steps || 25,
        cfg: userConfig.cfg || 10,
        denoising_strength: userConfig.denoising_strength || 0.8,
        models: userConfig.models || true,
        retry_times: userConfig.retryTimes || 5,
        isOriginalSize: userConfig.isOriginalSize,
        outputPath: userConfig.outputPath || config.outputPath || '',
        HDImageWidth: userConfig.HDImageWidth || config.HDImageWidth || '',
        HDImageHeight: userConfig.HDImageHeight || config.HDImageHeight || '',
        sdBaseUrl: userConfig.sdBaseUrl || config.sdBaseUrl || ''
      })
      writeFileSync(configPath, localConfig)
      console.log('wswTest:写入配置文件', config)
    } catch (e) {
      console.log('wswTest: 本地写入配置失败', e)
    }
  })

  // 响应读起配置请求
  ipcMain.on('fetch-config', (event) => {
    if (!existsSync(configPath)) {
      return
    }
    const localConfig = readFileSync(configPath).toString()
    // 将写入的配置传回UI中
    event.sender.send('read-config', localConfig)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  app.on('web-contents-created', (event, contents) => {
    contents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url)
      return { action: 'deny' }
    })
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// mac电脑，设底部logo
if (process.platform === 'darwin') {
  app.dock.setIcon(macIcon)
}
