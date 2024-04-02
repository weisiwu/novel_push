import { basename } from 'path'
/**
 * 接受句子(场景)表的数据
 * 返回的值包含
 * 1、需要合并为视频的图片列表
 * 2、更新后的srt文件
 * 3、需要合并为完整音频的音频片段名
 */
const update_srt_img_wav_from_table = (sentencesList = []) => {
  const selectedImgs = []
  const texts = [] // 用于生成srt和语音
  const wavs = []
  const durations = []
  sentencesList.forEach((sentence) => {
    const { image = '', text = '', wav = '', duration = 0 } = sentence || {}
    selectedImgs.push(basename(image).split('?')[0])
    texts.push(text)
    wavs.push(basename(wav))
    durations.push(duration)
  })
  console.log('wswTest: 更新后的图片列表是', selectedImgs)
  console.log('wswTest: 更新后的文案列表是', texts)
  console.log('wswTest: 更新后的音频列表是', wavs)
  console.log('wswTest: 更新后的音频时长是', durations)
  return [selectedImgs.join(','), JSON.stringify(texts), wavs.join(','), durations.join(',')]
}

export default update_srt_img_wav_from_table
