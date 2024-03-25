import { parse } from 'path'
import { spawn } from 'child_process'
import { configPath, mainProcessBin } from '../src/config.js'

// 大视频片段，分块处理
const DetectVideoShotByParts = ({ filePath, event }) => {
  // 启动切片进程
  const shotsProcess = spawn(
    mainProcessBin,
    ['--input_file', filePath, '--config_file', configPath],
    { stdio: 'pipe' }
  )

  shotsProcess.stdout.on('data', (data) => {
    let dataStr = data.toString()
    let dataObj = null
    console.log('wswTest接受到的标准输出: ', dataStr)
    try {
      dataObj = JSON.parse(dataStr) || {}
    } catch (e) {
      dataObj = {}
    }
    if (dataObj) {
      event.sender.send('update-process', {
        ...dataObj,
        file_name: parse(dataObj?.input_file || '')?.name || '',
        img_path: dataObj?.input_file || '',
        new_img_path: dataObj?.output_file || dataObj?.output_file?.[0] || '',
        output_file: dataObj?.output_file || []
      })
    }
  })

  return shotsProcess
}

export const ConcatImagesToVideo = ({ filePath, event }) => {
  // 合并视频
  const concatProcess = spawn(
    mainProcessBin,
    ['--input_file', filePath, '--config_file', configPath, '--is_concat_imgs_to_video', true],
    { stdio: 'pipe' }
  )

  concatProcess.stdout.on('data', (data) => {
    let dataStr = data.toString()
    let dataObj = null
    console.log('wswTest接受到的标准输出: ', dataStr)
    try {
      dataObj = JSON.parse(dataStr) || {}
    } catch (e) {
      dataObj = {}
    }
    if (dataObj?.type === 'concat_video') {
      event.sender.send('finish-concat', {
        outputPath: dataObj?.outputPath || '',
        outputFile: dataObj?.outputFile || ''
      })
    }
  })

  return concatProcess
}

export const ReDrawImage = ({ filePath, frameIndex, event }) => {
  // 合并视频
  const redrawProcess = spawn(
    mainProcessBin,
    ['--input_file', filePath, '--config_file', configPath, '--redraw', true],
    { stdio: 'pipe' }
  )

  redrawProcess.stdout.on('data', (data) => {
    let dataStr = data.toString()
    let dataObj = null
    console.log('wswTest接受到的标准输出: ', dataStr)
    try {
      dataObj = JSON.parse(dataStr) || {}
    } catch (e) {
      dataObj = {}
    }
    if (dataObj?.type === 're_draw') {
      event.sender.send('finish-redraw', { frameIndex, input_file: dataObj?.input_file || '' })
    }
  })

  return redrawProcess
}

export default DetectVideoShotByParts
