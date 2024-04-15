import { join } from 'path'
import puppeteer from 'puppeteer'
import { debug } from '../../../../package.json'
import get_browser_exe from './get_local_browser_path.js'

const chromeUserDataPath = join(process.resourcesPath, 'chromeUserData')

/**
 * 浏览器实例统一管理
 * 在进程退出时，关闭两者浏览器
 */
class PuppeteerManager {
  constructor() {
    if (!PuppeteerManager.instance) {
      this.browser = null
      this.headless = null
      PuppeteerManager.instance = this
    }

    return PuppeteerManager.instance
  }

  async launch(headless = false, options = {}) {
    const puppeteerConfig = {
      headless,
      userDataDir: chromeUserDataPath,
      ...options
    }
    !debug && (puppeteerConfig.executablePath = get_browser_exe.get(headless))
    try {
      // 发生模式切换
      if (this.browser && this.headless !== headless) {
        console.log('wswTest: ', '是否关闭现有浏览器')
        this.browser.close()
      }
      if (!this.browser) {
        console.log('wswTest: ', '启动浏览器')
        this.browser = await puppeteer.launch(puppeteerConfig)
      }
    } catch (e) {
      console.log('wswTest: ======== 浏览器实例管理异常 ========')
      console.error(e)
      console.log('wswTest: ======== 浏览器实例管理异常 ========')
    }
    return this.browser
  }
}

export default new PuppeteerManager()
