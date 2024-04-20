import { PLATFORM_APIS, platformNames } from '../../../../src/renderer/src/constants.js'

const kuaishou_login = async ({
  browser,
  platform,
  updateProgress = () => {},
  notify_finish = () => {}
}) => {
  const loginPage = await browser.newPage()
  const screenWidth = await loginPage.evaluate(() => window.screen.width)
  const screenHeight = await loginPage.evaluate(() => window.screen.height)
  await loginPage.setViewport({ width: screenWidth, height: screenHeight })
  // 用来判断是否登录
  loginPage.goto(PLATFORM_APIS.KUAISHOU.login_html, { waitUntil: 'load' })
  loginPage.on('response', async (response) => {
    const responseUrl = response.url()

    // 未登录，用户操作登录，进入后台
    if (responseUrl.indexOf(PLATFORM_APIS.KUAISHOU.login_api) >= 0) {
      // 检查登录接口请求成功
      if (response.status() >= 200 && response.status() < 300) {
        const data = await response.json()
        if (data?.result === 1) {
          updateProgress(`已保持${platform}登录态`, 'success')
          console.log(`wswTest: 已保持${platform}登录态`)
          notify_finish({ platform: platformNames.KUAISHOU, is_success: true })
          loginPage.close()
          return
        }
      }
    }
  })
}

export default kuaishou_login
