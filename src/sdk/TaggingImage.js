import axios from 'axios'
import { readFileSync } from 'fs'

export const TaggingImage = ({ event, imgs } = {}) => {
  return Promise.all(
    (imgs || []).map((img) => {
      const imgObj = Buffer.from(readFileSync(img)).toString('base64')
      return axios
        .post(
          'http://sd-7ad15a--sd.fcv3.1229125983044594.cn-hangzhou.fc.devsapp.net/tagger/v1/interrogate',
          {
            model: 'wd-v1-4-moat-tagger.v2',
            image: imgObj,
            threshold: 0.3
          }
        )
        .then((res) => {
          const tags = res?.data?.caption?.tag || {}
          return (
            Object.keys(tags)
              .sort((prev, next) => tags[next] - tags[prev])
              .slice(0, 10) || []
          )
        })
        .catch((e) => {
          console.log(`图片反推发生错误 ${img}`, e)
        })
    })
  ).then((imageTaggers) => {
    event.sender.send('image-tagger-complete', imageTaggers)
  })
}

export default TaggingImage
