const { app, BrowserWindow } = require('electron')

let mainWindow // 全局变量用于保存主窗口的引用

/**
 * 这里return true，主进程才能开始
 * 这里ruturn false，去退出引导模块
 */
class PreProcess {
  constructor() {}

  // 判断登录
  checkLogin() {}

  // 检查客户端更新
  checkClientUpdate() {}

  // 判断过期
  checkExpired() {}

  async main() {
    const isInitialed = await init()

    if (isInitialed || !this.checkLogin() || !this.checkExpired()) {
      this.goto(ExitGuide)
      return
    }
  }

  // 前置模块后面，默认是主流程模块或退出引导模块。
  goto(modName) {
    // 转到下一个模块的同时，将自身实例传递过去
    const ModuleClass = new ModuleConstant[modName](this)
  }
}

export default new PreProcess()
