import axios from 'axios'
import moment from 'moment'
import { rimrafSync } from 'rimraf'
import { join, resolve } from 'path'
import fs, { readFileSync, writeFileSync } from 'fs'
import wavFileInfo from 'wav-file-info'
import {
  sdBaseUrl,
  t2iApi,
  i2iApi,
  positivePrompt,
  negativePrompt,
  outputPath,
  imageOutputFolder,
  audioOutputFolder,
  batchSize,
  cfg,
  iti_cfg,
  iti_denoising_strength,
  HDImageWidth,
  HDImageHeight
} from '../../../BaoganAiConfig.json'
import configPath from '../../../BaoganAiConfig.json?commonjs-external&asset&asarUnpack'
import {
  getCharactorsSentencesFromText,
  getCharactorsSentencesFromTextStream
} from '../get_prompts_by_kimi/getPrompts'
import { converTextToSpeech } from '../ms_azure_tts/getWavFromText'
import { update_srt } from '../update_srt_img_wav_from_table/update_srt_img_wav_from_table'
// TODO:(wsw) 绘图参数设置收敛
const baseDrawConfig = {
  negative_prompt: negativePrompt,
  batch_size: batchSize,
  steps: 20,
  cfg_scale: cfg,
  width: HDImageWidth,
  height: HDImageHeight,
  sampler_index: 'DPM++ 3M SDE Exponential'
}
const MAX_RETRY_TIMES = 3
const fullT2iApi = `${sdBaseUrl.replace(/\/$/, '')}${t2iApi}`
const fullI2iApi = `${sdBaseUrl.replace(/\/$/, '')}${i2iApi}`

let charactors = {}
let charactorsTask = []
let sentencesTask = []
let ttsTask = []

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

/**
 * 根据提示词绘制图片
 */
function drawImageByPrompts({
  type = 'sentence',
  name = '',
  prompt = '',
  sIndex = 0,
  relatedCharactor = '',
  everyUpdate = () => {},
  ...rest
}) {
  console.log('wswTest: restrestrestrestxxx', rest, name)
  let retryTimes = 0
  console.log('wswTest: 目前所有的角色信息', charactors)
  const relatedCharactorObj = charactors[relatedCharactor] || null
  const { HDImageWidth, HDImageHeight } = readLocalConfig()
  const isI2i = Boolean(relatedCharactorObj)
  prompt = prompt
    .split(',')
    .filter((item) => item)
    // i2i时，需要对句子的提示词做增强，使得画面中能凸显对应元素
    .map((item) => (isI2i ? `(${item}:1.7)` : `${item}`))
    .join(',')
  console.log('wswTest: 关联角色是什么', relatedCharactorObj)
  prompt = isI2i ? `${relatedCharactorObj?.prompt || ''},${prompt}` : prompt
  const api = isI2i ? fullI2iApi : fullT2iApi
  const drawConfig = isI2i
    ? {
        ...baseDrawConfig,
        width: HDImageWidth,
        height: HDImageHeight,
        cfg_scale: iti_cfg,
        denoising_strength: iti_denoising_strength,
        init_images: [readFileSync(relatedCharactorObj?.image, { encoding: 'base64' })]
      }
    : { ...baseDrawConfig, width: HDImageWidth, height: HDImageHeight }

  const finalPrompt = `${positivePrompt},${prompt} <lora:GachaSpliash4:1.5>`
  console.log('wswTest:', isI2i ? '图生图' : '文生图', '提示词', finalPrompt)
  return axios
    .post(api, {
      ...drawConfig,
      prompt: finalPrompt
    })
    .then((res) => {
      const images = res?.data?.images || []
      console.log('wswTest: 绘图生成的图列表是什么', images.length)
      const imageSaveFolder = resolve(join(outputPath, imageOutputFolder))
      if (images.length) {
        let _path = ''
        const restImgs = []
        if (images[0]) {
          _path = join(imageSaveFolder, `${sIndex}.png`)
          fs.writeFileSync(_path, Buffer.from(images[0], 'base64'))
          console.log('wswTest: 展示图片名', _path)
        }
        images.slice(1, batchSize).forEach((imgBase64) => {
          const rest_path = join(imageSaveFolder, `${sIndex}_${new Date().getTime()}_rest.png`)
          console.log('wswTest: 备选图片名', rest_path)
          fs.writeFileSync(rest_path, Buffer.from(imgBase64, 'base64'))
          restImgs.push(rest_path)
        })
        console.log('wswTest: restImgsrestImgs', restImgs)
        everyUpdate({
          type,
          sIndex,
          image: _path,
          restImgs: restImgs,
          tags: prompt || ''
        })
        if (type === 'charactor') {
          charactors[name] = { image: _path, prompt: prompt }
        }
        return { data: _path, code: 1 }
      }
      console.log('wswTest: ', '图片生成失败了')
      if (retryTimes < MAX_RETRY_TIMES) {
        retryTimes++
        return drawImageByPrompts({ type, name, prompt, sIndex, relatedCharactor, everyUpdate })
      }
      return { error: '未能成功生图', code: 0 }
    })
    .catch((e) => {
      if (retryTimes < MAX_RETRY_TIMES) {
        retryTimes++
        return drawImageByPrompts({ type, name, prompt, sIndex, relatedCharactor, everyUpdate })
      }
      console.log('[drawImageByPrompts] execption =>', e)
      return { error: e?.message, code: 0 }
    })
}

/**
 * 对返回的prompt进行加工
 */
function formatPrompt(rawStr = '') {
  return (rawStr || '').toString()
}

/**
 * 处理文本，获取绘图、配音任务
 */
async function processTextToPrompts(text, everyUpdate, finish = () => {}) {
  const { charactors: rawCharactors = [], sentences: rawSentences = [] } =
    (await getCharactorsSentencesFromText(text)) || []

  if (!rawCharactors.length) {
    console.log('[processTextToPrompts]解析角色错误，未解析出角色')
    everyUpdate({ error: 0, type: 'parse_text_error', message: 'need retry' })
    return
  }
  const { outputPath, srtOutputFolder } = readLocalConfig()
  const imageSaveFolder = resolve(join(outputPath, imageOutputFolder))
  if (!fs.existsSync(imageSaveFolder)) {
    fs.mkdirSync(imageSaveFolder, { recursive: true })
  } else {
    rimrafSync(`${imageSaveFolder}/*`, { glob: true })
  }
  const audioSaveFolder = resolve(join(outputPath, audioOutputFolder))
  if (!fs.existsSync(audioSaveFolder)) {
    fs.mkdirSync(audioSaveFolder, { recursive: true })
  } else {
    rimrafSync(`${audioSaveFolder}/*`, { glob: true })
  }
  const srtSaveFolder = resolve(join(outputPath, srtOutputFolder))
  if (!fs.existsSync(srtSaveFolder)) {
    fs.mkdirSync(srtSaveFolder, { recursive: true })
  } else {
    rimrafSync(`${srtSaveFolder}/*`, { glob: true })
  }
  charactors = {}
  charactorsTask = []
  sentencesTask = []
  ttsTask = []

  // step1: 将已经获取的角色和句子文案同步到表格中
  // 处理角色提示词
  rawCharactors.forEach((charactor, index) => {
    const _name = charactor.name?.replace?.(/\s/g, '')?.toLowerCase?.()
    delete charactor.name
    const charactorPrompt = formatPrompt(
      Object.values(charactor)
        .map((p) => formatPrompt(p))
        .filter((p) => p)
        .join(',')
    )
    const charactorInfo = {
      type: 'charactor',
      name: _name,
      sIndex: index,
      tags: charactorPrompt || '',
      prompt: charactorPrompt
    }
    everyUpdate(charactorInfo)
    charactorsTask.push({ ...charactorInfo, everyUpdate }) // 加载角色任务
  })

  rawSentences.forEach((rawSentence, sIndex) => {
    const { chinese, english: rawEnglish, charactor: rawCharactor } = rawSentence || {}
    const charactor = rawCharactor.replace?.(/\s/g, '')?.toLowerCase?.()
    const english = rawEnglish instanceof Array ? rawEnglish.join(',') : rawEnglish || ''
    const sentencePrompt = formatPrompt([positivePrompt, english].join(','))
    const relatedCharactor = charactor
    const sentenceInfo = {
      type: 'sentence',
      tags: sentencePrompt || '',
      prompt: sentencePrompt,
      sIndex,
      text: chinese,
      relatedCharactor
    }
    everyUpdate(sentenceInfo)
    sentencesTask.push({ ...sentenceInfo, everyUpdate }) // 加载句子任务
    ttsTask.push({ ...sentenceInfo, everyUpdate }) // 加载配音任务
  })
  finish()
}

/**
 * 处理文本，获取绘图、配音任务
 * 接受流式返回
 */
async function processTextToPromptsStream(text, everyUpdate, finish = () => {}) {
  charactors = {}
  charactorsTask = []
  sentencesTask = []
  ttsTask = []

  getCharactorsSentencesFromTextStream(
    text,
    everyUpdate,
    finish,
    charactors,
    charactorsTask,
    sentencesTask,
    ttsTask
  )
}

/**
 * 更新配音任务的文本
 */
function updatePeiyinTask(newTexts = []) {
  ttsTask = ttsTask.map((task, index) => {
    return {
      ...task,
      text: newTexts[index] || task?.text || ''
    }
  })
}

/**
 * 自动绘图配音
 * Notice: 这里会自动按照顺序，依次给每个场景常规重新生成配音、字幕、图像
 * 等待用户确认调整完毕后，开始执行绘图、配音任务
 */
function processPromptsToImgsAndAudio(everyUpdate, newTexts) {
  const texts = []

  // 更新配音字幕
  updatePeiyinTask(newTexts)

  // step2: 依次处理人物队列和句子队列中的绘图任务
  const allTask = [...charactorsTask, ...sentencesTask]
  allTask.reduce((task, taskInfo) => {
    return task.then(() => {
      if (taskInfo.type === 'charactor') {
        return drawImageByPrompts(taskInfo)
      }
      return drawImageByPrompts(taskInfo)
    })
  }, Promise.resolve())
  // step3: 为句子进行配音
  ttsTask
    .reduce((task, taskInfo) => {
      return task.then(() => {
        console.log('wswTest: 开始配音', taskInfo.text)
        return converTextToSpeech(taskInfo.text, `${taskInfo.sIndex}.wav`, (wav) => {
          texts.push({ wav, text: taskInfo.text })
          delete taskInfo.everyUpdate
          everyUpdate({ ...taskInfo, wav })
        })
      })
    }, Promise.resolve())
    .then(() => {
      update_srt(texts)
      //       const { outputPath, srtOutputFolder, srtOutput } = readLocalConfig()
      //       // step4: 生成字幕文件
      //       texts
      //         .reduce((task, taskInfo, taskIndex) => {
      //           console.log('wswTest:开始字幕合成 ', taskInfo.text)
      //           return task.then(() => {
      //             return new Promise((resolve, reject) => {
      //               wavFileInfo.infoByFilename(taskInfo.wav, (err, info) => {
      //                 if (err) {
      //                   reject(err)
      //                 }
      //                 if (texts[taskIndex]) {
      //                   texts[taskIndex].wav_duration = info.duration
      //                 }
      //                 resolve()
      //               })
      //             })
      //           })
      //         }, Promise.resolve())
      //         .then(() => {
      //           let subtitleRawText = ''
      //           let currentStart = 0
      //           const srtInterval = 0.1 // 字幕每行之间间隔100ms
      //           const parseTime = (time) => {
      //             return moment
      //               .utc(moment.duration(time, 'seconds').as('milliseconds'))
      //               .format('HH:mm:ss,SSS')
      //           }
      //           texts.forEach((textInfo, index) => {
      //             subtitleRawText += `${index + 1}
      // ${parseTime(Number(currentStart))} --> ${parseTime(Number(currentStart) + Number(textInfo.wav_duration))}
      // ${textInfo?.text || ''}
      // `
      //             currentStart = Number(currentStart) + srtInterval + Number(textInfo.wav_duration)
      //           })
      //           // 由于使用了moviepy做字幕合成，在写入字幕的时候必须要用gbk编码
      //           writeFileSync(resolve(join(outputPath, srtOutputFolder, srtOutput)), subtitleRawText)
      //         })
    })
}

export {
  processTextToPrompts,
  processTextToPromptsStream,
  processPromptsToImgsAndAudio,
  drawImageByPrompts
}
