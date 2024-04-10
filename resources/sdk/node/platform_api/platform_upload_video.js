import { join, basename } from 'path'
import puppeteer from 'puppeteer'

const chromeUserDataPath = join(process.resourcesPath, 'chromeUserData')

/**
 * B站的上传视频，整体逻辑反编译自
 * https://pypi.org/project/bilibili-toolman/
 */
const maxRetryTime = 3
const videoUploadInput = 'videoUploadInput'
const mainPageUrl = 'https://member.bilibili.com/platform/upload/video/frame'
const platform_upload_video = async (platform, videoInfo = {}) => {
  const browser = await puppeteer.launch({
    headless: false,
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
  await mainPage.evaluate(
    async (params) => {
      const { fileName, videoSize, videoUploadInput, maxRetryTime } = params || {}

      const qstr = (obj) => {
        let str = ''
        const keys = Object.keys(obj) || []
        const keysLen = keys.length
        keys.forEach((key, index) => {
          str += `${key}=${obj[key]}${keysLen - 1 > index ? '&' : ''}`
        })
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
      const bilibili_create_update_task = (queryParams, times = 0) => {
        const registerStoreNSApi = `https://member.bilibili.com/preupload`
        return fetch(`${registerStoreNSApi}?${qstr(queryParams)}`)
          .then((res) => {
            if (!res.ok) {
              throw new Error(`HTTP error! status: ${res.status}`)
            }
            return res.json().catch((e) => {
              if (times + 1 >= maxRetryTime) {
                console.log('wswTest:[bilibili_create_update_task]', e)
                return null
              }
              return bilibili_create_update_task(queryParams, times + 1)
            })
          })
          .then((data) => {
            const { OK, upos_uri, auth, biz_id, endpoint, chunk_size } = data || {}
            if (Number(OK) === 1) {
              const upload_path = upos_uri?.split?.('//')?.[1] || ''
              return { auth, biz_id, upos_uri, endpoint, chunk_size, upload_path }
            }
            console.log('wswTest:[bilibili_create_update_task]', data)
            return null
          })
          .catch((e) => {
            if (times + 1 >= maxRetryTime) {
              console.log('wswTest:[bilibili_create_update_task]', e)
              return null
            }
            return bilibili_create_update_task(queryParams, times + 1)
          })
      }

      /**
       * 获取上传任务的upload_id
       */
      const bilibili_get_upload_id = (params, times = 0) => {
        const { endpoint, upload_path, auth, ...restParams } = params || {}
        const extraStr = `?uploads&output=json&${qstr(restParams)}`
        const api = `https:${endpoint}/${upload_path}${extraStr}`

        return fetch(api, {
          method: 'post',
          headers: {
            Origin: 'https://member.bilibili.com',
            Referer: 'https://member.bilibili.com/',
            'X-Upos-Auth': auth
          }
        })
          .then((res) => {
            if (!res.ok) {
              throw new Error(`HTTP error! status: ${res.status}`)
            }
            return res.json().catch((e) => {
              if (times + 1 >= maxRetryTime) {
                console.log('wswTest:[bilibili_get_upload_id]', e)
                return null
              }
              return bilibili_get_upload_id(params, times + 1)
            })
          })
          .then((data) => {
            const upload_id = data?.upload_id || ''
            if (!upload_id) {
              console.log('wswTest:[bilibili_get_upload_id]', data)
              return null
            }
            return { upload_id }
          })
          .catch((e) => {
            if (times + 1 >= maxRetryTime) {
              console.log('wswTest:[bilibili_get_upload_id]', e)
              return null
            }
            return bilibili_get_upload_id(params, times + 1)
          })
      }

      /**
       * 上传视频文件到oss
       * 视频分块上传，每个分段使用stream形式put推送
       * 分块大小(chunk_size): 10485760 默认10M
       * b站在上传视频的同时，会通过计算服务器解析出一份视频的meta信息保存到file_meta.txt中，并同时上传
       * 然后通过meta_upos_uri，对视频进行关联。不过，这个参数允许为空
       */
      const bilibili_stream_upload_video = async (file, params, times = 0) => {
        const { auth, size, chunk_size, uploadId, endpoint, upload_path } = params || {}
        const push_stream_api = `${endpoint}/${upload_path}`
        const totalChunks = Math.ceil(size / chunk_size)
        let uploadSuccess = true

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
          uploadSuccess = await fetch(`${push_stream_api}?${qstr(queryParams)}`, {
            method: 'put',
            headers: {
              'Content-Type': 'application/octet-stream',
              Origin: 'https://member.bilibili.com',
              Referer: 'https://member.bilibili.com/',
              'X-Upos-Auth': auth
            },
            body: chunk
          })
            .then((res) => {
              if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`)
              }
              return res.text().catch((e) => {
                if (times + 1 >= maxRetryTime) {
                  console.log('wswTest:[bilibili_stream_upload_video]', e)
                  return null
                }
                return bilibili_stream_upload_video(file, params, times + 1)
              })
            })
            .then((res) => 'MULTIPART_PUT_SUCCESS' === res?.trim())
            .catch((e) => {
              if (times + 1 >= maxRetryTime) {
                console.log('wswTest:[bilibili_stream_upload_video]', e)
                return null
              }
              return bilibili_stream_upload_video(file, params, times + 1)
            })
        }
        // TODO:(wsw) 待添加逻辑
        // 视频分段上传完毕后，根据结果通知用户
        if (uploadSuccess) {
          console.log('wswTest: ', '上传视频成功')
        } else {
          console.log('wswTest: ', '上传视频失败')
        }
        return uploadSuccess
      }

      /**
       * 视频投稿送审批
       */
      const bilibili_video_draft_auditing = (draft_params, times = 0) => {
        const video_draft_auditing_api = `https://member.bilibili.com/x/vu/web/add/v3?t=${new Date().getTime()}&csrf=${getCookieValueByName('bili_jct')}`
        // TODO:(wsw) 调试用
        console.log('wswTest: 推送视频投稿参数', draft_params)
        console.log('wswTest: 推送视频投稿提交接口', video_draft_auditing_api)
        return fetch(video_draft_auditing_api, {
          method: 'post',
          body: JSON.stringify(draft_params),
          headers: {
            Origin: 'https://member.bilibili.com',
            Referer: 'https://member.bilibili.com/',
            'Content-Type': 'application/json'
          }
        })
          .then((res) => {
            if (!res.ok) {
              throw new Error(`HTTP error! status: ${res.status}`)
            }
            return res.json().catch((e) => {
              if (times + 1 >= maxRetryTime) {
                console.log('wswTest:[bilibili_video_draft_auditing]', e)
                return null
              }
              return bilibili_video_draft_auditing(draft_params, times + 1)
            })
          })
          .then((data) => {
            const { aid, bvid } = data || {}
            if (!aid && !bvid) {
              console.log('wswTest:[bilibili_video_draft_auditing]', data)
              return null
            }
            return { aid, bvid }
          })
          .catch((e) => {
            if (times + 1 >= maxRetryTime) {
              console.log('wswTest:[bilibili_video_draft_auditing]', e)
              return null
            }
            return bilibili_video_draft_auditing(draft_params, times + 1)
          })
      }

      const baseParams = {
        r: 'upos',
        ssl: 0,
        upcdn: 'qn',
        probe_version: '20221109',
        zone: 'cs',
        build: '2140000',
        version: '2.14.0.0',
        webVersion: '2.14.0'
      }
      const profile = 'ugcfx%2Fbup'
      const fileInputElement = document.querySelector(`#${videoUploadInput}`)
      fileInputElement.addEventListener('change', async (event) => {
        const file = event?.target?.files?.[0]
        if (file) {
          // S1: 对视频建立上传任务
          const video_task_info = await bilibili_create_update_task({
            ...baseParams,
            name: fileName,
            size: videoSize,
            profile
          })
          if (!video_task_info) {
            return console.log('wswTest: 创建视频上传任务失败')
          }
          console.log('wswTest: 创建视频上传任务成功', video_task_info)

          const { chunk_size, biz_id, upload_path, endpoint, auth } = video_task_info || {}
          // S2: 获取上传任务id
          const fetch_upload_id_params = {
            auth,
            endpoint,
            upload_path,
            profile,
            filesize: videoSize,
            partsize: chunk_size,
            biz_id
          }
          const { upload_id } = (await bilibili_get_upload_id(fetch_upload_id_params)) || {}
          if (!upload_id) {
            return console.log('wswTest: 获取上传任务id失败')
          }
          console.log('wswTest: 获取上传任务id成功', upload_id)

          // S3: 启动上传任务
          const upload_result = await bilibili_stream_upload_video(file, {
            auth,
            endpoint,
            upload_path,
            size: params?.videoSize,
            chunk_size,
            uploadId: upload_id
          })
          if (!upload_result) {
            return console.log('wswTest: 上传视频文件失败', upload_result)
          }
          console.log('wswTest: 上传视频文件成功', upload_result, upload_id)

          // TODO:(wsw) 上传封面
          // S4: 上传封面

          // S5: 投稿
          const upload_file_name = upload_path?.split?.('/')?.[1] || ''
          bilibili_video_draft_auditing({
            cover:
              'https://archive.biliimg.com/bfs/archive/cf9b93eb6f3d208c3124cce46ecafcfc3e64f89f.png',
            title: '我又来投稿件了，哈哈哈哈1212 ',
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
          })
        }
      })
    },
    { fileName, videoSize: videoInfo.videoSize, videoUploadInput, maxRetryTime }
  )

  // 触发文件上传，开始投稿流程
  const elementHandle = await mainPage.$(`#${videoUploadInput}`)
  await elementHandle.uploadFile(videoInfo.video)
}

export default platform_upload_video
