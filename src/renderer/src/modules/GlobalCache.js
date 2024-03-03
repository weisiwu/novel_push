/**
 * 从A模块到B模块，到了B模块后，不代表A模块被释放了
 * 它将被保存，以便下次调用直接进入
 * 所有其他类的goto，都应该先在这个类的实例中寻找，寻找不到再new
*/
class GlobalCache() {
  construtor() {}

  setModule(mod, modName) {
    this[modName] = mod;
  }

  getModule(modName) {
    return this[modName];
  }
}

export default new GlobalCache()
