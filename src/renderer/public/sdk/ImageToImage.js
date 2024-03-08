import axios from 'axios'
import { readFileSync } from 'fs'
import { resolve, join } from 'path'
import { exec } from 'child_process'

const isWindows = process.platform === 'win32'
const isMac = process.platform === 'darwin'

// 加载本地模型，然后执行转化
const ImageToImage = ({ event, imgs, cfg } = {}) => {
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

export default ImageToImage
