import os from 'os'
import fs from 'fs'
import asar from 'asar'
import { join, resolve } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/imgs/icon.png?asset'
import macIcon from '../../resources/imgs/icon.png?asset'
import platform_login from '../../resources/sdk/node/platform_api/platform_login.js'
import platform_send_video from '../../resources/sdk/node/platform_api/platform_send_video.js'
import configPath from '../../resources/BaoganAiConfig.json?commonjs-external&asset&asarUnpack'

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

    // 1、windows下，非盘符开头的路径 2、Mac下，非绝对路径
    if ((isWin && !/^[A-Z]:\\/.test(outputPath)) || (isMacOS && !outputPath.startsWith('/'))) {
      initConfig.outputPath = resolve(join(os.homedir(), 'Desktop', outputFolder))
      writeFileSync(configPath, JSON.stringify(initConfig))
    }
  } catch (e) {
    console.error('fail to localisize config json', e?.message || '')
  }
}

/**
 * 创建初始化窗口的配置
 * 加载起始页面逻辑需要优化
 */
function createWindow() {
  startWindow = new BrowserWindow({
    // width: 900,
    // height: 500,
    // TODO:(wsw) 分发，高大于宽
    width: 700,
    height: 900,
    show: false,
    maximizable: false,
    autoHideMenuBar: true,
    contextIsolation: !process.env.ELECTRON_NODE_INTEGRATION,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/distribute_multiple_platforms.js'),
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
    startWindow.loadURL(
      process.env['ELECTRON_RENDERER_URL'] + '/distribute_multiple_platforms.html'
    )
  } else {
    startWindow.loadFile(join(__dirname, '../renderer/distribute_multiple_platforms.html'))
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
      openSpecialWindow('distribute_multiple_platforms')
    }
  })

  /**
   * 登录平台
   */
  ipcMain.on('platform-login', async (event, info) => {
    const { platform } = info || {}
    platform_login(platform)
  })

  /**
   * 平台发布稿件
   */
  ipcMain.on('platform-send-video', async (event, info) => {
    const { platform, videoInfo = {} } = info || {}
    platform_send_video(platform, videoInfo)
  })

  // 监听打开文件夹
  ipcMain.on('select-video', (event) => {
    const result = dialog.showOpenDialogSync(mainWindow, {
      title: '请选择视频保存文件夹',
      defaultPath: process.resourcesPath,
      buttonLabel: '选取',
      properties: ['openFile']
    })
    // 用户取消
    if (result?.canceled || !result?.length) {
      return
    }
    const finalPath = result?.[0] || process.resourcesPath || ''
    // console.log('wswTest: 大小是事多啥哦', fs.statSync(finalPath).size)
    event.sender.send('select-video-finish', {
      path: finalPath,
      size: fs.statSync(finalPath).size
    })
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
        lora: userConfig.lora || config.lora || '',
        models: userConfig.models || config.models || '',
        ttf: userConfig.subfont || config.ttf || '',
        fontsize: userConfig.subfontsize || config.fontsize || 56,
        azureTTSVoice: userConfig.voicer || config.outputPath || '',
        retry_times: userConfig.retryTimes || 5,
        isOriginalSize: userConfig.isOriginalSize,
        outputPath: userConfig.outputPath || config.outputPath || '',
        HDImageWidth: userConfig.HDImageWidth || config.HDImageWidth || '',
        HDImageHeight: userConfig.HDImageHeight || config.HDImageHeight || '',
        sdBaseUrl: userConfig.sdBaseUrl || config.sdBaseUrl || ''
      })
      writeFileSync(configPath, localConfig)
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
