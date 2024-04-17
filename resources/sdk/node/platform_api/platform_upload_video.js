import bilibili_upload_video from './bilibili_upload_video.js'
import xigua_upload_video from './xigua_upload_video.js'
import { platformNames } from '../../../../src/renderer/src/constants.js'

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
  if (platform.includes(platformNames.BILIBILI)) {
    // TODO:(wsw) 临时注释，调试西瓜
    // bilibili_upload_video({
    //   videoInfo,
    //   videoList,
    //   updateProgress,
    //   removeSuccessVideos,
    //   uploadVideoProgress,
    //   uploadVideoStepProgress
    // })
  }
  if (platform.includes(platformNames.XIGUA)) {
    xigua_upload_video({
      videoInfo,
      videoList,
      updateProgress,
      removeSuccessVideos,
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
