import fs from 'fs'
import { basename, join } from 'path'
import puppeteer from 'puppeteer'

const chromeUserDataPath = join(process.resourcesPath, 'chromeUserData')

/**
 * B站的上传视频，整体逻辑反编译自
 * https://pypi.org/project/bilibili-toolman/
 */
const videoUploadInput = 'videoUploadInput'
const mainPageUrl = 'https://member.bilibili.com/platform/upload/video/frame'
const platform_upload_video = async (platform, videoInfo = {}) => {
  console.log('wswTest: ', '测试返送视频', videoInfo)

  const browser = await puppeteer.launch({
    headless: false,
    // 指定用户数据目录
    userDataDir: chromeUserDataPath
  })

  // 投稿主页
  const mainPage = await browser.newPage()

  await mainPage.goto(mainPageUrl, { waitUntil: 'load' })
  // 向页面添加input，并传入视频
  await mainPage.evaluate(
    (params) => {
      const newInput = document.createElement('input')
      newInput.setAttribute('type', 'file')
      newInput.setAttribute('id', params?.videoUploadInput)
      document.body.appendChild(newInput)
    },
    { videoUploadInput }
  )
  // 等待input元素加载到页面
  await mainPage.waitForSelector(`#${videoUploadInput}`)

  // B展示视频上传处理
  // https://zhuanlan.zhihu.com/p/350358899
  const fileName = basename(videoInfo.video)
  const data = await mainPage.evaluate(
    async (params) => {
      const qstr = (obj) => {
        let str = ''
        const keys = Object.keys(obj) || []
        const keysLen = keys.length
        keys.forEach((key, index) => {
          str += `${key}=${obj[key]}${keysLen - 1 > index ? '&' : ''}`
        })
        console.log('wswTest: 查询参数拼接函数===>', str)
        return str
      }

      /**
       * 获取指定名称的cookie
       */
      const getCookieValueByName = (name) => {
        let cookiesArray = document.cookie.split('; ')

        for (let i = 0; i < cookiesArray.length; i++) {
          let cookiePair = cookiesArray[i].split('=')

          if (cookiePair[0] === name) {
            return decodeURIComponent(cookiePair[1])
          }
        }
        return null
      }

      /**
       * 建立上传任务
       */
      const bilibili_create_update_task = (queryParams) => {
        const registerStoreNSApi = `https://member.bilibili.com/preupload`
        return (
          fetch(`${registerStoreNSApi}?${qstr(queryParams)}`)
            // TODO:(wsw) 兼容异常
            // .then((res) => res.json())
            .then((res) => {
              console.log('wswTest: ', res)
              return res.json()
            })
            .then((data) => {
              // TODO:(wsw) 检查是否为200，fetch把403当做成功
              console.log('wswTest: 真实的数据是什么', data)
              const { OK, upos_uri, auth, biz_id, endpoint, chunk_size } = data || {}
              if (Number(OK) === 1) {
                const upload_path = upos_uri?.split?.('//')?.[1] || ''
                return { auth, biz_id, upos_uri, endpoint, chunk_size, upload_path }
              }
              // TODO:(wsw) 兼容异常
              return null
            })
            .catch((e) => {
              // TODO:(wsw) 兼容异常
              console.log('wswTest: bilibili_create_update_task', e)
              return null
            })
        )
      }

      /**
       * 获取上传任务的upload_id
       */
      const bilibili_get_upload_id = (params) => {
        const { endpoint, upload_path, auth, ...restParams } = params || {}
        const extraStr = '?uploads&output=json'
        const api = `https:${endpoint}/${upload_path}${extraStr}`
        console.log('wswTest:获取上传任务id', api)

        return (
          fetch(api, {
            method: 'post',
            body: JSON.stringify(restParams),
            headers: {
              Origin: 'https://member.bilibili.com',
              Referer: 'https://member.bilibili.com/',
              'X-Upos-Auth': auth
            }
          })
            // TODO:(wsw) 这里要兼容，如果这里错了呢？
            // .then((res) => res.json())
            .then((res) => {
              console.log('wswTest: ', res)
              return res.json()
            })
            .then((data) => {
              // TODO:(wsw) 检查是否为200，fetch把403当做成功
              console.log('wswTest: 获取上传视频的任务id ', data)
              const upload_id = data?.upload_id || ''
              if (!upload_id) {
                return null
              }
              return { upload_id }
            })
            .catch((e) => {
              console.log('wswTest: bilibili_get_upload_id', e)
              return null
            })
        )
      }

      /**
       * 上传视频文件到oss
       */
      // https://upos-cs-upcdntxa.bilivideo.com/ugcfx2lf/n240410adsx6viejmse7q2htyvl362ch.mp4?
      const bilibili_stream_upload_video = async (file, params) => {
        const { auth, size, chunk_size, uploadId, endpoint, upload_path } = params || {}
        const push_stream_api = `${endpoint}/${upload_path}`
        const totalChunks = Math.ceil(size / chunk_size)
        for (let i = 0; i < totalChunks; i++) {
          const start = i * chunk_size
          const end = (i + 1) * chunk_size > size ? size : (i + 1) * chunk_size
          const chunk = file.slice(start, end)
          const queryParams = {
            uploadId,
            chunk: 0,
            chunks: totalChunks,
            partNumber: i + 1,
            size: end - start,
            start,
            end,
            total: size
          }
          console.log('wswTest: 上传分pURI', push_stream_api)
          // 假设你的上传API支持分块上传
          const isSuccess = await fetch(`${push_stream_api}?${qstr(queryParams)}`, {
            method: 'put',
            headers: {
              'Content-Type': 'application/octet-stream',
              Origin: 'https://member.bilibili.com',
              Referer: 'https://member.bilibili.com/',
              'X-Upos-Auth': auth
            },
            body: chunk
          })
            .then((response) => response.text()) // 假设服务端响应是 JSON 格式
            .then((result) => {
              // TODO:(wsw) 检查是否为200，fetch把403当做成功
              console.log('分片上传 结束:', result)
              if ('MULTIPART_PUT_SUCCESS' === result?.trim()) {
                console.log('wswTest: ', '分片上传成功')
                return true
              }
              return false
            })
            .catch((error) => {
              console.error('[bilibili_stream_upload_video] ', error)
              return false
            })
          // TODO:(wsw) 根据分片上传是否成功，决定是否要重试
          // if (isSuccess) {}
        }
      }

      /**
       * 视频投稿送审批
       */
      const bilibili_video_draft_auditing = (draft_params) => {
        console.log('wswTest: bilibili_video_draft_auditing', draft_params)
        const video_draft_auditing_api = `https://member.bilibili.com/x/vu/web/add/v3?t=${new Date().getTime()}&csrf=${getCookieValueByName('bili_jct')}`
        console.log('wswTest: video_draft_auditing_api 投稿提交接口', video_draft_auditing_api)
        return (
          fetch(video_draft_auditing_api, {
            method: 'post',
            body: JSON.stringify(draft_params),
            headers: {
              Origin: 'https://member.bilibili.com',
              Referer: 'https://member.bilibili.com/',
              'Content-Type': 'application/json'
            }
          })
            // TODO:(wsw) 这里要兼容，如果这里错了呢？
            // .then((res) => res.json())
            .then((res) => {
              console.log('wswTest:投稿json ', res)
              return res.json()
            })
            .then((data) => {
              // TODO:(wsw) 检查是否为200，fetch把403当做成功
              console.log('wswTest: 投稿返回值 ', data)
              const { aid, bvid } = data || {}
              if (!aid && !bvid) {
                return null
              }
              return { aid, bvid }
            })
            .catch((e) => {
              console.log('wswTest: bilibili_get_upload_id', e)
              return null
            })
        )
      }

      const videoUploadInput = params?.videoUploadInput
      const fileInputElement = document.querySelector(`#${videoUploadInput}`)
      fileInputElement.addEventListener('change', async (event) => {
        const file = event?.target?.files?.[0]
        if (file) {
          // S1: 首先会对视频建立上传任务
          // chunk_size: 10485760 默认10M
          // TODO:(wsw) profile 的值需要确认规则: svffx/bup fxmeta/bup ugcfx/bup
          const video_task_info = await bilibili_create_update_task({
            name: params?.fileName,
            size: params?.videoSize,
            r: 'upos',
            profile: 'ugcfx%2Fbup',
            ssl: 0,
            upcdn: 'qn',
            probe_version: '20221109',
            zone: 'cs',
            build: '2140000',
            version: '2.14.0.0',
            webVersion: '2.14.0'
          })
          const {
            chunk_size = 10485760,
            biz_id,
            upload_path,
            endpoint,
            auth
          } = video_task_info || {}
          const fetch_upload_id_params = {
            auth,
            endpoint,
            upload_path,
            profile: 'ugcfx%2Fbup',
            filesize: params?.videoSize,
            partsize: chunk_size,
            biz_id
          }
          // b站在上传视频的同时，会通过计算服务器解析出一份视频的meta信息保存到file_meta.txt中，并同时上传
          // 然后通过meta_upos_uri，对视频进行关联。不过，这个参数允许为空
          const upload_id_data = await bilibili_get_upload_id(fetch_upload_id_params)
          const { upload_id } = upload_id_data || {}
          // // S3: 分片流式上传，chunksize是10M(10485760)，这个值也可以在建立上传任务的返回值中获取
          const upload_result = await bilibili_stream_upload_video(file, {
            auth,
            endpoint,
            upload_path,
            size: params?.videoSize,
            chunk_size,
            uploadId: upload_id
          })

          // TODO:(wsw) 有一个上传封面的操作
          // https://member.bilibili.com/x/vu/web/cover/up?t=1712655691503
          // 他的query有个csrf，存放的位置是 bili_jct
          // https://member.bilibili.com/x/vu/web/add/v3?t=1712655697269&csrf=268b6eabcac2e971aaef6276fc4e893a
          const upload_file_name = upload_path?.split?.('/')?.[1] || ''
          const title = '[AI]小说生成视频效果-V0.2.3'
          // 投稿用的参数结构
          bilibili_video_draft_auditing({
            // cover:
            //   'https://archive.biliimg.com/bfs/archive/cf9b93eb6f3d208c3124cce46ecafcfc3e64f89f.png',
            title: '我又来投稿件了，哈哈哈哈 ',
            desc: '',
            desc_format_id: 0,
            copyright: 1,
            // TODO:(wsw) 这里的tid，如何获取？
            tid: 168,
            // TODO:(wsw) 这里的tag是否手动写？
            tag: '小说,AI小说,网文,效果,生成',
            // 这些个参数还没有拿到
            // mission_id: 4011933,
            // topic_id: 99191,
            // topic_detail: {
            //   from_topic_id: 99191,
            //   from_source: 'arc.web.recommend'
            // },
            recreate: 1,
            dynamic: '',
            interactive: 0,
            videos: [
              {
                // filename: 'n240409sa2enhualatsrwp3lhyrmm4xs',
                filename: upload_file_name?.split?.('.')?.[0],
                title: '这是第一个分p',
                desc: '描述描述'
                // 弹幕池id，暂时不要试试看效果
                // TODO:(wsw) 缺少个入参
                // cid: biz_id
              }
            ],
            act_reserve_create: 0,
            no_disturbance: 0,
            no_reprint: 1,
            subtitle: {
              open: 0,
              lan: 'zh-CN'
            },
            dolby: 0,
            lossless_music: 0,
            up_selection_reply: false,
            up_close_reply: false,
            up_close_danmu: false,
            web_os: 2,
            csrf: getCookieValueByName('bili_jct')
            // csrf: '268b6eabcac2e971aaef6276fc4e893a'
          })
        }
        console.log('wswTest: 监听到值变化', file)
      })
    },
    { fileName, videoSize: videoInfo.videoSize, videoUploadInput }
  )

  // 将文件路径传给新创建的input元素，从而实现文件的上传
  const elementHandle = await mainPage.$(`#${videoUploadInput}`)
  console.log('wswTest: 后触发上传')
  await elementHandle.uploadFile(videoInfo.video)
}

export default platform_upload_video
