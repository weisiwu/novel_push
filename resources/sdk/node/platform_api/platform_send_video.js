import fs from 'fs'
import { join } from 'path'
import puppeteer from 'puppeteer'
// import bilibiliCookiesPath from '../../../BilibiliCookies.json?commonjs-external&asset&asarUnpack'

const chromeUserDataPath = join(process.resourcesPath, 'chromeUserData')

const mainPageUrl = 'https://member.bilibili.com/platform/upload/video/frame'
const platform_send_video = async (platform, videoInfo = {}) => {
  console.log('wswTest: ', '测试返送视频', videoInfo)
  const browser = await puppeteer.launch({
    headless: true,
    // 指定用户数据目录
    userDataDir: chromeUserDataPath
  })
  // 投稿主页
  const mainPage = await browser.newPage()

  await mainPage.goto(mainPageUrl, { waitUntil: 'load' })
  // TODO:(wsw) 有一个上传封面的操作
  // https://member.bilibili.com/x/vu/web/cover/up?t=1712655691503
  // TODO:(wsw) 有一个上传视频的操作，接口还没有找，应该需要从这个接口获取filename
  // 他的query有个csrf，存放的位置是 bili_jct
  // https://member.bilibili.com/x/vu/web/add/v3?t=1712655697269&csrf=268b6eabcac2e971aaef6276fc4e893a
  // 投稿用的参数结构
  const sendVideoParams = {
    cover: 'https://archive.biliimg.com/bfs/archive/cf9b93eb6f3d208c3124cce46ecafcfc3e64f89f.png',
    cover43: '',
    title: '[AI]小说生成视频效果-V0.2.0',
    copyright: 1,
    tid: 168,
    tag: '小说,AI小说,网文,效果,生成',
    desc_format_id: 0,
    desc: '',
    recreate: -1,
    dynamic: '',
    interactive: 0,
    videos: [
      {
        filename: 'n240409sa2enhualatsrwp3lhyrmm4xs',
        title: '[AI]小说生成视频效果-V0.2.0',
        desc: '',
        cid: 1499299135
      }
    ],
    act_reserve_create: 0,
    no_disturbance: 0,
    no_reprint: 1,
    subtitle: {
      open: 0,
      lan: ''
    },
    dolby: 0,
    lossless_music: 0,
    up_selection_reply: false,
    up_close_reply: false,
    up_close_danmu: false,
    web_os: 2,
    csrf: '268b6eabcac2e971aaef6276fc4e893a'
  }

  // mainPageUrl.on('response', async (response) => {
  //   const responseUrl = response.url()
  //   // 登录成功: 种cookie请求，只要成功返回了，可不用检查返回值内部状态
  //   if (responseUrl.indexOf(bilibiliSetLoginApi) >= 0 && response.status()) {
  //   }
  //   console.log('Received response:', response.url(), response.status())
  // })
}

export default platform_send_video
