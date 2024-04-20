import { basename } from 'path'
import ffmpeg from 'fluent-ffmpeg'
// import { debug } from '../../../../package.json'
import xigua_upload_video from './xigua_upload_video.js'
import bilibili_upload_video from './bilibili_upload_video.js'
import { platformNames } from '../../../../src/renderer/src/constants.js'
import { xigua_min_width, xigua_min_height } from '../../../BaoganDistributeConfig.json'
// import ffmpegPath from '../../../ffmpeg/ffmpeg-win64-v4.2.2.exe?commonjs-external&asset&asarUnpack'

// TODO:(wsw) mac临时注释
// if (!debug) {
//   ffmpeg.setFfmpegPath(ffmpegPath)
// }

const get_video_size = (videoPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err)
      } else {
        const videoStream = metadata.streams.find((stream) => stream.codec_type === 'video')
        if (videoStream) {
          resolve({
            width: videoStream.width,
            height: videoStream.height
          })
        } else {
          reject(new Error('未找到视频流信息'))
        }
      }
    })
  })
}

const get_cover_from_video = async (video_path) => {
  if (!video_path) {
    return false
  }
  const video_name = basename(video_path)
  const base_path = video_path.replace(video_name, '')
  const cover_path = `${base_path}${video_name?.split?.('.')?.[0]}_cover.png`

  return get_video_size(video_path).then((size) => {
    console.log('wswTest: size', size)
    const { width, height } = size || {}
    const video_ratio = width / height
    let finalWidth = width
    let finalHeight = height

    // 【西瓜】如果尺寸中有小于最小值的
    if (finalWidth < xigua_min_width) {
      finalWidth = Math.ceil(xigua_min_width)
      finalHeight = Math.ceil(finalWidth / video_ratio)
    }
    if (finalHeight < xigua_min_height) {
      finalHeight = Math.ceil(xigua_min_height)
      finalWidth = Math.ceil(finalHeight * video_ratio)
    }
    console.log(`wswTest: 封面最终尺寸是=> ${finalWidth}_${finalHeight}`)
    return new Promise((resolve, reject) => {
      ffmpeg(video_path)
        .frames(1)
        .size(`${finalWidth}x${finalHeight}`)
        .on('end', () => {
          console.log(`wswTest: 截取${video_name}第一帧完成，获取封面完成`)
          resolve(cover_path)
        })
        .on('error', (err) => {
          console.error(`wswTest: 获取视频封面失败: ${err?.message || ''}`)
          console.log('wswTest: ', err)
          reject(false)
        })
        .save(cover_path)
    })
  })
}

/**
 * B站的上传视频
 * @ref 上传逻辑 https://pypi.org/project/bilibili-toolman/
 * @ref b站错误码 https://github.com/Yesterday17/bilibili-errorcode/blob/master/main_site.go
 * @ref b站网页版视频投稿接口分析 https://blog.csdn.net/weixin_45904404/article/details/131680787
 * @ref 分发项目文档: https://www.yuque.com/weisiwu/kb/ylq9vgicobgy6z07
 * @ref tid列表 https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/video/video_zone.md
 * @ref midssion https://member.bilibili.com/x/vupre/app/h5/mission/type/all?tid=168&from=0&t=1712912378510
 * @ref topic https://member.bilibili.com/x/vupre/web/topic/type?type_id=168&pn=0&ps=6&title=&t=1712912378510
 */
const platform_upload_video = async ({
  platform,
  videoInfo = {},
  videoList = [],
  updateProgress,
  uploadVideoProgress,
  uploadVideoStepProgress
}) => {
  // 统一获取视频第一帧作为封面
  const coverList = []
  for (let vid = 0; vid < videoList.length; vid++) {
    const videoObj = videoList[vid]
    // 无值下一个
    if (!videoObj) continue
    const cover_path = await get_cover_from_video(videoObj?.path)
    coverList.push(cover_path)
  }

  console.log('wswTest: platformplatformplatform', platform)
  if (platform.includes(platformNames.BILIBILI)) {
    updateProgress('============== 开始B站分发 ==============')
    await bilibili_upload_video({
      videoInfo,
      videoList,
      coverList,
      updateProgress,
      uploadVideoProgress,
      uploadVideoStepProgress
    })
    updateProgress('============== 结束B站分发 ==============')
  }
  if (platform.includes(platformNames.XIGUA)) {
    updateProgress('============== 开始西瓜视频分发 ==============')
    await xigua_upload_video({
      videoInfo,
      videoList,
      coverList,
      updateProgress,
      uploadVideoProgress,
      uploadVideoStepProgress
    })
    updateProgress('============== 结束西瓜视频分发 ==============')
  }
  if (platform.includes(platformNames.DOUYIN)) {
  }
  if (platform.includes(platformNames.KUAISHOU)) {
  }
}

export default platform_upload_video
