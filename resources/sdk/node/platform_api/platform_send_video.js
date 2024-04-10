import fs from 'fs'
import axios from 'axios'
import { basename, join } from 'path'
import puppeteer from 'puppeteer'
import querystring from 'querystring'

const chromeUserDataPath = join(process.resourcesPath, 'chromeUserData')

/**
 * B站的上传视频，整体逻辑反编译自
 * https://pypi.org/project/bilibili-toolman/
 */

const mainPageUrl = 'https://member.bilibili.com/platform/upload/video/frame'
const platform_send_video = async (platform, videoInfo = {}) => {
  console.log('wswTest: ', '测试返送视频', videoInfo)

  const browser = await puppeteer.launch({
    headless: false,
    // 指定用户数据目录
    userDataDir: chromeUserDataPath
  })

  // 投稿主页
  const mainPage = await browser.newPage()

  await mainPage.goto(mainPageUrl, { waitUntil: 'load' })
  // B展示视频上传处理
  // https://zhuanlan.zhihu.com/p/350358899
  const fileName = basename(videoInfo.video)
  console.log('wswTest:fileName ', fileName)
  // 1、注册视频存储空间
  // 2、获取upload_id
  const data = await mainPage.evaluate(
    async (params) => {
      const qstr = (obj) => {
        let str = ''
        Object.keys(obj).forEach((key) => {
          str += `${key}=${obj[key]}&`
        })
        return str
      }

      const bilibili_create_update_space = (fileName, videoSize) => {
        const registerStoreNSApi = `https://member.bilibili.com/preupload`
        const queryParams = {
          name: fileName,
          size: videoSize,
          r: 'upos',
          profile: 'svf%2Fbup',
          ssl: 0,
          version: '2.14.0.0',
          build: '2140000',
          upcdn: 'qn',
          probe_version: '20221109',
          zone: 'cs'
        }
        return (
          fetch(`${registerStoreNSApi}?${qstr(queryParams)}`)
            // TODO:(wsw) 这里要兼容，如果这里错了呢？
            .then((res) => res.json())
            .then((data) => {
              console.log('wswTest: 真实的数据是什么', data)
              const { OK, upos_uri, auth, biz_id, endpoint } = data || {}
              const upos_uri_parts = upos_uri?.split('upos://') || []
              const upos_filename = upos_uri_parts[upos_uri_parts.length - 1]
              if (Number(OK) === 1) {
                return { auth, biz_id, upos_uri, upos_filename, endpoint }
              }
              // TODO:(wsw) 这里需要做兼容，如果失败了，需要怎么做
              return null
            })
            .catch((e) => {
              console.log('wswTest: bilibili_create_update_space', e)
              return null
            })
        )
      }

      const bilibili_get_upload_id = (config, endpoint, upos_filename) => {
        const final_endpoint = `https:${endpoint}/${upos_filename}`.replace(/\/$/, '')
        const queryParams = {
          output: 'json'
        }
        console.log('wswTest:尝试获取uploadid ', `${final_endpoint}?uploads&${qstr(queryParams)}`)

        fetch(`${final_endpoint}?uploads&${qstr(queryParams)}`, {
          method: 'post',
          headers: {
            Origin: 'https://member.bilibili.com',
            Referer: 'https://member.bilibili.com/'
          }
        })
          // TODO:(wsw) 这里要兼容，如果这里错了呢？
          .then((res) => res.json())
          .then((data) => {
            console.log('wswTest:获取的数据是什么 ', data)
            const upload_id = data?.upload_id || ''
            if (!upload_id) {
              return null
            }
            return { upload_id, endpoint: final_endpoint, config }
          })
          .catch((e) => {
            console.log('wswTest: bilibili_get_upload_id', e)
            return null
          })
      }

      const config = await bilibili_create_update_space?.(params?.fileName, params?.videoSize)
      const { upos_filename, endpoint } = config || {}
      const upload_id_data = await bilibili_get_upload_id(config, endpoint, upos_filename)
      return config
    },
    { fileName, videoSize: videoInfo.videoSize }
  )

  console.log('wswTest: 当前页面执行脚本的返回结果', data)

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
