import puppeteer_manage from './puppeteer_manage.js'
import { PLATFORM_APIS } from '../../../../src/renderer/src/constants.js'

const xigua_get_activity_list = async () => {
  const browser = await puppeteer_manage.launch(true)
  const page = await browser.newPage()

  // 用来判断是否登录
  page.goto(PLATFORM_APIS.XIGUA.fetch_activity_list, { waitUntil: 'load' })
  page.on('response', async (response) => {
    console.log('wswTest: response', response)
    const responseUrl = response.url()
    console.log('wswTest: responseUrl', responseUrl)
  })
}

export default xigua_get_activity_list
