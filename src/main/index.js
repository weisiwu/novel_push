import asar from 'asar'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/imgs/icon.png?asset'
import macIcon from '../../resources/imgs/icon.png?asset'
import DetectVideoShotByParts from '../renderer/modules/DetectVideoShot'

let startWindow = null
let mainWindow = null
const resourcesPath = join(__dirname, 'resources')
const asarPath = join(__dirname, 'app.asar')
const configPath = join(process.cwd(), 'resources', 'BaoganAiConfig.json')

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
   * 启动处理进程，渲染告诉主进程，本地视频位置，主进程处理
   */
  ipcMain.on('start-process', async (event, filePath) => {
    if (!mainWindow) {
      return
    }
    DetectVideoShotByParts({
      filePath,
      event
    })
  })

  /**
   * 结束处理进程，主进程任务完全结束，通知渲染进程
   */
  ipcMain.on('finish-process', async (event, params) => {
    if (!mainWindow) {
      return
    }
    console.log('wswTest: 视频处理进程结束', params)
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
    console.log('wswTest: 用户保存的配置', params, typeof params)
    console.log('wswTest: configPath==>', configPath)
    if (!existsSync(configPath)) {
      mkdirSync(configPath, { recursive: true })
    }
    try {
      const userConfig = JSON.parse(params)
      const config = JSON.parse(readFileSync(configPath).toString())
      writeFileSync(
        configPath,
        JSON.stringify({
          ...config,
          outputPath: userConfig.savePath || config.outputPath || '',
          HDImageWidth: userConfig.imgWidth || config.HDImageWidth || '',
          HDImageHeight: userConfig.imgHeight || config.HDImageHeight || '',
          baseUrl: userConfig.SDBaseurl || config.baseUrl || ''
        })
      )
      console.log('wswTest: 读取配置文件', config)
    } catch (e) {
      console.log('wswTest: 本地写入配置失败', e)
    }
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
