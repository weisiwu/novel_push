/**
 * Stable Diffsion 启动和API能力
*/
class SDAbility {
  constructor() {}

  // 请求能力地址
  sdBaseAi = 'https://novel-push-1-1229125983044594.pai-eas.cn-shanghai.aliyun.com/'

  // 加载模型，后续用这种模型绘图
  loadModel([model]) {}

  // 获取本地模型列表
  loadModelList() {}

  // 判断是否使用本地算力
  isLocalDraw() {}

  // 改变为使用在线/本地算力
  changeDrawTo() {}

  // 检查远程模型更新
  // 模型的更新是这样的: 我获取到新模型 -> 上传到网盘 -> 用户启动检测 -> 发现有新的 -> 下载到本地
  // 不要放到前置模块里，不影响主流程
  // 而且只有在绘图模块，启动了SD webui后，才能确保后续操作的正确性
  // 当然，这个只在模块初始化的时候，执行一次。
  checkModelsUpdate() {}

  // 测试配置的算力是否可用
  checkDrawAvailable() {}

  // 启动webUI - 以API形式启动
  startLocalWebUI() {}

  // 反推
  imgToTagger() {}

  // 文生图
  txtToImg() {}

  // 高清重绘
  magnifyImg() {}

  main() {
    // 启动的时候，检测使用的是本地还是云端
    if (this.isLocalDraw()) {
      this.sdBaseAi = ''
    } else {
      this.sdBaseAi = ''
    }

    // 调用渲染界面开始渲染界面

    const available = this.checkDrawAvailable();

    if (!available) {
      // 提示用户
    }
  }

  // 前置模块后面，默认是主流程模块或退出引导模块。
  goto(modName) {
    // 转到下一个模块的同时，将自身实例传递过去
    const ModuleClass = new ModuleConstant[modName](this);
  }
}
