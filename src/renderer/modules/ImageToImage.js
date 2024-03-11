import axios from 'axios'
import { join } from 'path'
import { readFileSync, writeFileSync } from 'fs'
import { videoFramesOutputPath as videoFramesPath, negativePrompt } from '../src/config.js'
import config from '../src/BaoganAiConfig.json'

// 调用阿里云服务
const ImageToImageByAliyun = ({ event, params } = {}) => {
  const { init_images, size, index: imgindex } = params || {}

  console.log('wswTest:12 ', size.height || config.HDImageWidth)
  console.log('wswTest: 2', size.width || config.HDImageWidth)
  return axios
    .post(`${config.baseUrl}${config.i2iApi}`, {
      prompt: '4k,hd,',
      init_images: [
        'data:image/jpeg;base64,' + Buffer.from(readFileSync(init_images)).toString('base64')
      ], // 转换成base64
      negative_prompt: negativePrompt,
      styles: ['Anime'],
      batch_size: 1,
      n_iter: 1,
      steps: 25,
      cfg_scale: 7,
      width: size.width || config.HDImageWidth,
      height: size.height || config.HDImageWidth,
      denoising_strength: 0.5,
      sampler_index: 'DPM++ 3M SDE Exponential',
      include_init_images: true
    })
    .then((res) => {
      const newImg = res?.data?.images?.[0] || ''
      const base64Image = newImg.replace(/^data:image\/\w+;base64,/, '')
      // 创建Buffer对象
      const buffer = Buffer.from(base64Image, 'base64')
      writeFileSync(join(videoFramesPath, `${imgindex}.jpg`), buffer)
      event.sender.send('image-to-image-complete', {
        newImg: join(videoFramesPath, `${imgindex}.jpg`),
        index: imgindex,
        videoFramesPath
      })
    })
    .catch((e) => {
      console.log(`【error】ImageToImage =>`, e)
    })
}

export default ImageToImageByAliyun
