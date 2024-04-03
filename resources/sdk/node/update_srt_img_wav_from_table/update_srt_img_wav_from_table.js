import moment from 'moment'
import { promisify } from 'util'
import { rimrafSync } from 'rimraf'
import { basename, join, resolve } from 'path'
import wavFileInfo from 'wav-file-info'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
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

const parseTime = (time) => {
  return moment.utc(moment.duration(time, 'seconds').as('milliseconds')).format('HH:mm:ss,SSS')
}

const readWavInfo = promisify(wavFileInfo.infoByFilename)

const update_srt = async (texts, wavs) => {
  console.log('wswTest: 开始更新字幕,新的字幕文件是什么', texts)
  const textTask = []
  const durations = []
  let subtitleRawText = ''
  let currentStart = 0
  const srtInterval = 0 // 字幕每行之间间隔0ms
  const { outputPath, audioOutputFolder, srtOutputFolder, srtOutput } = readLocalConfig()
  // 更新字幕文件，先清空字幕文件夹
  const srtSaveFolder = resolve(join(outputPath, srtOutputFolder))
  if (!existsSync(srtSaveFolder)) {
    mkdirSync(srtSaveFolder, { recursive: true })
  } else {
    rimrafSync(`${srtSaveFolder}/*`, { glob: true })
  }
  // 更新字幕文件的同时，更新每条字幕持续时间
  for (let textIndex = 0; textIndex < texts.length; textIndex++) {
    const text = texts[textIndex]
    console.log('wswTest:正在写入字幕 ', text)
    const wavName = wavs[textIndex] || ''
    if (!wavName) {
      console.log('wswTest:不存在这个音频名称 ')
      return
    }
    console.log('wswTest: [字幕处理]正在处理', text, wavName)
    try {
      const infoData = await readWavInfo(join(outputPath, audioOutputFolder, basename(wavName)))
      console.log('wswTest: Promise化后读取的数据是什么', infoData)
      textTask.push({
        text,
        wav_duration: infoData.duration
      })
      durations.push(infoData.duration)
    } catch (e) {
      console.log('wswTest: 读取wav信息失败', e)
    }
  }
  textTask.forEach((textInfo, index) => {
    subtitleRawText += `${index + 1}
${parseTime(Number(currentStart))} --> ${parseTime(Number(currentStart) + Number(textInfo.wav_duration))}
${textInfo?.text || ''}

`
    currentStart = Number(currentStart) + srtInterval + Number(textInfo.wav_duration)
  })
  writeFileSync(resolve(join(outputPath, srtOutputFolder, srtOutput)), subtitleRawText)
  console.log('wswTest: updateSRT结束', durations)
  return durations
}

/**
 * 接受句子(场景)表的数据
 * 返回的值包含
 * 1、需要合并为视频的图片列表
 * 2、更新后的srt文件
 * 3、需要合并为完整音频的音频片段名
 */
const update_srt_img_wav_from_table = async (sentencesList = []) => {
  const selectedImgs = []
  const texts = [] // 用于生成srt和语音
  const wavs = []
  sentencesList.forEach((sentence) => {
    const { image = '', text = '', wav = '' } = sentence || {}
    selectedImgs.push(basename(image).split('?')[0])
    texts.push(text)
    wavs.push(basename(wav))
  })

  // 更新字幕文件
  const durations = await update_srt(texts, wavs)
  console.log('wswTest: 更新后的图片列表是', selectedImgs)
  console.log('wswTest: 更新后的文案列表是', texts)
  console.log('wswTest: 更新后的音频列表是', wavs)
  console.log('wswTest: 更新后的音频时长是', durations)
  return [selectedImgs.join(','), wavs.join(','), durations.join(',')]
}

export default update_srt_img_wav_from_table
export { update_srt }
