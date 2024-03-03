/**
 * 第一版的主流程模块
 * 校验不通过的都会转交这个模块处理
 */
class VideoRepost {
  constructor() {}

  main() {
    // 模块间完成跳转，在主模块中，仅对引导程序做引用和启动
    const preProcess = newn PreProcess();
    preProcess.main();
  }

  goto(modName) {
    // 转到下一个模块的同时，将自身实例传递过去
    const ModuleClass = new ModuleConstant[modName](this);
  }
}
