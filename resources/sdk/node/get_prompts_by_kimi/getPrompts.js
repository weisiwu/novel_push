import fs from 'fs'
import axios from 'axios'
import { kimiBaseUrl, kimiChatApi, kimiToken } from '../../../BaoganAiConfig.json'
import initPrompt from './init_prompt?asset&asarUnpack'
import getSentencesPrompt from './get_sentences_prompt?asset&asarUnpack'
import getCharactorsPrompt from './get_charactors_prompt?asset&asarUnpack'

const init_prompt = fs.readFileSync(initPrompt, { encoding: 'utf8' })
const get_sentences_prompt = fs.readFileSync(getSentencesPrompt, { encoding: 'utf8' })
const get_charactors_prompt = fs.readFileSync(getCharactorsPrompt, {
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
      console.log('wswTest: 获取句子遭遇到了什么问题》？？、', res?.data?.choices?.[0])
      const respJSONStr = choices?.[0]?.message?.content
        ?.replace?.('```json', '')
        ?.replace?.('```', '')
        ?.replace?.(new RegExp('\\n', 'g'), '')
      let respJSON = {}
      try {
        respJSON = JSON.parse(respJSONStr)
      } catch (e) {
        console.log('wswTest: 获取句子相关信息失败', e)
      }
      return respJSON
    })
    .catch((e) => {
      console.log('[getPromptsFromSentence]error', e)
      return ''
    })
}

export { getSentencesFromText, getCharactorsFromText }
