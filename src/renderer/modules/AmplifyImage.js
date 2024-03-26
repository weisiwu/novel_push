import axios from 'axios'
import { join } from 'path'
import { writeFileSync } from 'fs'
import config from '../../../resources/BaoganAiConfig.json'

// 图片高清重绘 - 单张
const AmplifyImageByAliyun = ({ event, imgs } = {}) => {
  imgs.reduce((sum, img, index) => {
    return sum.then(() => {
      return axios
        .post(`${config.sdBaseUrl}${config.amplifyApi}`, {
          resize_mode: 0,
          upscaling_resize: 2,
          upscaling_crop: true,
          upscaler_1: 'R-ESRGAN 4x+',
          upscaler_2: 'R-ESRGAN 4x+ Anime6B',
          extras_upscaler_2_visibility: 0,
          image: img
        })
        .then((res) => {
          const newImg = res?.data?.image || ''
          event.sender.send('amplify-image-complete', [{ newImg, index }])
        })
        .catch((e) => {
          console.log(`【error】AmplifyImage =>`, e)
        })
    })
  }, Promise.resolve())
}

// 图片高清重绘 - 批量
// batch 也只是对单词请求的提速，每次请求N个。不是全部（全部可能数量太多，无法成功）
// 默认每批次5个
const AmplifyBatchImageByAliyun = ({ event, imgs, batchSize = 5 } = {}) => {
  const newImgs = []
  return imgs
    .reduce((sum, img, index) => {
      if (index % batchSize === 0) {
        const params = imgs.slice(index, index + batchSize)?.map?.((img, index) => ({
          data: img,
          name: index
        }))

        return sum.then(() => {
          return axios
            .post(`${config.sdBaseUrl}${config.amplifyBatchApi}`, {
              resize_mode: 0,
              upscaling_resize: 2,
              upscaling_crop: true,
              upscaler_1: 'R-ESRGAN 4x+',
              upscaler_2: 'R-ESRGAN 4x+ Anime6B',
              extras_upscaler_2_visibility: 0,
              imageList: params
            })
            .then((res) => {
              const resImages = res?.data?.images || []
              newImgs.push(...resImages)
              resImages.forEach((img, _index) => {
                writeFileSync(
                  join(__dirname, `../renderer/cache/imgs/${index + _index}.png`),
                  img,
                  { encoding: 'base64' }
                )
              })
            })
            .catch((e) => {
              console.log(`【error】AmplifyBatchImage =>`, e)
            })
        })
      } else {
        return sum
      }
    }, Promise.resolve())
    .then(() => {
      event.sender.send('amplify-batch-image-complete', { newImgs })
    })
    .catch((e) => {
      console.log(`【error】AmplifyBatchImageFinal =>`, e)
    })
}

export { AmplifyBatchImageByAliyun }
export default AmplifyImageByAliyun
