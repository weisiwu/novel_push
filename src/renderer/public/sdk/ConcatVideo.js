import { join } from 'path'
import { mkdirSync, existsSync } from 'fs'
import { spawn } from 'child_process'
import binPath from '../../../../resources/sdk/concat_video/concat_video.exe?asset&asarUnpack'

const isWindows = process.platform === 'win32'
const appPath = process.resourcesPath

// 本地将图片合成为视频
const ConcatVideo = ({ event, params = {} }) => {
  const { width, height, durations, output_file } = params || {}
  const videoFramesPath = join(appPath, 'resources', 'img_to_img_result')
  if (!existsSync(join(appPath, 'resources', `cache`))) {
    mkdirSync(join(appPath, 'resources', `cache`), { recursive: true })
  }
  const outputPath = join(appPath, 'resources', `./cache/${output_file}.mp4`)
  const concatProcess = spawn(binPath, [
    '--width',
    width,
    '--height',
    height,
    '--image_folder',
    videoFramesPath,
    '--output_file',
    outputPath,
    '--durations',
    durations.join(',')
  ])

  console.log('wswTest: videoFramesPath', videoFramesPath)
  console.log('wswTest: outputPath', outputPath)

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
