import { app, shell, BrowserWindow, ipcMain } from 'electron'
import fs from 'fs'
import { join } from 'path'
import { Readable } from 'stream'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import macIcon from '../../resources/icon.png?asset'
import DetectVideoShot from '../renderer/public/sdk/DetectVideoShot'
import TaggingImage from '../renderer/public/sdk/TaggingImage'

let startWindow = null
let mainWindow = null

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
      const fileStream = Readable.from(fs.readFileSync(filePath))
      DetectVideoShot.main({
        videoUrlObject: fileStream,
        filePath,
        event
      })
    }
  })

  ipcMain.on('image-tagger', async (event, imgs) => {
    if (mainWindow) {
      TaggingImage({ event, imgs })
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
