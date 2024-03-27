import fs from 'fs'
import path from 'path'
import { throttle } from 'lodash'
import {
  sdBaseUrl,
  t2iApi,
  positivePrompt,
  negativePrompt,
  outputPath
} from '../../../BaoganAiConfig.json'
import {
  getPromptsFromSentence,
  getCharactorsSentencesFromText
} from '../get_prompts_by_kimi/getPrompts'
import axios from 'axios'
const baseDrawConfig = {
  negative_prompt: negativePrompt,
  batch_size: 1,
  steps: 25,
  cfg_scale: 7,
  width: 512,
  height: 512,
  sampler_index: 'DPM++ 3M SDE Exponential'
}
const MAX_RETRY_TIMES = 3
const MAX_PER_MINUTE = 3
const WAIT_TIME = (60 * 1000) / MAX_PER_MINUTE
const fullT2iApi = `${sdBaseUrl.replace(/\/$/, '')}${t2iApi}`

function drawSceneByPrompts(sentencePrompt = '', sIndex = 0, everyDraw = () => {}) {
  console.log('wswTest: 最终绘图使用的prompt', sentencePrompt)
  return axios
    .post(fullT2iApi, {
      ...baseDrawConfig,
      prompt: `${sentencePrompt},${positivePrompt}`
    })
    .then((res) => {
      const imgBase64 = res?.data?.images?.[0] || ''
      if (imgBase64) {
        const _path = path.join(outputPath, `${sIndex}.png`)
        fs.writeFileSync(_path, Buffer.from(imgBase64, 'base64'))
        everyDraw({
          img: _path,
          index: sIndex,
          tags: sentencePrompt?.split(',').filter((txt) => txt) || []
        })
        return { data: _path, code: 1 }
      }
      console.log('wswTest未能成功生图: ', res)
      return { error: '未能成功生图', code: 0 }
    })
    .catch((e) => {
      // TODO:(wsw) 这里添加重试机制
      console.log('wswTest: 单词请求什么错误e', e)
      return { error: e?.message, code: 0 }
    })
}

/**
 * 对返回的prompt进行加工
 */
function formatPrompt(rawStr = '') {
  return String(rawStr || '')
    .replace(' and ', ',')
    .replace(' And ', ',')
    .replace(' AND ', ',')
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
  const { charactors: rawCharactors = [], sentences: rawSentences = [] } =
    (await getCharactorsSentencesFromText(text)) || []
  if (!rawCharactors.length) {
    console.log('[processTextToImgs]解析角色错误，未解析出角色')
  }
  // 处理角色提示词
  const charactors = []
  for (let charactor in charactors) {
    const _obj = {}
    let prompt = ''
    for (let property in charactor) {
      _obj[property] = formatPrompt(charactor[property])
      property !== 'name' && (prompt += _obj[property])
    }
    _obj.prompt = prompt
    charactors.push(_obj)
  }
  // 依次对句子进行处理，获取绘图任务。同时请求控制
  return rawSentences
    .reduce(async (sum, rawSentence, sIndex) => {
      return sum.then(async () => {
        const rawSentencePrompt = (await getPromptsFromSentence(rawSentence)) || ''
        console.log('wswTest: 获取句子的提示词', sIndex, rawSentence, rawSentencePrompt)
        let retryTimes = 0
        let scenePromptsStr = formatPrompt(rawSentencePrompt)
        // 替换两次角色name，第一次，将角色的prompt注入，第二次，删除所有name
        for (let charactor in charactors) {
          scenePromptsStr = scenePromptsStr
            .replace(charactor.name, charactor.prompt)
            .replace(new RegExp(name, 'g'), charactor.prompt)
        }
        let drawResult = await drawSceneByPrompts(scenePromptsStr, sIndex, everyDraw)
        // 失败重试3次
        while (drawResult?.code === 0 && retryTimes < MAX_RETRY_TIMES) {
          drawResult = await drawSceneByPrompts(formatPrompt(rawSentencePrompt), sIndex, everyDraw)
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
