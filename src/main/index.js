import { app, shell, BrowserWindow, ipcMain } from 'electron'
import asar from 'asar'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import macIcon from '../../resources/icon.png?asset'
import { DetectVideoShotByParts } from '../renderer/public/sdk/DetectVideoShot'
import ImageToImage from '../renderer/public/sdk/ImageToImage'
import AmplifyImage, { AmplifyBatchImageByAliyun } from '../renderer/public/sdk/AmplifyImage'
import ConcatVideo from '../renderer/public/sdk/ConcatVideo'

let startWindow = null
let mainWindow = null
const resourcesPath = join(__dirname, 'resources')
const asarPath = join(__dirname, 'app.asar')

// 打包资源文件到 app.asar
asar.createPackage(resourcesPath, asarPath, () => {
  console.log('Resources packed into app.asar')
})

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

  ipcMain.on('cut-video', async (event, filePath) => {
    if (mainWindow) {
      DetectVideoShotByParts({
        filePath,
        event
      })
    }
  })

  ipcMain.on('image-to-image', async (event, params) => {
    if (mainWindow) {
      ImageToImage({ event, params })
    }
  })

  ipcMain.on('amplify-image', async (event, imgs) => {
    if (mainWindow) {
      AmplifyImage({ event, imgs })
    }
  })

  ipcMain.on('amplify-batch-image', async (event, imgs) => {
    if (mainWindow) {
      AmplifyBatchImageByAliyun({ event, imgs })
    }
  })

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

if (process.platform === 'darwin') {
  app.dock.setIcon(macIcon)
  // gif换动图
  // let tray = null
  // const frames = ['0.jpg', '1.jpg', '2.jpg', '3.jpg', '4.jpg'] // 图标序列
  // let currentFrame = 0
  // function updateTrayIcon() {
  //   const iconName = frames[currentFrame]
  //   const iconPath = join(__dirname, `../renderer/sdk/${iconName}`)
  //   app.dock.setIcon(iconPath)
  //   currentFrame = (currentFrame + 1) % frames.length
  //   setTimeout(updateTrayIcon, 100) // 更新图标的间隔时间，100毫秒
  // }
  // app.whenReady().then(() => {
  //   app.dock.setIcon(join(__dirname, `../renderer/sdk/0.jpg`))
  //   // tray = new Tray(join(__dirname, `../renderer/sdk/0.jpg`))
  //   updateTrayIcon()
  // })
}
