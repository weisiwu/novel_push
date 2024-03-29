import fs from 'fs'
import axios from 'axios'
import { kimiBaseUrl, kimiChatApi, kimiToken } from '../../../BaoganAiConfig.json'
import initPrompt from './init_prompt?asset&asarUnpack'
import getSentencesPrompt from './get_sentences_prompt?asset&asarUnpack'
import getCharactorsPrompt from './get_charactors_prompt?asset&asarUnpack'
import getCharactorsSentencesPrompt from './get_charactors_sentences_prompt?asset&asarUnpack'

/**
 * TODO
 * getCharactorsFromText 函数请求完毕需要 13.5-17秒
 * getSentencesFromText 函数请求完毕需要 12-15秒
 */
const init_prompt = fs.readFileSync(initPrompt, { encoding: 'utf8' })
const get_sentences_prompt = fs.readFileSync(getSentencesPrompt, { encoding: 'utf8' })
const get_charactors_prompt = fs.readFileSync(getCharactorsPrompt, {
  encoding: 'utf8'
})
const get_charactors_sentences_prompt = fs.readFileSync(getCharactorsSentencesPrompt, {
  encoding: 'utf8'
})

const conversions = [{ role: 'user', content: init_prompt }]

/**
 * 对传入的文章，分析角色
 */
function getCharactorsFromText(text) {
  conversions.push({ role: 'user', content: text })
  conversions.push({ role: 'user', content: get_charactors_prompt })
  return axios
    .post(
      `${kimiBaseUrl}${kimiChatApi}`,
      {
        model: 'moonshot-v1-128k',
        messages: conversions,
        max_tokens: 1024 * 50,
        temperature: 0.3
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + kimiToken
        }
      }
    )
    .then((res) => {
      const { choices } = res?.data || {}
      const respJSONStr = choices?.[0]?.message?.content
        ?.replace?.('```json', '')
        ?.replace?.('```', '')
      let respJSON = {}
      try {
        respJSON = JSON.parse(respJSONStr)
      } catch (e) {
        console.log('wswTest: 分析角色失败', e)
      }
      return respJSON
    })
    .catch((e) => {
      console.log('[getCharactorsSentencesFromText]error', e)
      return {}
    })
}

/**
 * 对传入的文章，分出句子
 */
function getSentencesFromText() {
  conversions.push({ role: 'user', content: get_sentences_prompt })
  return axios
    .post(
      `${kimiBaseUrl}${kimiChatApi}`,
      {
        model: 'moonshot-v1-128k',
        messages: conversions,
        max_tokens: 1024 * 50,
        temperature: 0.3
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + kimiToken
        }
      }
    )
    .then((res) => {
      const { choices } = res?.data || {}
      const respJSONStr = choices?.[0]?.message?.content
        ?.replace?.('```json', '')
        ?.replace?.('```', '')
        ?.replace?.(new RegExp('\\n', 'g'), '')
      let respJSON = {}
      try {
        respJSON = JSON.parse(respJSONStr)
      } catch (e) {
        console.log('wswTest: 获取分句失败', e)
      }
      return respJSON
    })
    .catch((e) => {
      console.log('[getPromptsFromSentence]error', e)
      return ''
    })
}

/**
 * 对传入的文章，分出句子和角色
 */
function getCharactorsSentencesFromText(text) {
  // TODO:(wsw) 临时测试,直接返回结果
  return {
    charactors: [
      {
        name: '灵瑶',
        outfit: '青袍',
        face: '眼中闪烁着智慧光芒，如同深潭中的星辰',
        gender: '1girl',
        expression: '淡然一笑',
        temperament: '坚毅',
        dress: '仙衣',
        ornament: '莹白如玉的灵珠',
        shoe: '',
        weapon: ''
      }
    ],
    sentences: [
      {
        chinese: '在古老的昆仑山脉之巅，巨大的云海翻腾，犹如海洋一般。',
        english:
          'On the summit of the ancient Kunlun Mountains, huge sea of clouds surges, like an ocean.',
        charactor: '灵瑶'
      }
      // {
      //   chinese: '仙气缭绕山峰，彩凤飞翔，霞光万道，瑞气千条。',
      //   english:
      //     'Immortal energy lingers around the peaks, colorful phoenixes fly, with myriad rays of rosy light and auspicious air.',
      //   charactor: ''
      // },
      // {
      //   chinese: '在这神秘莫测的地方，有一座玉石筑就的宫殿，名为“天穹仙宫”。',
      //   english:
      //     "In this mysterious and unpredictable place, there is a palace made of jade, called 'Sky Dome Immortal Palace'.",
      //   charactor: ''
      // },
      // {
      //   chinese: '宫殿内，一位青袍仙子正盘膝而坐，仙子名为灵瑶，是天穹仙宫的传人。',
      //   english:
      //     'Inside the palace, a fairy in a green robe is sitting cross-legged, the fairy is named Lingyao, the successor of Sky Dome Immortal Palace.',
      //   charactor: '灵瑶'
      // }
    ]
  }

  conversions.push({ role: 'user', content: text })
  conversions.push({ role: 'user', content: get_charactors_sentences_prompt })
  return axios
    .post(
      `${kimiBaseUrl}${kimiChatApi}`,
      {
        model: 'moonshot-v1-128k',
        messages: conversions,
        max_tokens: 1024 * 50,
        temperature: 0.3
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + kimiToken
        }
      }
    )
    .then((res) => {
      const { choices } = res?.data || {}
      console.log('wswTest: 合并分析的结果', res?.data)
      const respJSONStr = choices?.[0]?.message?.content
        ?.replace?.('```json', '')
        ?.replace?.('```', '')
      let respJSON = {}
      try {
        respJSON = JSON.parse(respJSONStr)
      } catch (e) {
        console.log('wswTest: 分析角色、句子失败', e)
      }
      console.log('wswTest: respJSON,获取实则打磨', respJSON)
      return respJSON
    })
    .catch((e) => {
      console.log('wswTest: 合并分析文章失败', e)
      console.log('[getCharactorsSentencesFromText]error', e)
      return {}
    })
}

export { getSentencesFromText, getCharactorsFromText, getCharactorsSentencesFromText }
