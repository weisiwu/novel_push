import { join } from 'path'
import { spawn } from 'child_process'
import {
  outputPath,
  videoFramesOutputPath as videoFramesPath,
  concatVideoPath as binPath
} from '../src/config.js'

// 本地将图片合成为视频
const ConcatVideo = ({ event, params = {} }) => {
  const { width, height, durations, output_file } = params || {}
  const concatProcess = spawn(binPath, [
    '--width',
    width,
    '--height',
    height,
    '--image_folder',
    videoFramesPath,
    '--output_file',
    join(outputPath, `${output_file}.mp4`),
    '--durations',
    durations.join(',')
  ])

  concatProcess.on('close', (code) => {
    if (code === 0) {
      event.sender.send('concat-video-complete', {
        save_path: outputPath
      })
    }
  })

  concatProcess.stderr.on('data', (data) => {
    console.error('【ConcatVideo】Error =>', data.toString())
  })
}

export default ConcatVideo
