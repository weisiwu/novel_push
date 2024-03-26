import fs from 'fs'
import axios from 'axios'
import { kimiBaseUrl, kimiChatApi, kimiToken } from '../../../BaoganAiConfig.json'

const init_prompt = fs.readFileSync('./init_prompt', { encoding: 'utf8' })
const get_scene_prompt = fs.readFileSync('./get_scene_prompt', { encoding: 'utf8' })

function getPromptsFromText(text) {
  return axios
    .post(
      `${kimiBaseUrl}${kimiChatApi}`,
      {
        model: 'moonshot-v1-128k',
        // max_tokens: 32000,
        messages: [
          { role: 'user', content: '请后续所有回复，均使用英文，不出现中文！！！' },
          { role: 'user', content: init_prompt },
          { role: 'user', content: text },
          { role: 'user', content: get_scene_prompt }
        ],
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
      console.log(res?.data?.choices)
      const respJSONStr = res?.data?.choices?.[0]?.message?.content
        ?.replace?.('```json', '')
        ?.replace?.('```', '')
      let respJSON = {}
      try {
        respJSON = JSON.parse(respJSONStr)
      } catch (e) {
        console.log('wswTest: 从kimi获取prompts失败', e)
      }
      console.log('wswTest: 获取的prompts', respJSON)
      return respJSON
    })
}

export default getPromptsFromText
export { getPromptsFromText }
