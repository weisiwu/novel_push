import asar from 'asar'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/imgs/icon.png?asset'
import macIcon from '../../resources/imgs/icon.png?asset'
import DetectVideoShotByParts, {
  ConcatImagesToVideo,
  ReDrawImage
} from '../renderer/modules/DetectVideoShot'
import configPath from '../../resources/BaoganAiConfig.json?commonjs-external&asset&asarUnpack'

let startWindow = null
let mainWindow = null
let inputFilePath = ''
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
  let detectVideoShotProcess = null
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
   * 启动处理进程，渲染告诉主进程，本地视频位置，主进程处理
   */
  ipcMain.on('start-process', async (event, filePath) => {
    if (!mainWindow) {
      return
    }
    inputFilePath = filePath
    detectVideoShotProcess = DetectVideoShotByParts({ filePath, event })
  })

  ipcMain.on('stop-process', async (event) => {
    if (!mainWindow || !detectVideoShotProcess) {
      return
    }
    detectVideoShotProcess?.kill('SIGTERM')
  })

  ipcMain.on('concat-video', async (event) => {
    if (!mainWindow) {
      return
    }
    ConcatImagesToVideo({ event, filePath: inputFilePath })
  })

  ipcMain.on('start-redraw', async (event, filePath) => {
    if (!mainWindow) {
      return
    }
    ReDrawImage({ event, filePath })
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
        baseUrl: userConfig.baseUrl || config.baseUrl || ''
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
