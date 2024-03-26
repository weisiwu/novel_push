import fs from 'fs'
import path from 'path'
import {
  sdBaseUrl,
  t2iApi,
  positivePrompt,
  negativePrompt,
  outputPath
} from '../../../BaoganAiConfig.json'
import getPromptsFromText from '../get_prompts_by_kimi/get_prompts'
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
const fullT2iApi = `${sdBaseUrl.replace(/\/$/, '')}${t2iApi}`

function drawSceneByPrompts(promptsConfig = {}) {
  const { charactors, scene } = promptsConfig
  const charactorPrompts = {}
  charactors.forEach?.((charactor = {}) => {
    const charactorProperties = Object.keys(charactor) || []
    // 角色提示词，统一增强1.2倍
    const charactorPrompt = charactorProperties
      .map((property) => {
        const propertyDesc = charactor[property] || ''
        const validPrompts = propertyDesc
          .replace('.', '')
          .split(',')
          // .map((prompt) => `((${prompt}))`)
          .map((prompt) => `${prompt}`)
          .join(',')
        return property !== 'name' ? validPrompts : ''
      })
      .join(',')
      .replace(' and ', ',')
      .replace(' And ', ',')
      .replace(' AND ', ',')
    charactorPrompts[charactor.name] = charactorPrompt
  })
  const scenePrompts = []
  const sceneSperator = '_|||_'
  scene.forEach?.((sceneSample = {}) => {
    const sceneSampleProperties = Object.keys(sceneSample) || []
    // 角色提示词，统一增强1.2倍
    const sceneSamplePrompt = sceneSampleProperties
      .map((property) => {
        const propertyDesc = sceneSample[property.trim()] || ''
        const validPrompts = propertyDesc
          .split(',')
          // .map((prompt) => `((${prompt}))`)
          .map((prompt) => `${prompt}`)
          .join(',')
        return property !== 'name' ? validPrompts : ''
      })
      .join(',')
      .replace(' and ', ',')
      .replace(' And ', ',')
      .replace(' AND ', ',')
    scenePrompts.push(sceneSamplePrompt)
  })

  let scenePromptsStr = scenePrompts.join(sceneSperator)
  for (let name in charactorPrompts) {
    // 替换两次角色name，第一次，将角色的prompt注入，第二次，删除所有name
    scenePromptsStr = scenePromptsStr
      .replace(name, charactorPrompts[name])
      .replace(new RegExp(name, 'g'), charactorPrompts[name])
  }
  const finalPrompts = scenePromptsStr.split(sceneSperator)
  const totalLen = finalPrompts.length || 0
  const resultImgs = []

  return finalPrompts.reduce((sum, currentPrompt, index) => {
    return sum.then(() => {
      return axios
        .post(fullT2iApi, {
          ...baseDrawConfig,
          prompt: `${currentPrompt},${positivePrompt}`
        })
        .then((res) => {
          console.log('wswTest: resJson', res)
          const imgBase64 = res?.data?.images?.[0] || ''
          if (imgBase64) {
            const _path = path.join(outputPath, `${index}.png`)
            fs.writeFileSync(_path, Buffer.from(imgBase64, 'base64'))
            resultImgs.push(_path)
          }
          if (index === totalLen - 1) {
            return resultImgs
          }
        })
    })
  }, Promise.resolve())
}

function drawScene(text, event) {
  return getPromptsFromText(text).then((promptsConfig) => {
    if (event?.sender?.send) {
      event.sender.send?.('text-parse-finish')
    }
    return drawSceneByPrompts(promptsConfig)
  })
}

export default drawScene
export { drawSceneByPrompts }
