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
import { getSentencesFromText, getCharactorsFromText } from '../get_prompts_by_kimi/getPrompts'
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
const MAX_PER_MINUTE = 3
const WAIT_TIME = (60 * 1000) / MAX_PER_MINUTE
const fullT2iApi = `${sdBaseUrl.replace(/\/$/, '')}${t2iApi}`
const fullI2iApi = `${sdBaseUrl.replace(/\/$/, '')}${i2iApi}`

// TODO:(wsw) 这个里面自己保证，一定会绘图成功，不成功就重绘
function drawImageByPrompts({
  prompt = '',
  sIndex = 0,
  relatedCharactor = [],
  everyDraw = () => {}
}) {
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
        everyDraw({
          img: _path,
          index: sIndex,
          tags: prompt?.split(',').filter((txt) => txt) || []
        })
        return { data: _path, code: 1 }
      }
      console.log('wswTest未能成功生图: ', res)
      return { error: '未能成功生图', code: 0 }
    })
    .catch((e) => {
      console.log('wswTest: 单词请求什么错误e', e)
      return { error: e?.message, code: 0 }
    })
}

/**
 * 对返回的prompt进行加工
 */
function formatPrompt(rawStr = '') {
  return (rawStr || '').toString()
  // .replace('a ', '')
  // .replace(' a ', '')
  // .replace(' with ', ',')
  // .replace(' and ', ',')
  // .replace(' And ', ',')
  // .replace(' AND ', ',')
}

/**
 * 这里做任务调度
 * 1、首先对文本进行角色抽取
 * 2、对文本进行分句
 * 3、对分句依次反推出提示词
 * 4、调用分句提示生图
 * 需要注意的是，kimi会对速率有限制
 * 所以如果一共20个句子，每分钟最多3次请求，同时并发只有一个请求
 */
async function processTextToImgs(text, parseTextFinish, everyDraw) {
  const { charactors: rawCharactors = [] } = (await getCharactorsFromText(text)) || []
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
        .join(',')
    )
    console.log(`wswTest: 角色${_name}的prompt`, charactorPrompt)
    const { data } = await drawImageByPrompts({ prompt: charactorPrompt, sIndex: _name })
    charactors[_name] = {
      image: data,
      prompt: charactorPrompt
    }
  })

  console.log('wswTest: ', '角色初始图生成完毕')
  const { sentences: rawSentences = [] } = (await getSentencesFromText(text)) || []

  console.log('wswTest:获取文章中句子相关信息', rawSentences)
  console.log('wswTest: ', '获取分局完毕')
  // 依次对句子进行处理，获取绘图任务。同时请求控制
  return rawSentences
    .reduce(async (sum, rawSentence, sIndex) => {
      return sum.then(async () => {
        let retryTimes = 0
        const { chinese, english: rawEnglish, charactor: rawCharactor } = rawSentence || {}
        const charactor = rawCharactor.replace?.(/\s/g, '')?.toLowerCase?.()
        const english = rawEnglish instanceof Array ? rawEnglish.join(',') : rawEnglish || ''
        const sentencePrompt = formatPrompt([positivePrompt, english].join(','))
        const relatedCharactor = []
        if (charactors[charactor]) {
          relatedCharactor.push(charactors[charactor])
        }
        console.log('wswTest: 句子原文', rawSentence, '句子的提示词: ', sentencePrompt)
        console.log('wswTest: 和句子相关的角色', charactors[0])

        let drawResult = await drawImageByPrompts({
          prompt: sentencePrompt,
          relatedCharactor,
          sIndex,
          everyDraw
        })
        // 失败重试3次
        while (drawResult?.code === 0 && retryTimes < MAX_RETRY_TIMES) {
          drawResult = await drawImageByPrompts({
            prompt: sentencePrompt,
            relatedCharactor,
            sIndex,
            everyDraw
          })
          retryTimes++
        }
        console.log('wswTest: 获取句子的绘图结果', sIndex, drawResult?.code)
        // 防止超过限制
        return new Promise((resolve) => {
          setTimeout(() => resolve(), WAIT_TIME)
        })
      })
    }, Promise.resolve())
    .then(() => parseTextFinish())
    .catch((e) => {
      console.log('[processTextToImgs]error', e?.message || '')
    })
}

export { processTextToImgs }
