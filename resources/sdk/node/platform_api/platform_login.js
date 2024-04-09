import fs from 'fs'
import { join } from 'path'
import puppeteer from 'puppeteer'
import bilibiliCookiesPath from '../../../BilibiliCookies.json?commonjs-external&asset&asarUnpack'

const chromeUserDataPath = join(process.resourcesPath, 'chromeUserData')

const platform_login = async (platform) => {
  console.log('wswTest: 将要登录平台', platform)
  const browser = await puppeteer.launch({
    headless: false,
    // 指定用户数据目录
    userDataDir: chromeUserDataPath,
    args: ['--window-size=1080,1080']
  })
  console.log('wswTest: chromeUserDataPath', chromeUserDataPath)
  const loginPage = await browser.newPage()

  // B站种cookie，通过多个接口，分别给主站、游戏、漫画种上登录态
  const bilibiliSetLoginApi = 'https://passport.biligame.com/x/passport-login/web/sso/set'
  await loginPage.goto('https://passport.bilibili.com/login', { waitUntil: 'load' })
  loginPage.on('response', async (response) => {
    const responseUrl = response.url()
    // 登录成功: 种cookie请求，只要成功返回了，可不用检查返回值内部状态
    if (responseUrl.indexOf(bilibiliSetLoginApi) >= 0 && response.status()) {
      // 等待页面加载完成
      await loginPage.waitForNavigation()
      // 获取登录Cookie并保存到本地文件中
      const cookies = await loginPage.cookies()
      console.log('wswTest: 读取的登录cookie是', cookies)
      fs.writeFileSync(bilibiliCookiesPath, JSON.stringify(cookies), 'utf-8')
      await browser.close()
    }
    console.log('Received response:', response.url(), response.status())
  })
}

export default platform_login
