import { app, shell, BrowserWindow, ipcMain } from 'electron'
import fs, { readFileSync } from 'fs'
import { exec } from 'child_process'
import axios from 'axios'
import { join, dirname } from 'path'
import { Readable } from 'stream'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import DetectVideoShot from '../sdk/DetectVideoShot'
import GetAsyncJobResult from '../sdk/GetAsyncJobResult'

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
      DetectVideoShot.main(fileStream, (result) => {
        const requestId = result?.body?.requestId
        const resultImgs = []

        let timer = setInterval(() => {
          GetAsyncJobResult.main(requestId, (result2) => {
            const parts = JSON.parse(result2?.body?.data?.result)
            const outputFilePattern = join(dirname(filePath), 'frame-%03d.png')
            const frames = JSON.parse(parts?.ShotFrameIds) || []
            const frameIndexFilter = frames
              ?.map?.((part, index) => {
                // 取中间帧，以达到画面稳定
                const next = frames[index + 1]
                if (!next) {
                  return part
                }
                resultImgs.push(
                  join(dirname(filePath), `frame-${String(index + 1).padStart(3, 0)}.png`)
                )
                return Math.ceil((next + part) / 2)
              })
              ?.map?.((part) => {
                return `eq(n\\,${part})`
              })
              .join('+')
            exec(
              `ffmpeg -i ${filePath} -vf "select=${frameIndexFilter}" -vsync vfr ${outputFilePattern}`,
              (error, stdout, stderr) => {
                if (error) {
                  console.error('error:', error)
                  return
                }
                event.sender.send('cut-video-complete', resultImgs)
              }
            )
            clearInterval(timer)
            // 视频智能分帧后，开始反推每个图的tag
            axios
              .post(
                'https://novel-push-1-1229125983044594.pai-eas.cn-shanghai.aliyun.com/sdapi/v1/interrogate?Token=NWU1ZDU0ZWIxMDNiOTdiY2Y1YzkzZGE4YmNkNWMzNjBhY2I5MDg2Mg==',
                {
                  image: Buffer.from(readFileSync(resultImgs[0])).toString('base64'),
                  // image_url: '',
                  model: 'clip'
                }
              )
              .then((res) => {
                console.log('wswTest: 反推tag', res.data)
              })
            // resultImgs.map(resultImgs)
          })
        }, 5000)
      })
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
