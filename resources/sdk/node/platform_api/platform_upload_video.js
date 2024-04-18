import { basename } from 'path'
import ffmpeg from 'fluent-ffmpeg'
// import { debug } from '../../../../package.json'
import xigua_upload_video from './xigua_upload_video.js'
import bilibili_upload_video from './bilibili_upload_video.js'
import { platformNames } from '../../../../src/renderer/src/constants.js'
// import ffmpegPath from '../../../ffmpeg/ffmpeg-win64-v4.2.2.exe?commonjs-external&asset&asarUnpack'

// TODO:(wsw) mac临时注释
// if (!debug) {
//   ffmpeg.setFfmpegPath(ffmpegPath)
// }

const get_cover_from_video = async (video_path) => {
  if (!video_path) {
    return false
  }
  const video_name = basename(video_path)
  const base_path = video_path.replace(video_name, '')
  const cover_path = `${base_path}${video_name?.split?.('.')?.[0]}_cover.png`
  return new Promise((resolve, reject) => {
    ffmpeg(video_path)
      .frames(1)
      .on('end', () => {
        console.log(`wswTest: 截取${video_name}第一帧完成，获取封面完成`)
        resolve(cover_path)
      })
      .on('error', (err) => {
        console.error(`wswTest: 获取视频封面失败: ${err?.message || ''}`)
        reject(false)
      })
      .save(cover_path)
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
  removeSuccessVideos,
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

  if (platform.includes(platformNames.BILIBILI)) {
    // TODO:(wsw) 临时注释，调试西瓜
    // await bilibili_upload_video({
    //   videoInfo,
    //   videoList,
    //   coverList,
    //   updateProgress,
    //   removeSuccessVideos,
    //   uploadVideoProgress,
    //   uploadVideoStepProgress
    // })
  }
  if (platform.includes(platformNames.XIGUA)) {
    await xigua_upload_video({
      videoInfo,
      videoList,
      coverList,
      updateProgress,
      uploadVideoProgress,
      uploadVideoStepProgress
    })
  }
  if (platform.includes(platformNames.DOUYIN)) {
  }
  if (platform.includes(platformNames.KUAISHOU)) {
  }
}

export default platform_upload_video
