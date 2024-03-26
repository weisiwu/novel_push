// import { charactors } from './scene_prompt_demo.json'
const { charactors, scene } = require('./scene_prompt_demo.json')
const {
  sdBaseUrl,
  t2iApi,
  positivePrompt,
  negativePrompt
} = require('../../../BaoganAiConfig.json')
const axios = require('axios')
const baseDrawConfig = {
  negative_prompt: negativePrompt,
  batch_size: 1,
  steps: 25,
  cfg_scale: 7,
  width: 512,
  height: 512,
  sampler_index: 'DPM++ 3M SDE Exponential'
}

/**
 * 绘制人物图，并获取seed
 */
// function getCharactorSeed(draw_config = {}) {
//   Promise.all(
//     charactors.map?.((charactor = {}) => {
//       const charactorProperties = Object.keys(charactor) || []
//       // 角色提示词，统一增强1.2倍
//       const charactorPrompt = charactorProperties
//         .map((property) => {
//           const propertyDesc = charactor[property] || ''
//           const validPrompts = propertyDesc
//             .split(',')
//             // .map((prompt) => `((${prompt}))`)
//             .map((prompt) => `${prompt}`)
//             .join(',')
//           return property !== 'name' ? validPrompts : ''
//         })
//         .join(',')
//       console.log(charactorPrompt)
//       // return axios
//       //   .post(`${sdBaseUrl}${t2iApi}`, {
//       //     ...baseDrawConfig,
//       //     ...draw_config,
//       //     prompt: `${charactorPrompt},${positivePrompt}`
//       //   })
//       //   .then((res) => {
//       //     const resJson = res.json()
//       //     console.log('wswTest: resJson', resJson)
//       //   })
//     })
//   )
// }

/**
 * 绘制场景图
 */
function drawScene() {
  const charactorPrompts = {}
  charactors.forEach?.((charactor = {}) => {
    const charactorProperties = Object.keys(charactor) || []
    // 角色提示词，统一增强1.2倍
    const charactorPrompt = charactorProperties
      .map((property) => {
        const propertyDesc = charactor[property] || ''
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
  console.log(scenePromptsStr.split(sceneSperator))
  return scenePromptsStr.split(sceneSperator)
}

// getCharactorSeed()
// module.exports = getCharactorSeed
drawScene()
