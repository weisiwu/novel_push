import moment from 'moment'
import { basename, join, resolve } from 'path'
import wavFileInfo from 'wav-file-info'
import { readFileSync, writeFileSync } from 'fs'
import configPath from '../../../BaoganAiConfig.json?commonjs-external&asset&asarUnpack'

function readLocalConfig() {
  const initConfigBuffer = readFileSync(configPath)
  const initConfigString = initConfigBuffer.toString()
  let initConfig = {}
  try {
    initConfig = JSON.parse(initConfigString) || {}
  } catch (e) {
    initConfig = {}
  }
  return initConfig
}

const update_srt = (texts) => {
  // 更新字幕文件
  const { outputPath, srtOutputFolder, srtOutput } = readLocalConfig()
  // step4: 生成字幕文件
  texts
    .reduce((task, taskInfo, taskIndex) => {
      console.log('wswTest:开始字幕合成 ', taskInfo.text)
      return task.then(() => {
        return new Promise((resolve, reject) => {
          if (!taskInfo.wav) {
            console.log('wswTest:这个音频没有地址0 ', taskInfo)
            resolve()
          }
          wavFileInfo.infoByFilename(taskInfo.wav, (err, info) => {
            if (err) {
              reject(err)
            }
            if (texts[taskIndex]) {
              texts[taskIndex].wav_duration = info.duration
            }
            resolve()
          })
        })
      })
    }, Promise.resolve())
    .then(() => {
      let subtitleRawText = ''
      let currentStart = 0
      const srtInterval = 0 // 字幕每行之间间隔100ms
      const parseTime = (time) => {
        return moment
          .utc(moment.duration(time, 'seconds').as('milliseconds'))
          .format('HH:mm:ss,SSS')
      }
      texts.forEach((textInfo, index) => {
        subtitleRawText += `${index + 1}
${parseTime(Number(currentStart))} --> ${parseTime(Number(currentStart) + Number(textInfo.wav_duration))}
${textInfo?.text || ''}

`
        currentStart = Number(currentStart) + srtInterval + Number(textInfo.wav_duration)
      })
      writeFileSync(resolve(join(outputPath, srtOutputFolder, srtOutput)), subtitleRawText)
    })
}

/**
 * 接受句子(场景)表的数据
 * 返回的值包含
 * 1、需要合并为视频的图片列表
 * 2、更新后的srt文件
 * 3、需要合并为完整音频的音频片段名
 */
const update_srt_img_wav_from_table = (sentencesList = []) => {
  const selectedImgs = []
  const texts = [] // 用于生成srt和语音
  const wavs = []
  const durations = []
  sentencesList.forEach((sentence) => {
    const { image = '', text = '', wav = '', duration = 0 } = sentence || {}
    selectedImgs.push(basename(image).split('?')[0])
    texts.push(text)
    wavs.push(basename(wav))
    durations.push(duration)
  })

  // 更新字幕文件
  update_srt(texts)
  console.log('wswTest: 更新后的图片列表是', selectedImgs)
  console.log('wswTest: 更新后的文案列表是', texts)
  console.log('wswTest: 更新后的音频列表是', wavs)
  console.log('wswTest: 更新后的音频时长是', durations)
  return [selectedImgs.join(','), wavs.join(','), durations.join(',')]
}

export default update_srt_img_wav_from_table
export { update_srt }
