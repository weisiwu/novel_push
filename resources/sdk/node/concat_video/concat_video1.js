const fs = require('fs')
const path = require('path')
const ffmpeg = require('fluent-ffmpeg')

const imagesFolder = '/Users/siwu/Desktop/baogao_ai_novel_push_output/'
const audioPath = '/Users/siwu/Desktop/github/novel_push/output.wav'
const videoOutputPath = '/Users/siwu/Desktop/baogao_ai_novel_push_output/output.mp4'

// 获取图片文件夹中所有图片的文件路径
const getImagesPaths = () => {
  return new Promise((resolve, reject) => {
    fs.readdir(imagesFolder, (err, files) => {
      if (err) return reject(err)
      const imagePaths = files
        .filter((file) => file.endsWith('.png')) // 确保只包含PNG文件
        .map((file) => path.join(imagesFolder, file))
      resolve(imagePaths)
    })
  })
}

// 将图片合成视频
async function createVideoFromImages() {
  try {
    const imagePaths = await getImagesPaths()
    const videoStream = ffmpeg(imagePaths, { format: 'mp4' })
      .outputOptions('-vf "scale=1280:-1"') // 设置视频分辨率
      .on('error', function (err) {
        console.error('Error:', err.message)
      })
      .on('end', function () {
        console.log('Images combined into video successfully!')
      })

    await new Promise((resolve, reject) => {
      videoStream.save(videoOutputPath, function (err) {
        if (err) return reject(err)
        resolve()
      })
    })
  } catch (error) {
    console.error('Error creating video from images:', error)
  }
}

// 添加背景音乐到视频
async function addAudioToVideo() {
  try {
    await ffmpeg()
      .fromFormat('mp4', videoOutputPath)
      .addInput(audioPath)
      .toFormat('mp4')
      .on('error', function (err) {
        console.error('Error:', err.message)
      })
      .on('end', function () {
        console.log('Audio added to video successfully!')
      })
      .save(videoOutputPath)
  } catch (error) {
    console.error('Error adding audio to video:', error)
  }
}

// 运行合成视频和添加背景音乐的函数
createVideoFromImages()
  .then(() => addAudioToVideo())
  .catch((error) => console.error('An error occurred:', error))
