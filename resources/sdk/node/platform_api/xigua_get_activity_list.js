import puppeteer_manage from './puppeteer_manage.js'
import { PLATFORM_APIS } from '../../../../src/renderer/src/constants.js'

const xigua_get_activity_list = async (cb) => {
  const browser = await puppeteer_manage.launch(true)
  const page = await browser.newPage()

  // 用来判断是否登录
  page.goto(PLATFORM_APIS.XIGUA.fetch_activity_list, { waitUntil: 'load' })
  page.on('response', async (response) => {
    const responseUrl = response.url()
    if (responseUrl === PLATFORM_APIS.XIGUA.fetch_activity_list) {
      const result = await response.json()
      cb(
        result?.data?.activity_list?.map?.((activity) => ({
          label: activity?.title || '',
          value: activity?.title || ''
        })) || []
      )
      // 返回数据后，200ms退出浏览器
      await (() => new Promise((resolve) => setTimeout(() => resolve(), 200)))()
      await page.close()
      await browser.close()
    }
  })
}

export default xigua_get_activity_list
