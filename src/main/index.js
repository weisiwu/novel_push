import os from 'os'
import fs from 'fs'
import asar from 'asar'
import axios from 'axios'
import { join, resolve } from 'path'
import { spawn } from 'child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
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
import { sdBaseUrl, updateConfigApi } from '../../resources/BaoganAiConfig.json'
import concatVideoBin from '../../resources/sdk/python/concat_video/dist/concat_video/concat_video.exe?asset&asarUnpack'

let startWindow = null
let mainWindow = null
const resourcesPath = process.resourcesPath
const asarPath = join(process.resourcesPath, 'app.asar')

// 打包资源文件到 app.asar
asar.createPackage(resourcesPath, asarPath)

// 初始化改写设置
if (fs.existsSync(configPath)) {
  const initConfigBuffer = readFileSync(configPath)
  const initConfigString = initConfigBuffer.toString()
  try {
    const initConfig = JSON.parse(initConfigString) || {}
    const { outputPath, outputFolder } = initConfig || {}
    const isWin = os.platform() === 'win32'
    const isMacOS = os.platform() === 'darwin'

    // 1、windows下，非盘符开头的路径
    // 2、Mac下，非绝对路径
    if ((isWin && !/^[A-Z]:\\/.test(outputPath)) || (isMacOS && !outputPath.startsWith('/'))) {
      initConfig.outputPath = resolve(join(os.homedir(), 'Desktop', outputFolder))
      writeFileSync(configPath, JSON.stringify(initConfig))
    }
  } catch (e) {
    console.error('fail to localisize config json', e?.message || '')
  }
}

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
  ipcMain.on('generate-image-audio-process-start', (event, newTexts) => {
    if (!mainWindow) {
      return
    }
    // console.log('wswTest: 主进程接收到的文字', newTexts)
    const everyUpdate = (args) => {
      if (!event?.sender?.send) {
        return
      }
      event.sender.send('texttovideo-process-update', args)
    }
    processPromptsToImgsAndAudio(everyUpdate, newTexts)
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
    let sentencesList = []
    let durations = ''
    let data = null
    try {
      sentencesList = JSON.parse(dataStr)
    } catch (e) {
      sentencesList = []
    }
    sentencesList?.forEach?.((sentence, index) => {
      durations += `${sentence?.duration}${index === sentencesList.length - 1 ? '' : ','}`
    })

    const childProcess = spawn(concatVideoBin, [
      '--durations',
      durations,
      '--font_base',
      resolve(join(configPath, '..', 'ttf')),
      '--config_file',
      configPath
    ])

    childProcess.stdout.on('data', (dataStr) => {
      try {
        data = JSON.parse(dataStr)
      } catch (e) {
        data = {}
      }
      if (data?.type === 'concat_imgs_to_video') {
        event.sender.send('export-process-update', data?.step)
      }
    })

    // 监听子进程的退出事件
    childProcess.on('close', (exitCode) => {
      console.log('wswTest:  整体进程退出', data)
      const { code, outputFile } = data
      if (Number(code) === 1 && outputFile) {
        shell.openExternal(outputFile)
      }
    })
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
        models: userConfig.models || config.models || '',
        ttf: userConfig.subfont || config.ttf || '',
        azureTTSVoice: userConfig.voicer || config.outputPath || '',
        retry_times: userConfig.retryTimes || 5,
        isOriginalSize: userConfig.isOriginalSize,
        outputPath: userConfig.outputPath || config.outputPath || '',
        HDImageWidth: userConfig.HDImageWidth || config.HDImageWidth || '',
        HDImageHeight: userConfig.HDImageHeight || config.HDImageHeight || '',
        sdBaseUrl: userConfig.sdBaseUrl || config.sdBaseUrl || ''
      })
      writeFileSync(configPath, localConfig)
      // 模型发生改变时，尝试更新默认模型
      console.log('wswTest: 开始更新模型', userConfig.models, config.models)
      if (userConfig.models && userConfig.models !== config.models) {
        axios
          .post(`${sdBaseUrl}${updateConfigApi}`, {
            sd_model_checkpoint: userConfig.models
          })
          .then((res) => {
            if (res.status == 200) {
              console.log('wswTest: 切换成功')
            } else {
              console.log('wswTest: 所选模型无法使用')
            }
          })
      }
      // console.log('wswTest:写入配置文件', config)
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
