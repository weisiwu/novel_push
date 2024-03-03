import DetectVideoShot from '../../../sdk/DetectVideoShot.js'

/**
 * 处理视频为图，和将图转换为视频
 */
class VideoProcess {
  constructor(file = null) {
    this.video = file
    this.DetectVideoShot = DetectVideoShot
    this.parts = []
  }

  updateFile(file) {
    this.video = file
  }

  // 智能分割视频
  async cutParts() {
    console.log('wswTest: ', '开始切视频')
    this.DetectVideoShot.main(this.video)
    // this.parts = []
  }

  // 合并视频模块
  joinParts() {}

  // 图片生成视频片段
  // 这个函数要考虑往里面加关键帧过渡
  imgToVideoPart() {}
}

export default VideoProcess
