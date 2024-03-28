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
      },
      {
        name: '紫霄龙皇',
        outfit: '紫金色的龙，龙鳞闪耀，龙角如同镶嵌了紫晶',
        face: '一双龙眸中射出威严的光芒',
        gender: '1boy',
        expression: '目光深邃',
        temperament: '威严',
        dress: '紫金战袍',
        ornament: '龙纹玉带',
        shoe: '',
        weapon: ''
      }
    ],
    sentences: [
      {
        chinese: '在古老的昆仑山脉之巅，巨大的云海翻腾，犹如海洋一般。',
        english:
          'On the summit of the ancient Kunlun Mountains, huge sea of clouds surges, like an ocean.',
        charactor: ''
      },
      {
        chinese: '仙气缭绕山峰，彩凤飞翔，霞光万道，瑞气千条。',
        english:
          'Immortal energy lingers around the peaks, colorful phoenixes fly, with myriad rays of rosy light and auspicious air.',
        charactor: ''
      },
      {
        chinese: '在这神秘莫测的地方，有一座玉石筑就的宫殿，名为“天穹仙宫”。',
        english:
          "In this mysterious and unpredictable place, there is a palace made of jade, called 'Sky Dome Immortal Palace'.",
        charactor: ''
      },
      {
        chinese: '宫殿内，一位青袍仙子正盘膝而坐，仙子名为灵瑶，是天穹仙宫的传人。',
        english:
          'Inside the palace, a fairy in a green robe is sitting cross-legged, the fairy is named Lingyao, the successor of Sky Dome Immortal Palace.',
        charactor: '灵瑶'
      },
      {
        chinese: '她闭目修炼，手中握着一颗莹白如玉的灵珠，珠中蕴含着磅礴的灵气。',
        english:
          'She is meditating with her eyes closed, holding a luminous jade-like spirit pearl, which contains immense spiritual energy.',
        charactor: '灵瑶'
      },
      {
        chinese: '时间仿若停滞，直到一声龙吟打破了静谧。',
        english: "Time seemed to stand still until a dragon's roar broke the tranquility.",
        charactor: ''
      },
      {
        chinese: '灵瑶睁开了眼，她的眼中闪烁着智慧光芒，如同深潭中的星辰。',
        english:
          'Lingyao opened her eyes, her eyes shimmered with wisdom, like stars in a deep pool.',
        charactor: '灵瑶'
      },
      {
        chinese: '那是一条紫金色的龙，龙鳞闪耀，龙角如同镶嵌了紫晶，一双龙眸中射出威严的光芒。',
        english:
          'It was a dragon with purple-gold scales shining, horns like embedded amethyst, and a pair of dragon eyes emitting a majestic light.',
        charactor: '紫霄龙皇'
      },
      {
        chinese: '紫霄龙皇落在仙宫前的广阔平台上，化为一位威严的中年男子。',
        english:
          'The Zi Xiao Dragon Emperor landed on the vast platform in front of the immortal palace, transforming into a dignified middle-aged man.',
        charactor: '紫霄龙皇'
      },
      {
        chinese: '“灵瑶仙子，此次我前来，正是为了告知你一个重大的消息。”',
        english: 'Fairy Lingyao, I have come this time to inform you of a significant message.',
        charactor: '紫霄龙皇'
      },
      {
        chinese: '“天星宗的星辰大阵即将开启，这是千年难遇的修炼良机。”',
        english:
          'The Star Array of the Tianxing Sect is about to be activated, a rare opportunity for cultivation that comes once in a millennium.',
        charactor: '紫霄龙皇'
      },
      {
        chinese: '“既然如此，你便准备吧。星辰大阵开启在即，我们没有太多时间。”',
        english:
          "In that case, prepare yourself. The Star Array is about to open, and we don't have much time left.",
        charactor: '紫霄龙皇'
      },
      {
        chinese: '灵瑶整理好自己的仙衣，转身进入宫殿深处，准备着即将到来的挑战。',
        english:
          'Lingyao tidied her fairy clothes and turned to enter the depths of the palace, preparing for the upcoming challenge.',
        charactor: '灵瑶'
      }
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
