import fs, { readFileSync } from 'fs'
import path from 'path'
import { throttle } from 'lodash'
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

function drawImageByPrompts({
  type = 'sentence',
  prompt = '',
  sIndex = 0,
  relatedCharactor = [],
  everyUpdate = () => {}
}) {
  let retryTimes = 0
  console.log('wswTest: 最终绘图使用的prompt', prompt)
  const isI2i = relatedCharactor.length >= 1
  const api = isI2i ? fullI2iApi : fullT2iApi
  const drawConfig = isI2i
    ? {
        ...baseDrawConfig,
        cfg_scale: 12,
        denoising_strength: 0.5,
        init_images: [readFileSync(relatedCharactor[0]?.image, { encoding: 'base64' })]
      }
    : { ...baseDrawConfig }

  console.log('wswTest: 是否为i2i', isI2i)
  console.log('wswTest: 关联图路径是', relatedCharactor[0]?.image)
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
          image: _path,
          index: sIndex,
          // TODO:(wsw) 临时
          name: 'test1',
          // name: _name,
          tags: prompt?.split(',').filter((txt) => txt) || []
        })
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
  const charactors = {}
  // 处理角色提示词
  rawCharactors.forEach(async (charactor) => {
    const _name = charactor.name?.replace?.(/\s/g, '')?.toLowerCase?.()
    delete charactor.name
    const charactorPrompt = formatPrompt(
      Object.values(charactor)
        .map((p) => formatPrompt(p))
        .filter((p) => p)
        .join(',')
    )
    everyUpdate({
      type: 'charactor',
      name: _name,
      tags: charactorPrompt.split(',') || []
    })
    charactors[_name] = charactorPrompt
    const { data } = await drawImageByPrompts({
      type: 'charactor',
      prompt: charactorPrompt,
      sIndex: _name
    })
    everyUpdate({
      type: 'charactor',
      name: _name,
      tags: charactorPrompt.split(',') || [],
      image: data
    })
  })

  // 依次对句子进行处理，获取绘图任务。同时请求控制
  return rawSentences
    .reduce(async (sum, rawSentence, sIndex) => {
      return sum.then(async () => {
        const { chinese, english: rawEnglish, charactor: rawCharactor } = rawSentence || {}
        const charactor = rawCharactor.replace?.(/\s/g, '')?.toLowerCase?.()
        const english = rawEnglish instanceof Array ? rawEnglish.join(',') : rawEnglish || ''
        const sentencePrompt = formatPrompt([positivePrompt, english].join(','))
        const relatedCharactor = charactors[charactor]
        // console.log('wswTest: 句子原文', chinese, '句子的提示词: ', sentencePrompt)
        console.log('wswTest: 和句子相关的角色relatedCharactor是格式him', relatedCharactor)
        everyUpdate({
          type: 'sentence',
          tags: sentencePrompt.split(',') || [],
          index: sIndex,
          text: chinese,
          relatedCharactor
        })
        return sentencePrompt
      })
    }, Promise.resolve())
    .then(() => parseTextFinish())
    .catch((e) => {
      console.log('[processTextToImgs]error', e?.message || '')
    })
}

export { processTextToImgs, drawImageByPrompts }
