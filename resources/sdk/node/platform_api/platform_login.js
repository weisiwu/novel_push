import puppeteer_manage from './puppeteer_manage.js'
import {
  platformNames,
  support_distribute_platforms
} from '../../../../src/renderer/src/constants.js'
import xigua_login from './xigua_login.js'
import bilibili_login from './bilibili_login.js'

const platform_login = async (platforms, updateProgress = () => {}) => {
  console.log('wswTest: 将要登录平台', platforms)
  updateProgress(`将要登录平台: ${platforms}`)
  const winSize = 1080
  const headless = false
  // const browser = await puppeteer_manage.launch(headless, {
  //   args: [`--window-size=${winSize},${winSize}`]
  // })
  const browser = await puppeteer_manage.launch(headless)
  // 登录流程结束
  const platforms_login_status = {}
  const notify_finish = (result) => {
    platforms_login_status[result.platform] = result.is_success || false
  }

  // 依次打开登录页，等待检查登录状态或者手动登录
  for (let i in platforms) {
    const platform = platforms[i]
    support_distribute_platforms.find((item) => item.name === platform)
    if (!support_distribute_platforms) continue
    if (platform === platformNames.BILIBILI) {
      await bilibili_login({ browser, platform, updateProgress, notify_finish })
    } else if (platform === platformNames.XIGUA) {
      await xigua_login({ browser, platform, updateProgress, notify_finish })
    } else if (platform === platformNames.DOUYIN) {
      continue
    } else if (platform === platformNames.KUAISHOU) {
      continue
    }
  }
  const check_timer = setInterval(async () => {
    const pages = await browser.pages()
    const open_pages = pages.filter((page) => !page.isClosed())
    if (open_pages.length <= 1) {
      // 全部登录: 每个登录页登录检测到登录后，都会关闭自身
      clearInterval(check_timer)
    }
  }, 1000)
}

export default platform_login
