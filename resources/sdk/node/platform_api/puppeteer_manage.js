import { readFileSync } from 'fs'
import { join } from 'path'
import puppeteer from 'puppeteer'
import { debug } from '../../../../package.json'
import get_browser_exe from './get_local_browser_path.js'
import baoganDistributeConfigPath from '../../../../resources/BaoganDistributeConfig.json?commonjs-external&asset&asarUnpack'

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
      this.userDataDir = null
      PuppeteerManager.instance = this
      try {
        const { useEnvironment, environments } =
          JSON.parse(readFileSync(baoganDistributeConfigPath).toString()) || {}
        this.userDataDir =
          environments.find((env) => env.name === useEnvironment)?.path || chromeUserDataPath
        console.log('wswTest: 成功读取本地的环境地址', this.userDataDir)
      } catch (e) {
        this.userDataDir = chromeUserDataPath
      }
    }

    return PuppeteerManager.instance
  }

  read_user_data_dir() {
    let userDataDir = null
    try {
      const { useEnvironment, environments = [] } =
        JSON.parse(readFileSync(baoganDistributeConfigPath).toString()) || {}
      userDataDir =
        environments.find?.((env) => env.name === useEnvironment)?.path || chromeUserDataPath
    } catch (e) {
      userDataDir = chromeUserDataPath
    }
    return userDataDir
  }

  async launch(headless = false, options = {}) {
    const user_data_dir_changed = this.userDataDir !== this.read_user_data_dir()
    // console.log('wswTest:1212 ', this.userDataDir)
    // console.log('wswTest:xxxx ', this.read_user_data_dir())
    // console.log('wswTest: user_data_dir_changeduser_data_dir_changed', user_data_dir_changed)
    // 启动前，先判断用户数据目录是否发生变换
    const puppeteerConfig = {
      headless,
      userDataDir: user_data_dir_changed ? this.read_user_data_dir() : this.userDataDir,
      ...options
    }
    !debug && (puppeteerConfig.executablePath = get_browser_exe.get(headless))
    try {
      // 发生模式切换
      if (this.browser && this.headless != headless) {
        console.log('wswTest: 关闭现有浏览器')
        this.browser.close()
        console.log('wswTest: 重启浏览器')
        this.browser = await puppeteer.launch(puppeteerConfig)
      }
      // 用户数据目录变换
      if (user_data_dir_changed) {
        if (this.browser) {
          console.log('wswTest: 关闭现有浏览器')
          this.browser.close()
        }
        console.log('wswTest: 启动浏览器')
        this.browser = await puppeteer.launch(puppeteerConfig)
      }
      if (!this.browser) {
        console.log('wswTest: 启动浏览器')
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
