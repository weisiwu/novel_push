import { app, shell, BrowserWindow, ipcMain } from 'electron'
import asar from 'asar'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import rimraf from 'rimraf'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import macIcon from '../../resources/icon.png?asset'
import { DetectVideoShotByParts } from '../renderer/modules/DetectVideoShot'
import ImageToImage from '../renderer/modules/ImageToImage'
import AmplifyImage, { AmplifyBatchImageByAliyun } from '../renderer/modules/AmplifyImage'
import ConcatVideo from '../renderer/modules/ConcatVideo'
import { outputPath, videoFramesOutputPath, videoPartsOutputPath } from '../renderer/src/config'

let startWindow = null
let mainWindow = null
const resourcesPath = join(__dirname, 'resources')
const asarPath = join(__dirname, 'app.asar')

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
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
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

// App Ready后开始的准备进程
function initProcess() {
  try {
    console.log('============ initProcess start ============')
    if (!existsSync(outputPath)) {
      mkdirSync(outputPath, { recursive: true })
    } else {
      rimraf.rimraf(join(outputPath, '/*'))
    }
    mkdirSync(videoFramesOutputPath, { recursive: true })
    mkdirSync(videoPartsOutputPath, { recursive: true })
    console.log('============ initProcess end ============')
  } catch (e) {
    console.log('============ initProcess error ============')
    console.error(e)
    console.log('============ initProcess error ============')
    app.exit(1)
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  initProcess() // 前置检查，不满足，直接退出

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('open-new-window', () => {
    if (startWindow) {
      openSpecialWindow()
    }
  })

  // 视频分段
  ipcMain.on('cut-video', async (event, filePath) => {
    if (mainWindow) {
      DetectVideoShotByParts({
        filePath,
        event
      })
    }
  })

  // 图生图
  ipcMain.on('image-to-image', async (event, params) => {
    if (mainWindow) {
      ImageToImage({ event, params })
    }
  })

  // 放大图片
  ipcMain.on('amplify-image', async (event, imgs) => {
    if (mainWindow) {
      AmplifyImage({ event, imgs })
    }
  })

  // 批量放大图片
  ipcMain.on('amplify-batch-image', async (event, imgs) => {
    if (mainWindow) {
      AmplifyBatchImageByAliyun({ event, imgs })
    }
  })

  // 合并视频
  ipcMain.on('concat-video', async (event, params) => {
    if (mainWindow) {
      ConcatVideo({ event, params })
    }
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
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
