import fs from 'fs'
import { join } from 'path'
import puppeteer from 'puppeteer'
import bilibiliCookiesPath from '../../../BilibiliCookies.json?commonjs-external&asset&asarUnpack'

const chromeUserDataPath = join(process.resourcesPath, 'chromeUserData')

const platform_login = async (platform, updateProgress) => {
  console.log('wswTest: 将要登录平台', platform)
  updateProgress(`将要登录平台: ${platform}`)
  const browser = await puppeteer.launch({
    headless: false,
    // 指定用户数据目录
    userDataDir: chromeUserDataPath,
    args: ['--window-size=1080,1080']
  })
  const loginPage = await browser.newPage()

  // B站种cookie，通过多个接口，分别给主站、游戏、漫画种上登录态
  const bilibiliSetLoginApi = 'https://passport.biligame.com/x/passport-login/web/sso/set'
  // 用来判断是否登录
  const bilibiliCoolieApi = 'https://api.bilibili.com/x/web-interface/nav'
  await loginPage.goto('https://passport.bilibili.com/login', { waitUntil: 'load' })
  loginPage.on('response', async (response) => {
    const responseUrl = response.url()
    if (responseUrl.indexOf(bilibiliSetLoginApi) >= 0) {
      updateProgress(`开始检查登录`)
      console.log('wswTest: 开始检查登录')
      response.json().then((data) => {
        console.log('wswTest: 登录的结果到底是什么说明书上', data)
      })
      // 登录成功: 种cookie请求，只要成功返回了，可不用检查返回值内部状态
      if (response.status()) {
        // 等待页面加载完成
        await loginPage.waitForNavigation()
        console.log('wswTest: 登录成功')
        updateProgress(`登录成功`, 'success')
        // 获取登录Cookie并保存到本地文件中
        const cookies = await loginPage.cookies()
        fs.writeFileSync(bilibiliCookiesPath, JSON.stringify(cookies), 'utf-8')
        console.log('wswTest: 关闭登录页面')
        updateProgress(`关闭登录页面`)
        await browser.close()
      } else {
        updateProgress(`登录失败`, 'error')
      }
    }

    if (responseUrl.indexOf(bilibiliCoolieApi) >= 0) {
      if (response.status()) {
        response.json().then((data) => {
          if (data?.data?.isLogin) {
            updateProgress(`已保持登录态`, 'success')
            console.log('wswTest: 已保持登录态')
            browser.close()
          } else {
            updateProgress(`未登录${platform}，请登录`, 'error')
            console.log(`wswTest: 未登录${platform}，请登录`)
          }
        })
      }
    }
  })
}

export default platform_login
