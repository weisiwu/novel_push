import { PLATFORM_APIS, platformNames } from '../../../../src/renderer/src/constants.js'

const bilibili_login = async ({
  browser,
  platform,
  updateProgress = () => {},
  notify_finish = () => {}
}) => {
  // B站种cookie，通过多个接口，分别给主站、游戏、漫画种上登录态
  const bilibiliSetLoginApi = PLATFORM_APIS.BILIBILI.login_api
  const loginPage = await browser.newPage()
  const screenWidth = await loginPage.evaluate(() => window.screen.width)
  const screenHeight = await loginPage.evaluate(() => window.screen.height)
  await loginPage.setViewport({ width: screenWidth, height: screenHeight })
  // 用来判断是否登录
  loginPage.goto(PLATFORM_APIS.BILIBILI.login_html, { waitUntil: 'load' })
  loginPage.on('response', async (response) => {
    const responseUrl = response.url()
    if (responseUrl.indexOf(bilibiliSetLoginApi) >= 0) {
      updateProgress(`开始检查${platform}登录`)
      console.log(`wswTest: 开始检查${platform}登录`)
      // 登录成功: 种cookie请求，只要成功返回了，可不用检查返回值内部状态
      if (response.status()) {
        // 等待页面加载完成
        await loginPage.waitForNavigation()
        console.log(`wswTest: ${platform}登录成功`)
        updateProgress(`${platform}登录成功`, 'success')
        notify_finish({ platform: platformNames.BILIBILI, is_success: true })
        loginPage.close()
      } else {
        updateProgress(`${platform}登录失败`, 'error')
        console.log(`wswTest: ${platform}登录失败`)
        notify_finish({ platform: platformNames.BILIBILI, is_success: false })
      }
    }

    if (responseUrl.indexOf(PLATFORM_APIS.BILIBILI.is_login_api) >= 0) {
      if (response.status()) {
        await response.json().then((data) => {
          if (data?.data?.isLogin) {
            updateProgress(`已保持${platform}登录态`, 'success')
            console.log(`wswTest: 已保持${platform}登录态`)
            notify_finish({ platform: platformNames.BILIBILI, is_success: true })
            loginPage.close()
          } else {
            updateProgress(`未登录${platform}，请登录`, 'error')
            console.log(`wswTest: 未登录${platform}，请登录`)
            notify_finish({ platform: platformNames.BILIBILI, is_success: false })
          }
        })
      }
    }
  })
}

export default bilibili_login
