import { readFileSync } from 'fs'
import { join, resolve } from 'path'
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
      // 是否正在启动浏览器
      this.isInitialBrowserIng = false
      // 启动中，每多久查询一次状态
      this.queryInterval = 500
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
    // 如果在启动浏览器中，则等待
    if (this.isInitialBrowserIng) {
      const isInitialFinish = await (() =>
        new Promise((resolve) => {
          const timer = setInterval(() => {
            if (this.browser) {
              clearInterval(timer)
              resolve(true)
            }
          }, this.queryInterval)
        }))()
      if (isInitialFinish) {
        return this.browser
      }
    }
    const user_data_dir_changed = this.userDataDir !== this.read_user_data_dir()
    // 启动前，先判断用户数据目录是否发生变换
    const puppeteerConfig = {
      headless,
      defaultTimeout: 5000, // 默认等待5秒
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
        this.headless = headless
      }
      // 用户数据目录变换
      if (user_data_dir_changed) {
        if (this.browser) {
          console.log('wswTest: 关闭现有浏览器')
          this.browser.close()
        }
        console.log('wswTest: 启动浏览器')
        this.isInitialBrowserIng = true
        this.browser = await puppeteer.launch(puppeteerConfig)
        this.isInitialBrowserIng = false
      }
      if (!this.browser) {
        console.log('wswTest: 启动浏览器')
        this.isInitialBrowserIng = true
        this.browser = await puppeteer.launch(puppeteerConfig)
        this.isInitialBrowserIng = false
      }
    } catch (e) {
      this.isInitialBrowserIng = false
      console.log('wswTest: ======== 浏览器实例管理异常 ========')
      console.error(e)
      console.log('wswTest: ======== 浏览器实例管理异常 ========')
    }
    return this.browser
  }
}

export default new PuppeteerManager()
