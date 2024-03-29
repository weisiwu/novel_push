import fs, { readFileSync } from 'fs'
import path from 'path'
import {
  sdBaseUrl,
  t2iApi,
  i2iApi,
  positivePrompt,
  negativePrompt,
  outputPath
} from '../../../BaoganAiConfig.json'
import { getCharactorsSentencesFromText } from '../get_prompts_by_kimi/getPrompts'
import axios from 'axios'
const baseDrawConfig = {
  negative_prompt: negativePrompt,
  batch_size: 1,
  steps: 20,
  cfg_scale: 7,
  width: 608,
  height: 1080,
  sampler_index: 'DPM++ 3M SDE Exponential'
}
const MAX_RETRY_TIMES = 3
const fullT2iApi = `${sdBaseUrl.replace(/\/$/, '')}${t2iApi}`
const fullI2iApi = `${sdBaseUrl.replace(/\/$/, '')}${i2iApi}`

let charactors = {}

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
  console.log('wswTest: 接收到的绘图入参是什么', prompt)
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

  // console.log('wswTest: 最终绘图使用的prompt', prompt)
  // console.log('wswTest: 关联的角色是', relatedCharactor)
  // console.log('wswTest: 当前收集到的角色', charactors)
  // console.log('wswTest: 是否图生图', isI2i)
  // console.log('wswTest: 关联图路径是', relatedCharactorObj?.image)
  // TODO:(wsw) 临时测试
  // const _path = path.join(outputPath, `1.png`)
  // everyUpdate({
  //   type,
  //   sIndex,
  //   image: _path,
  //   tags: prompt?.split(',').filter((txt) => txt) || []
  // })
  // console.log('wswTest: 画图成功', _path)
  // return Promise.resolve({ data: _path, code: 1 })

  return axios
    .post(api, {
      ...drawConfig,
      prompt: `${prompt},${positivePrompt}`
    })
    .then((res) => {
      const imgBase64 = res?.data?.images?.[0] || ''
      if (imgBase64) {
        const _path = path.join(outputPath, `${sIndex}.png`)
        fs.writeFileSync(_path, Buffer.from(imgBase64, 'base64'))
        everyUpdate({
          type,
          sIndex,
          image: _path,
          tags: prompt?.split(',').filter((txt) => txt) || []
        })
        console.log('wswTest: 画图成功', _path)
        return { data: _path, code: 1 }
      }
      console.log('wswTest未能成功生图: ', res)
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
      console.log('wswTest: 绘图失败，错误信息=>', e)
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
 * 处理文本，获取绘图任务
 */
async function processTextToImgs(text, parseTextFinish, everyUpdate) {
  const { charactors: rawCharactors = [], sentences: rawSentences = [] } =
    (await getCharactorsSentencesFromText(text)) || []
  if (!rawCharactors.length) {
    console.log('[processTextToImgs]解析角色错误，未解析出角色')
  }
  charactors = {}
  const charactorsTask = []
  const sentencesTask = []
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
    console.log('wswTest: 添加句子任务', charactors, charactor)
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
  })

  // step2: 依次处理人物队列和句子队列中的绘图任务
  const taskCurrency = Promise.resolve()
  const allTask = [...charactorsTask, ...sentencesTask]
  allTask.reduce((task, taskInfo) => {
    return task.then(() => {
      console.log('wswTest: 开始任务', taskInfo.type, taskInfo.tags.join(','))
      if (taskInfo.type === 'charactor') {
        return drawImageByPrompts(taskInfo).then(({ data: imgPath }) => {
          // console.log('wswTest: 开始添加角色', taskInfo)
          charactors[taskInfo.name] = { image: imgPath, prompt: taskInfo.prompt }
          // console.log('wswTest: 添加完毕', charactors)
        })
      }
      return drawImageByPrompts(taskInfo)
    })
  }, taskCurrency)

  // taskCurrency
  //   .then(() => {
  //     console.log('wswTest: ', '任务都结束了？？？？？？？？？？？')
  //   })
  //   .then(() => parseTextFinish())
  //   .catch((e) => {
  //     console.log('[processTextToImgs]error', e?.message || '')
  //   })
}

export { processTextToImgs, drawImageByPrompts }
