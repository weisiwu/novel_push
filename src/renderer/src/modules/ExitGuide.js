/**
 * 退出引导模块
 * 校验不通过的都会转交这个模块处理
 */
class ExitGuide {
  constructor() {}

  main() {}

  goto(modName) {
    // 转到下一个模块的同时，将自身实例传递过去
    const ModuleClass = new ModuleConstant[modName](this)
  }
}

export default PreProcess
