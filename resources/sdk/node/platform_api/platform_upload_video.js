import bilibili_upload_video from './bilibili_upload_video.js'
import { platformNames } from '../../../../src/renderer/src/constants.js'

const platform_upload_video = async ({
  platform,
  videoInfo = {},
  videoList = [],
  updateProgress,
  removeSuccessVideos,
  uploadVideoProgress,
  uploadVideoStepProgress
}) => {
  if (platform === platformNames.BILIBILI) {
    return bilibili_upload_video({
      videoInfo,
      videoList,
      updateProgress,
      removeSuccessVideos,
      uploadVideoProgress,
      uploadVideoStepProgress
    })
  } else if (platform === platformNames.XIGUA) {
    return
  } else if (platform === platformNames.DOUYIN) {
    return
  } else if (platform === platformNames.KUAISHOU) {
    return
  }
}

export default platform_upload_video
