import axios from 'axios'
import { readFileSync } from 'fs'
import { resolve, join } from 'path'
import { exec } from 'child_process'

// 通过阿里云fc 部署sd api接口并调用
export const TaggingImageByAliyun = ({ event, imgs } = {}) => {
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

const isWindows = process.platform === 'win32'
const isMac = process.platform === 'darwin'

const tagCmd = (imgPath) => {
  const postfix = isWindows ? '.exe' : ''
  const folder = isMac ? 'mac' : 'windows'
  // TODO:(wsw) 模型和csv可以使用用户指定的目录存放
  const csvPath = resolve(__dirname, '../renderer/sdk/models/tagger/selected_tags.csv')
  const modelPath = resolve(__dirname, '../renderer/sdk/models/tagger/model.onnx')
  // TODO:(wsw) sdk必须用包内的位置
  const binPath = join(
    __dirname,
    `../renderer/sdk/tagger/${folder}/interrogator_wd-v1-4-moat-tagger-v2${postfix}`
  )

  console.log('wswTest: 模型路径==>', modelPath)
  console.log('wswTest: sdk路径==>', binPath)
  return `${binPath} --image ${imgPath} --csv_path ${csvPath} --model_path ${modelPath}`
}

// 将反推模型放到本地，通过python脚本调用本地模型，并转换脚本为跨平台可执行软件。
const TaggingImage = ({ event, imgs } = {}) => {
  return Promise.all(
    (imgs || []).map((img) => {
      return new Promise((resolve, reject) => {
        exec(tagCmd(img), (error, stdout, stderr) => {
          if (error || stderr) {
            reject(error || stderr)
          }
          console.log('wswTest: stdout', stdout)
          resolve(stdout)
        })
      })
    })
  )
    .then((imageTaggers) => {
      event.sender.send('image-tagger-complete', imageTaggers)
    })
    .catch((e) => {
      console.log(`【本地】图片反推发生错误`, e)
    })
}

export default TaggingImage
