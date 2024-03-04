import axios from 'axios'
import { readFileSync } from 'fs'

// TODO:(wsw) 联调反推tag
export const TaggingImage = ({ filePath } = {}) => {
  console.log('wswTest: ', '联调反推tag')
  const imgTest = Buffer.from(readFileSync(filePath)).toString('base64')
  return axios
    .post(
      'http://novel-push-1.1229125983044594.cn-shanghai.pai-eas.aliyuncs.com/sdapi/v1/interrogate',
      {
        image: imgTest,
        model: 'clip'
      },
      {
        headers: {
          Authorization: 'NWU1ZDU0ZWIxMDNiOTdiY2Y1YzkzZGE4YmNkNWMzNjBhY2I5MDg2Mg=='
        }
      }
    )
    .then((res) => {
      console.log('wswTest: 反推tag结果', res.data)
    })
    .catch((e) => {
      console.log('wswTest:发生错误 ', e)
    })
}
