import fs from 'fs'
import axios from 'axios'
import { kimiBaseUrl, kimiChatApi, kimiToken } from '../../../BaoganAiConfig.json'
import initPrompt from './init_prompt?asset&asarUnpack'
import getSentencePrompt from './get_sentence_prompt?asset&asarUnpack'
import getCharactorsSentencesPrompt from './get_charactors_sentences_prompt?asset&asarUnpack'

const init_prompt = fs.readFileSync(initPrompt, { encoding: 'utf8' })
const get_sentence_prompt = fs.readFileSync(getSentencePrompt, { encoding: 'utf8' })
const get_charactors_sentences_prompt = fs.readFileSync(getCharactorsSentencesPrompt, {
  encoding: 'utf8'
})

const conversions = [{ role: 'user', content: init_prompt }]

/**
 * 对传入的文章，分析角色和分句
 */
function getCharactorsSentencesFromText(text) {
  conversions.push({ role: 'user', content: text })
  conversions.push({ role: 'user', content: get_charactors_sentences_prompt })
  return axios
    .post(
      `${kimiBaseUrl}${kimiChatApi}`,
      {
        model: 'moonshot-v1-128k',
        messages: conversions,
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
      console.log('wswTest: 获取的角色和句子返回值是什么', respJSONStr)
      let respJSON = {}
      try {
        respJSON = JSON.parse(respJSONStr)
      } catch (e) {
        console.log('wswTest: 从kimi获取prompts失败', e)
      }
      return respJSON
    })
    .catch((e) => {
      console.log('[getCharactorsSentencesFromText]error', e)
      return {}
    })
}

/**
 * 对传入的句子，生成关键词
 */
function getPromptsFromSentence(text) {
  conversions.push({ role: 'user', content: get_sentence_prompt })
  conversions.push({ role: 'user', content: text })
  return axios
    .post(
      `${kimiBaseUrl}${kimiChatApi}`,
      {
        model: 'moonshot-v1-128k',
        messages: conversions,
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
      const respStr = choices?.[0]?.message?.content || ''
      console.log('wswTest:获取句子对应的提示词', respStr)
      return respStr
    })
    .catch((e) => {
      console.log('[getPromptsFromSentence]error', e)
      return {}
    })
}

export default getPromptsFromSentence
export { getPromptsFromSentence, getCharactorsSentencesFromText }
