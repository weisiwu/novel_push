import sdk from 'microsoft-cognitiveservices-speech-sdk'
import {
  azureTTSSecret,
  azureTTSArea,
  audioOutput,
  azureTTSVoice
} from '../../../BaoganAiConfig.json'

/**
 * azure文档
 * https://learn.microsoft.com/en-us/azure/ai-services/speech-service/get-started-text-to-speech?tabs=macos%2Cterminal&pivots=programming-language-javascript
 * 支持的声音
 * https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts#prebuilt-neural-voices
 */

function converTextToSpeech(text = '', cb = () => {}) {
  const audioFile = audioOutput
  const speechConfig = sdk.SpeechConfig.fromSubscription(azureTTSSecret, azureTTSArea)
  const audioConfig = sdk.AudioConfig.fromAudioFileOutput(audioFile)
  speechConfig.speechSynthesisVoiceName = azureTTSVoice
  let synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig)

  synthesizer.speakTextAsync(
    text,
    function (result) {
      if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
        console.log('配音生成完毕.')
        cb()
      } else {
        console.error(
          'Speech synthesis canceled, ' +
            result.errorDetails +
            '\nDid you set the speech resource key and region values?'
        )
      }
      synthesizer.close()
      synthesizer = null
    },
    (err) => {
      console.error('生成语音报错', err)
      synthesizer.close()
      synthesizer = null
    }
  )
}

export { converTextToSpeech }
