import { join } from 'path'
import sizeOf from 'image-size'
import { readdir } from 'fs'
import { execSync, spawn } from 'child_process'
import {
  videoPartsOutputPath,
  videoFramesOutputPath,
  sceneDetectBin as binPath,
  cutPartsBin
} from '../src/config.js'

const appPath = process.resourcesPath
let sendFrameSize = false
const imgSize = {}

// 小视频片段，直接处理 (不超过10s)
export default function DetectVideoShot({
  filePath,
  outPath = videoPartsOutputPath,
  videoFramesPath = videoFramesOutputPath,
  event,
  totalData = [],
  totalTimes = []
}) {
  const concatProcess = spawn(binPath, ['-i', filePath, '-o', outPath, 'split-video'])

  return new Promise((resolve, reject) => {
    concatProcess.on('close', (code) => {
      if (code === 0) {
        // 本地分片完成后，对每个视频段进行读取，获取视频中间帧和视频持续时间。获取目录下所有文件
        readdir(outPath, (err, files) => {
          if (err) {
            console.error('Error reading directory:', err)
            reject(err)
          }

          // 遍历目录中的每个文件
          files.forEach((file, index) => {
            const filePath = join(outPath, file)

            // 使用ffprobe获取视频时长
            const durationCommand = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
            const duration = execSync(durationCommand).toString().trim()

            const imgName = join(videoFramesPath, `${index}.jpg`)

            // 使用ffmpeg获取视频中间帧
            const totalFramesCommand = `ffprobe -v error -select_streams v:0 -count_frames -show_entries stream=nb_frames -of default=nokey=1:noprint_wrappers=1 ${filePath}`
            const total_frames = execSync(totalFramesCommand)
            const thumbnailCommand = `ffmpeg -i "${filePath}" -vf "select=eq(n\\,${Math.floor(total_frames / 2)})" -vframes 1 -q:v 2 ${imgName}`
            execSync(thumbnailCommand)

            if (!sendFrameSize) {
              const { width, height } = sizeOf(imgName) || {}
              sendFrameSize = true
              imgSize.width = width
              imgSize.height = height
              event.sender.send('get-frame-size', { width, height })
            }

            totalData.push(imgName)
            totalTimes.push(duration)
            console.log('wswTest: update-video-frame imagName', imgName)
            event.sender.send('update-video-frame', { totalData, totalTimes })
          })
          resolve()
        })
      }
    })
  })
}

// 大视频片段，分块处理
export const DetectVideoShotByParts = ({ filePath, event }) => {
  const totalData = []
  const totalTimes = []
  const outPath = join(appPath, 'resources', 'video_cut_parts')

  // 启动切片进程
  const cutParsProcess = spawn(cutPartsBin, [
    '--input_file',
    filePath,
    '--output_dir',
    outPath,
    '--interval',
    10
  ])
  let finishParts = [] // 处理中，已经处理完的分片序号
  let waitingParts = [] // 待处理完的分片序号
  let scanTimer = null
  const taskList = Promise.resolve()
  const scanInterval = 10000 // 扫描切片目录间隔

  /**
   * auto_clip_video 进程对大视频切片，切完后，回复 auto_clip_video_finish
   * 在收到切片完成回复前，每3s扫描依次切片目录。查看有无新切片
   */
  scanTimer = setInterval(() => {
    readdir(outPath, (err, files) => {
      if (err) {
        console.error(`Error reading directory ${outPath}:`, err)
        return
      }

      // 将扫描的文件全部加入待办,升序排列
      waitingParts = [...files]
        .filter((file) => !finishParts.includes(file))
        .sort((prev, next) => prev.split('.')[0] - next.split('.')[0])
      // 将所有待办任务添加到任务列表中
      waitingParts.reduce((sum, waitingItem, index) => {
        return sum.then(() => {
          const taskIndex = Math.max(0, finishParts.length - 1 + index)
          return DetectVideoShot({
            filePath: join(outPath, waitingItem),
            // TODO:(wsw) 这里获取值的方式要调整
            outPath: videoPartsOutputPath,
            videoFramesPath: videoFramesOutputPath,
            // outPath: join(appPath, 'resources', `video_cut_result${taskIndex}`),
            // videoFramesPath: join(appPath, 'resources', `video_frames${taskIndex}`),
            event,
            totalData,
            totalTimes
          })
        })
      }, taskList)
      // 添加完毕后，移除所有待办任务到已完成、进行中任务
      waitingParts = []
      finishParts = [...files]

      // 切片timer被清空，这时最后一块被加入的任务
      if (!scanTimer) {
        event.sender.send('concat-video', {
          width: imgSize.width,
          height: imgSize.height,
          durations: totalTimes,
          output_file: videoFramesOutputPath
        })
      }
    })
  }, scanInterval)

  cutParsProcess.on('close', (code) => {
    console.log('wswTest: timer clear', code)
    if (code === 0) {
      clearInterval(scanTimer)
    }
  })
}
