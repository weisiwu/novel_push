import { PLATFORM_APIS, platformNames } from '../../../../src/renderer/src/constants.js'

const xigua_login = async ({
  browser,
  winSize,
  platform,
  updateProgress = () => {},
  notify_finish = () => {}
}) => {
  // B站种cookie，通过多个接口，分别给主站、游戏、漫画种上登录态
  const loginPage = await browser.newPage()
  await loginPage.setViewport({ width: winSize, height: winSize })
  // 用来判断是否登录
  loginPage.goto(PLATFORM_APIS.XIGUA.login_html, { waitUntil: 'load' })
  loginPage.on('response', async (response) => {
    const responseUrl = response.url()

    // 打开用户主页出现重定向，未登录
    if (responseUrl === PLATFORM_APIS.XIGUA.login_html) {
      if (response.status() >= 200 && response.status() < 300) {
        // 已登录
        updateProgress(`已保持${platform}登录态`, 'success')
        console.log(`wswTest: 已保持${platform}登录态`)
        notify_finish({ platform: platformNames.XIGUA, is_success: true })
        loginPage.close()
        return
      }
    }

    // 未登录，用户操作登录，进入后台
    if (responseUrl.indexOf(PLATFORM_APIS.XIGUA.is_login_api) >= 0) {
      // 检查登录接口请求成功
      if (response.status() >= 200 && response.status() < 300) {
        const data = await response.json()
        if (data?.status === 0) {
          updateProgress(`已保持${platform}登录态`, 'success')
          console.log(`wswTest: 已保持${platform}登录态`)
          notify_finish({ platform: platformNames.XIGUA, is_success: true })
          loginPage.close()
          return
        }
      }
    }
  })
}

export default xigua_login
