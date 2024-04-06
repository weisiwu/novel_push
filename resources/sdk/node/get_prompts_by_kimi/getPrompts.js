import axios from 'axios'
import { rimrafSync } from 'rimraf'
import { join, resolve } from 'path'
import fs, { readFileSync } from 'fs'
import {
  kimiBaseUrl,
  kimiChatApi,
  kimiToken,
  imageOutputFolder,
  audioOutputFolder
} from '../../../BaoganAiConfig.json'
import initPrompt from './init_prompt?asset&asarUnpack'
import introToSdPrompt from './intro_to_sd_prompt?asset&asarUnpack'
import getCharactorsSentencesStreamPrompt from './get_charactors_sentences_stream_prompt?asset&asarUnpack'
import configPath from '../../../BaoganAiConfig.json?commonjs-external&asset&asarUnpack'

/**
 * getCharactorsFromText 函数请求完毕需要 13.5-17秒
 * getSentencesFromText 函数请求完毕需要 12-15秒
 */
const charactorReg = /\[charactor\](.*?)\[\/charactor\]/
const sentenceReg = /\[sentence\](.*?)\[\/sentence\]/
const init_prompt = fs.readFileSync(initPrompt, { encoding: 'utf8' })
const intro_to_sd_prompt = fs.readFileSync(introToSdPrompt, { encoding: 'utf8' })
const get_charactors_sentences_stream_prompt = fs.readFileSync(getCharactorsSentencesStreamPrompt, {
  encoding: 'utf8'
})

function readLocalConfig() {
  const initConfigBuffer = readFileSync(configPath)
  const initConfigString = initConfigBuffer.toString()
  let initConfig = {}
  try {
    initConfig = JSON.parse(initConfigString) || {}
  } catch (e) {
    initConfig = {}
  }
  return initConfig
}

const conversions = [
  { role: 'user', content: intro_to_sd_prompt },
  { role: 'user', content: init_prompt }
]

/**
 * 对传入的文章，分出句子和角色
 * 返回stream
 */
function getCharactorsSentencesFromTextStream(
  text,
  everyUpdate,
  finish,
  charactors,
  charactorsTask,
  sentencesTask,
  ttsTask
) {
  conversions.push({ role: 'user', content: text })
  conversions.push({ role: 'user', content: get_charactors_sentences_stream_prompt })
  axios
    .post(
      `${kimiBaseUrl}${kimiChatApi}`,
      {
        model: 'moonshot-v1-128k',
        messages: conversions,
        // max_tokens: 1024 * 50,
        max_tokens: 1024 * 100,
        temperature: 0.1,
        stream: true
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + kimiToken
        },
        responseType: 'stream'
      }
    )
    .then((res) => {
      const { data } = res || {}
      let info = ''
      const sentences = []
      data.on('data', (objBuffer) => {
        const objStr = objBuffer.toString().replace('\\n', '')
        if (objStr.includes('[DONE]')) {
          console.log('wswTest: done?', objStr)
          return
        }

        objStr
          .split('data: ')
          .filter((part) => part)
          .forEach((part) => {
            // console.log('wswTest: 每个待处理的part', part)
            try {
              info += JSON.parse(part)?.choices?.[0]?.delta?.content || ''
            } catch (e) {
              info += ''
            }
          })

        const matcheSentence = info.match(sentenceReg)
        if (matcheSentence?.length > 1) {
          const matcheText = matcheSentence[1] || ''
          const [raw, prompt, _charactor] = matcheText.split('|||') || []
          const charactor = String(_charactor || '').toLowerCase()
          if (raw) {
            sentences.push({
              chinese: raw,
              english: prompt,
              charactor
            })
            const sentenceInfo = {
              type: 'sentence',
              tags: prompt,
              prompt,
              sIndex: Math.max(sentences.length - 1, 0),
              text: raw,
              relatedCharactor: charactor
            }
            console.log('wswTest: 发现新场景，尝试对外沟通', everyUpdate)
            everyUpdate(sentenceInfo)
            sentencesTask.push({ ...sentenceInfo, everyUpdate }) // 加载句子任务
            ttsTask.push({ ...sentenceInfo, everyUpdate }) // 加载配音任务

            // 添加完毕后，去除已经匹配的文本
            info = info.replace(`[sentence]${matcheText}[/sentence]`, '')
          }
        }

        const matcheCharactor = info.match(charactorReg)
        if (matcheCharactor?.length > 1) {
          const matcheText = matcheCharactor[1] || ''
          const [_charactor, ..._prompt] = matcheText.split('|||') || []
          const charactor = String(_charactor).toLowerCase()
          const prompt = _prompt.join(',')
          if (charactor) {
            charactors[charactor] = { prompt, image: '' }
            // step1: 将已经获取的角色和句子文案同步到表格中
            const charactorInfo = {
              type: 'charactor',
              name: charactor,
              sIndex: Math.max(Object.keys(charactors).length - 1, 0),
              tags: prompt,
              prompt
            }
            everyUpdate(charactorInfo)
            charactorsTask.push({ ...charactorInfo, everyUpdate }) // 加载角色任务
            // 添加完毕后，去除已经匹配的文本
            info = info.replace(`[charactor]${matcheText}[/charactor]`, '')
          }
        }

        console.log('wswTest: 角色有', charactors)
        console.log('wswTest: 句子有', sentences)
      })
      // end是读取流的末尾，finish是写流的末尾
      data.on('end', (info) => {
        console.log('wswTest: 文本分析结束，结束信息是', info)
        if (!sentences.length) {
          everyUpdate({ error: 0, type: 'parse_text_error', message: 'need retry' })
          finish()
          return
        }
        finish()
      })
      data.on('error', (e) => {
        console.log('wswTest: 数据stream错误 ', e)
        everyUpdate({ error: 0, type: 'parse_text_error', message: 'need retry' })
        finish()
      })
    })
    .catch((e) => {
      console.log('wswTest: 数据异常', e)
      everyUpdate({ error: 0, type: 'parse_text_error', message: 'need retry' })
      finish()
    })

  // 创建文件和请求并行
  const { outputPath, srtOutputFolder } = readLocalConfig()
  const imageSaveFolder = resolve(join(outputPath, imageOutputFolder))
  if (!fs.existsSync(imageSaveFolder)) {
    fs.mkdirSync(imageSaveFolder, { recursive: true })
  } else {
    rimrafSync(`${imageSaveFolder}/*`, { glob: true })
  }
  const audioSaveFolder = resolve(join(outputPath, audioOutputFolder))
  if (!fs.existsSync(audioSaveFolder)) {
    fs.mkdirSync(audioSaveFolder, { recursive: true })
  } else {
    rimrafSync(`${audioSaveFolder}/*`, { glob: true })
  }
  const srtSaveFolder = resolve(join(outputPath, srtOutputFolder))
  if (!fs.existsSync(srtSaveFolder)) {
    fs.mkdirSync(srtSaveFolder, { recursive: true })
  } else {
    rimrafSync(`${srtSaveFolder}/*`, { glob: true })
  }
}

export { getCharactorsSentencesFromTextStream }
