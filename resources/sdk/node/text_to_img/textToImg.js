import fs, { readFileSync } from 'fs'
import rimraf from 'rimraf'
import { join, resolve } from 'path'
import {
  sdBaseUrl,
  t2iApi,
  i2iApi,
  positivePrompt,
  negativePrompt,
  outputPath,
  imageOutputFolder
} from '../../../BaoganAiConfig.json'
import { getCharactorsSentencesFromText } from '../get_prompts_by_kimi/getPrompts'
import { converTextToSpeech } from '../ms_azure_tts/getWavFromText'
import axios from 'axios'
// TODO:(wsw) 绘图参数设置收敛
const baseDrawConfig = {
  negative_prompt: negativePrompt,
  batch_size: 1,
  steps: 20,
  cfg_scale: 7,
  // width: 608,
  // height: 1080,
  width: 500,
  height: 500,
  sampler_index: 'DPM++ 3M SDE Exponential'
}
const MAX_RETRY_TIMES = 3
const fullT2iApi = `${sdBaseUrl.replace(/\/$/, '')}${t2iApi}`
const fullI2iApi = `${sdBaseUrl.replace(/\/$/, '')}${i2iApi}`

let charactors = {}
let charactorsTask = []
let sentencesTask = []
let ttsTask = []

/**
 * 根据提示词绘制图片
 */
function drawImageByPrompts({
  type = 'sentence',
  prompt = '',
  sIndex = 0,
  relatedCharactor = '',
  everyUpdate = () => {}
}) {
  let retryTimes = 0
  const relatedCharactorObj = charactors[relatedCharactor] || null
  const isI2i = Boolean(relatedCharactorObj)
  prompt = isI2i ? `${relatedCharactorObj?.prompt || ''},${prompt}` : prompt
  const api = isI2i ? fullI2iApi : fullT2iApi
  const drawConfig = isI2i
    ? {
        ...baseDrawConfig,
        cfg_scale: 12,
        denoising_strength: 0.5,
        init_images: [readFileSync(relatedCharactorObj?.image, { encoding: 'base64' })]
      }
    : { ...baseDrawConfig }

  // console.log('wswTest: 绘画任务参数', api, drawConfig)
  return axios
    .post(api, {
      ...drawConfig,
      prompt: `${prompt},${positivePrompt}`
    })
    .then((res) => {
      const imgBase64 = res?.data?.images?.[0] || ''
      // console.log('wswTest: 绘画任务结果', res)
      if (imgBase64) {
        const imageSaveFolder = resolve(join(outputPath, imageOutputFolder))
        if (!fs.existsSync(imageSaveFolder)) {
          fs.mkdirSync(imageSaveFolder, { recursive: true })
        } else {
          rimraf.sync(`${imageSaveFolder}/*`)
        }
        const _path = join(imageSaveFolder, `${sIndex}.png`)
        fs.writeFileSync(_path, Buffer.from(imgBase64, 'base64'))
        everyUpdate({
          type,
          sIndex,
          image: _path,
          tags: prompt?.split(',').filter((txt) => txt) || []
        })
        return { data: _path, code: 1 }
      }
      if (retryTimes < MAX_RETRY_TIMES) {
        retryTimes++
        return drawImageByPrompts({ type, prompt, sIndex, relatedCharactor, everyUpdate })
      }
      return { error: '未能成功生图', code: 0 }
    })
    .catch((e) => {
      if (retryTimes < MAX_RETRY_TIMES) {
        retryTimes++
        return drawImageByPrompts({ type, prompt, sIndex, relatedCharactor, everyUpdate })
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
      tags: charactorPrompt.split(',') || [],
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
      tags: sentencePrompt.split(',') || [],
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
 * 等待用户确认调整完毕后，开始执行绘图、配音任务
 */
function processPromptsToImgsAndAudio(everyUpdate) {
  // console.log('wswTest: 开始执行所有任务')
  // step2: 依次处理人物队列和句子队列中的绘图任务
  const allTask = [...charactorsTask, ...sentencesTask]
  allTask.reduce((task, taskInfo) => {
    return task.then(() => {
      // console.log('wswTest: 绘画任务开始')
      if (taskInfo.type === 'charactor') {
        return drawImageByPrompts(taskInfo).then(({ data: imgPath }) => {
          charactors[taskInfo.name] = { image: imgPath, prompt: taskInfo.prompt }
        })
      }
      return drawImageByPrompts(taskInfo)
    })
  }, Promise.resolve())
  // step3: 为句子进行配音
  ttsTask.reduce((task, taskInfo) => {
    return task.then(() => {
      return converTextToSpeech(taskInfo.text, `${taskInfo.sIndex}.wav`, (wav) => {
        console.log('wswTest: taskInfo是什么', taskInfo)
        delete taskInfo.everyUpdate
        everyUpdate({ ...taskInfo, wav })
      })
    })
  }, Promise.resolve())
}

export { processTextToPrompts, processPromptsToImgsAndAudio, drawImageByPrompts }
