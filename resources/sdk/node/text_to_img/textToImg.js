import axios from 'axios'
import { join, resolve } from 'path'
import fs, { readFileSync } from 'fs'
import {
  sdBaseUrl,
  t2iApi,
  i2iApi,
  amplifyApi,
  positivePrompt,
  negativePrompt,
  outputPath,
  imageOutputFolder,
  batchSize,
  cfg,
  iti_cfg,
  iti_denoising_strength,
  HDImageWidth,
  HDImageHeight
} from '../../../BaoganAiConfig.json'
import configPath from '../../../BaoganAiConfig.json?commonjs-external&asset&asarUnpack'
import { getCharactorsSentencesFromTextStream } from '../get_prompts_by_kimi/getPrompts'
import { converTextToSpeech } from '../ms_azure_tts/getWavFromText'
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
const fullAmplifyImgApi = `${sdBaseUrl.replace(/\/$/, '')}${amplifyApi}`

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
  image = '',
  sIndex = 0,
  isHd = false,
  relatedCharactor = '',
  everyUpdate = () => {},
  retryTimes = 0
}) {
  const relatedCharactorObj = charactors[relatedCharactor] || null
  const { HDImageWidth, HDImageHeight, lora } = readLocalConfig()
  const isI2i = Boolean(relatedCharactorObj)
  let api = isI2i ? fullI2iApi : fullT2iApi
  api = isHd ? fullAmplifyImgApi : api
  const imageSaveFolder = resolve(join(outputPath, imageOutputFolder))

  // 高清重绘
  if (isHd) {
    const pureImage = image?.replace?.(/\?t=\d+$/, '')
    console.log('wswTest: 要高清重绘图的是什么======>>>>', pureImage)
    // 如果是高清放大
    const drawConfig = {
      resize_mode: 0,
      upscaling_resize: 2.5,
      upscaling_crop: true,
      upscaler_1: 'R-ESRGAN 4x+',
      upscaler_2: 'R-ESRGAN 4x+ Anime6B',
      extras_upscaler_2_visibility: 0,
      image: readFileSync(pureImage, { encoding: 'base64' })
    }
    return axios
      .post(api, drawConfig)
      .then((res) => {
        const newImg = res?.data?.image || ''
        // console.log('wswTest: 高清重绘的结果是什么', res)
        console.log('wswTest: 高清重绘的新图是是这个', newImg?.substr?.(0, 10))
        console.log('wswTest: 高清重绘2222', res?.config?.data?.image?.substr?.(0, 10))
        const _path = join(imageSaveFolder, `${sIndex}.png`)
        console.log('wswTest: 高清炒年糕会的phta', _path)
        fs.writeFileSync(_path, Buffer.from(newImg, 'base64'))
        everyUpdate({ type: 'amplify_to_hd', sIndex, HDImage: _path })
      })
      .catch((e) => {
        console.log('[高清重绘] execption =>', e)
        if (retryTimes < MAX_RETRY_TIMES) {
          return drawImageByPrompts({
            type,
            image: pureImage,
            isHd,
            everyUpdate,
            retryTimes: ++retryTimes
          })
        } else {
          // 放大超出次数，报错
          everyUpdate({ type: 'amplify_to_hd', sIndex, image: 'error_img' })
        }
        return { error: e?.message, code: 0 }
      })
  }

  prompt = prompt
    .split(',')
    .filter((item) => item)
    // i2i时，需要对句子的提示词做增强，使得画面中能凸显对应元素
    .map((item) => (isI2i ? `(${item}:1.7)` : `${item}`))
    .join(',')
  prompt = isI2i ? `${relatedCharactorObj?.prompt || ''},${prompt}` : prompt
  const drawConfig = isI2i
    ? {
        ...baseDrawConfig,
        width: HDImageWidth,
        height: HDImageHeight,
        cfg_scale: iti_cfg,
        denoising_strength: iti_denoising_strength,
        init_images: [
          relatedCharactorObj?.image
            ? readFileSync(relatedCharactorObj?.image, { encoding: 'base64' })
            : ''
        ]
      }
    : { ...baseDrawConfig, width: HDImageWidth, height: HDImageHeight }

  const finalPrompt = `${positivePrompt},${prompt} ${lora ? `<lora:${lora}:1.5>` : ''}`
  console.log('wswTest:', isI2i ? '图生图' : '文生图', '提示词', finalPrompt)
  return axios
    .post(api, {
      ...drawConfig,
      prompt: finalPrompt
    })
    .then((res) => {
      const images = res?.data?.images || []
      const imageSaveFolder = resolve(join(outputPath, imageOutputFolder))
      if (images.length) {
        let _path = ''
        const restImgs = []
        if (images[0]) {
          _path = join(imageSaveFolder, `${sIndex}.png`)
          fs.writeFileSync(_path, Buffer.from(images[0], 'base64'))
          console.log('wswTest: 展示图片名', _path)
        }
        // 非高清放大，会批量生图
        images.slice?.(1, batchSize)?.forEach?.((imgBase64) => {
          // 系统写1m的图片速度，远比预料中快，大约在700us左右。
          const rest_path = join(imageSaveFolder, `${sIndex}_${process.hrtime.bigint()}_rest.png`)
          fs.writeFileSync(rest_path, Buffer.from(imgBase64, 'base64'))
          restImgs.push(rest_path)
        })
        console.log('wswTest: restImgsrestImgs', restImgs)
        const updateConfig = { type, sIndex, image: _path, restImgs: restImgs, tags: prompt || '' }
        everyUpdate(updateConfig)
        // 向全局变量中添加角色信息
        if (type === 'charactor') {
          charactors[name] = { image: _path, prompt: prompt }
        }
        retryTimes = 0
        return { data: _path, code: 1 }
      }
      if (retryTimes < MAX_RETRY_TIMES) {
        return drawImageByPrompts({
          type,
          name,
          prompt,
          sIndex,
          relatedCharactor,
          everyUpdate,
          retryTimes: ++retryTimes
        })
      }
      return { error: '未能成功生图', code: 0 }
    })
    .catch((e) => {
      console.log('[drawImageByPrompts] execption =>', retryTimes)
      if (retryTimes < MAX_RETRY_TIMES) {
        return drawImageByPrompts({
          type,
          name,
          prompt,
          sIndex,
          relatedCharactor,
          everyUpdate,
          retryTimes: ++retryTimes
        })
      } else {
        // 重绘超出次数，报错
        everyUpdate({
          type,
          sIndex,
          image: 'error_img',
          restImgs: [],
          tags: prompt || ''
        })
      }
      return { error: e?.message, code: 0 }
    })
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
  ttsTask.reduce((task, taskInfo) => {
    return task.then(() => {
      // console.log('wswTest: 开始配音', taskInfo.text)
      return converTextToSpeech(taskInfo.text, `${taskInfo.sIndex}.wav`, (wav) => {
        texts.push({ wav, text: taskInfo.text })
        delete taskInfo.everyUpdate
        console.log('wswTest: ', '生成配音', taskInfo)
        everyUpdate({ ...taskInfo, type: 'generate_wav', wav })
      })
    })
  }, Promise.resolve())
}

/**
 * 场景图片批量放大
 */
function amplifySentencesImageToHD(everyUpdate, sentencesList) {
  const allTask = [...sentencesList]
  allTask.reduce((task, taskInfo) => {
    return task.then(() => {
      console.log('wswTest: ', '开始高清重绘图片1212', taskInfo)
      const pureImage = taskInfo?.image?.replace?.(/\?t=\d+$/, '')
      return drawImageByPrompts({ ...taskInfo, image: pureImage, isHd: true, everyUpdate })
    })
  }, Promise.resolve())
}

export {
  processTextToPromptsStream,
  processPromptsToImgsAndAudio,
  amplifySentencesImageToHD,
  drawImageByPrompts
}
