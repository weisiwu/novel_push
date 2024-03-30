import { readFileSync } from 'fs'
import { join, resolve } from 'path'
import sdk from 'microsoft-cognitiveservices-speech-sdk'
import {
  azureTTSSecret,
  azureTTSArea,
  outputPath,
  audioOutputFolder
} from '../../../BaoganAiConfig.json'
import configPath from '../../../BaoganAiConfig.json?commonjs-external&asset&asarUnpack'

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

/**
 * azure文档
 * https://learn.microsoft.com/en-us/azure/ai-services/speech-service/get-started-text-to-speech?tabs=macos%2Cterminal&pivots=programming-language-javascript
 * 支持的声音
 * https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts#prebuilt-neural-voices
 */

function converTextToSpeech(text = '', saveName = '', cb = () => {}) {
  const { azureTTSVoice } = readLocalConfig()
  const audioSaveFolder = resolve(join(outputPath, audioOutputFolder))
  const audioFile = resolve(join(audioSaveFolder, saveName))
  const speechConfig = sdk.SpeechConfig.fromSubscription(azureTTSSecret, azureTTSArea)
  const audioConfig = sdk.AudioConfig.fromAudioFileOutput(audioFile)
  speechConfig.speechSynthesisVoiceName = azureTTSVoice
  let synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig)

  const handleSuccess = (result) => {
    if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
      cb(audioFile)
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
