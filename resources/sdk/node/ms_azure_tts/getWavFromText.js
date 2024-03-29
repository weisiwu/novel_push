import fs from 'fs'
import rimraf from 'rimraf'
import { join, resolve } from 'path'
import sdk from 'microsoft-cognitiveservices-speech-sdk'
import {
  azureTTSSecret,
  azureTTSArea,
  outputPath,
  audioOutputFolder,
  azureTTSVoice
} from '../../../BaoganAiConfig.json'

/**
 * azure文档
 * https://learn.microsoft.com/en-us/azure/ai-services/speech-service/get-started-text-to-speech?tabs=macos%2Cterminal&pivots=programming-language-javascript
 * 支持的声音
 * https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts#prebuilt-neural-voices
 */

function converTextToSpeech(text = '', saveName = '', cb = () => {}) {
  // console.log('wswTest: 保存音频的路径', outputPath, audioOutputFolder, saveName)
  const audioSaveFolder = resolve(join(outputPath, audioOutputFolder))
  if (!fs.existsSync(audioSaveFolder)) {
    fs.mkdirSync(audioSaveFolder, { recursive: true })
  } else {
    rimraf.sync(`${audioOutputFolder}/*`)
  }
  const audioFile = resolve(join(audioSaveFolder, saveName))
  const speechConfig = sdk.SpeechConfig.fromSubscription(azureTTSSecret, azureTTSArea)
  const audioConfig = sdk.AudioConfig.fromAudioFileOutput(audioFile)
  speechConfig.speechSynthesisVoiceName = azureTTSVoice
  let synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig)

  const handleSuccess = (result) => {
    // console.log('wswTest: 配音任务结果', result)
    if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
      console.log('配音生成完毕.')
      console.log('wswTest: audioFile', audioFile)
      cb(audioFile)
      console.log('wswTest: audioFile', 'fisislsl')
    } else {
      console.error(
        'Speech synthesis canceled, ' +
          result.errorDetails +
          '\nDid you set the speech resource key and region values?'
      )
    }
    synthesizer.close()
    synthesizer = null
  }

  const handleError = (err) => {
    console.error('生成语音报错', err)
    synthesizer.close()
    synthesizer = null
  }

  return new Promise((resolve, reject) => {
    synthesizer.speakTextAsync(
      text,
      (result) => {
        handleSuccess(result)
        resolve()
      },
      (err) => {
        handleError(err)
        reject()
      }
    )
  })
}

export { converTextToSpeech }
