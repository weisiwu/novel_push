import { parse } from 'path'
import { spawn } from 'child_process'
import { configPath, mainProcessBin } from '../src/config.js'

// 大视频片段，分块处理
const DetectVideoShotByParts = ({ filePath, event }) => {
  console.log('wswTest: filePath', filePath)
  // 启动切片进程
  const mainProcess = spawn(
    mainProcessBin,
    ['--input_file', filePath, '--config_file', configPath],
    { stdio: 'pipe' }
  )

  mainProcess.stdout.on('data', (data) => {
    let dataStr = data.toString()
    let dataObj = null
    try {
      dataObj = JSON.parse(dataStr) || {}
    } catch (e) {
      dataObj = {}
    }
    if (dataObj.code === 1) {
      console.log('wswTest: 接收到的数据对象是', dataObj)
      event.sender.send('update-process', {
        type: dataObj?.type,
        width: dataObj?.width,
        height: dataObj?.height,
        file_name: parse(dataObj?.input_file || '')?.name,
        img_path: dataObj?.input_file || '',
        new_img_path: dataObj?.output_file || ''
      })
    }
  })

  mainProcess.on('close', (code) => {
    console.log('wswTest:视频处理进程结束了', code)
    event.sender.send('finish-process', { code })
  })
}

export default DetectVideoShotByParts
