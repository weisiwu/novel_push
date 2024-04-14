import { join, basename } from 'path'
import puppeteer from 'puppeteer'
import ffmpeg from 'fluent-ffmpeg'
import get_browser_exe from './get_local_browser_path.js'
import ffmpegPath from '../../../ffmpeg/ffmpeg-win64-v4.2.2.exe?commonjs-external&asset&asarUnpack'

// import puppeteer_manage from './puppeteer_manage.js'
ffmpeg.setFfmpegPath(ffmpegPath)
const chromeUserDataPath = join(process.resourcesPath, 'chromeUserData')

// TODO:(wsw) 不支持视频分P
// TODO:(wsw) b站上传工具版本同步更新机制
/**
 * B站的上传视频
 * @ref 上传逻辑 https://pypi.org/project/bilibili-toolman/
 * @ref b站错误码 https://github.com/Yesterday17/bilibili-errorcode/blob/master/main_site.go
 * @ref b站网页版视频投稿接口分析 https://blog.csdn.net/weixin_45904404/article/details/131680787
 * @ref 分发项目文档: https://www.yuque.com/weisiwu/kb/ylq9vgicobgy6z07
 * @ref tid列表 https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/video/video_zone.md
 * @ref midssion https://member.bilibili.com/x/vupre/app/h5/mission/type/all?tid=168&from=0&t=1712912378510
 * @ref topic https://member.bilibili.com/x/vupre/web/topic/type?type_id=168&pn=0&ps=6&title=&t=1712912378510
 */
const maxRetryTime = 3
const videoUploadInput = 'videoUploadInput'
const mainPageUrl = 'https://member.bilibili.com/platform/upload/video/frame'
/**
 * 根据视频地址，获取视频第一帧作为封面
 * 以视频名+_cover保存在相同目录
 */
const get_cover_from_video = (video_path) => {
  if (!video_path) {
    return false
  }
  const video_name = basename(video_path)
  const base_path = video_path.replace(video_name, '')
  const cover_path = `${base_path}${video_name?.split?.('.')?.[0]}_cover.png`
  return new Promise((resolve, reject) => {
    ffmpeg(video_path)
      .frames(1)
      .on('end', () => {
        console.log(`wswTest: 截取${video_name}第一帧完成，获取封面完成`)
        resolve(cover_path)
      })
      .on('error', (err) => {
        console.error(`wswTest: 获取视频封面失败: ${err?.message || ''}`)
        reject(false)
      })
      .save(cover_path)
  })
}

let uploadBrowser = null
/**
 * @params platform平台标识符
 * @videoInfo 视频相关信息，包含平台特殊信息
 * @videoList 将要投递的视频列表，视频稿件最终信息以videoInfo信息和videoList中信息混合而成
 */
const platform_upload_video = async (
  platform,
  videoInfo = {},
  videoList = [],
  updateProgress,
  removeSuccessVideos
) => {
  // 关闭已有的页面，重新执行
  if (uploadBrowser) {
    await uploadBrowser?.close?.()
    uploadBrowser = null
  }
  const headless = true
  uploadBrowser = await puppeteer.launch({
    headless,
    executablePath: get_browser_exe.get(headless),
    userDataDir: chromeUserDataPath
  })

  // 投稿主页
  const mainPage = await uploadBrowser.newPage()
  // 指令
  const RM_SUCCESS_VIDEOS = 'wswTest:[action=remove_success_videos]'

  // 监听处理进度: 将浏览器中的 console 输出捕获到 Node.js 的 console 中
  mainPage.on('console', (msg) => {
    const m_type = msg.type()
    const m_text = msg.text()
    console.log(`BROWSER LOG: ${m_text}`)
    // 指令日志: 队列处理完毕，以下视频投稿成功，从视频列表中移除
    if (m_text?.indexOf?.(RM_SUCCESS_VIDEOS) >= 0) {
      const msg_text = m_text?.replace?.(RM_SUCCESS_VIDEOS, '')?.trim()
      return removeSuccessVideos?.(msg_text)
    }

    if (m_text?.indexOf('wswTest:') < 0) {
      return
    }
    const msg_text = m_text?.replace?.('wswTest:', '')?.trim()
    if (m_type === 'log') {
      updateProgress(msg_text)
    } else if (m_type === 'info') {
      // 使用info代替通知
      updateProgress(msg_text, 'success')
    } else if (m_type === 'error') {
      // 错误消息
      updateProgress(msg_text, 'error')
    }
  })

  await mainPage.goto(mainPageUrl, { waitUntil: 'load' })
  // 向页面添加input，并传入视频
  await mainPage.evaluate(
    (params) => {
      const newInput = document.createElement('input')
      newInput.setAttribute('type', 'file')
      newInput.setAttribute('multiple', 'true')
      newInput.setAttribute('id', params?.videoUploadInput)
      document.body.appendChild(newInput)
    },
    { videoUploadInput }
  )
  // 等待input元素加载到页面
  await mainPage.waitForSelector(`#${videoUploadInput}`)

  // B展示视频上传处理
  // https://zhuanlan.zhihu.com/p/350358899
  await mainPage.evaluate(
    async (params) => {
      // 视频合并的时候需要此参数，参数在视频分段上传时产生。保存为全局变量，方便读取
      let _totalChunks = 1
      const { videoInfo, videoList, videoUploadInput, maxRetryTime, RM_SUCCESS_VIDEOS } =
        params || {}

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
       * 将文件转换为base64
       */
      const read_file_base64 = (file) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result)
          reader.onerror = (error) => reject(error)
          if (!file) {
            reject(new Error('将视频封面转换为base64，传入的封面文件为空'))
          }
          reader.readAsDataURL(file)
        })
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
              throw new Error(`[bilibili_create_update_task]HTTP error! status: ${res.status}`)
            }
            return res.json().catch((e) => {
              if (times + 1 >= maxRetryTime) {
                console.error(`wswTest:[bilibili_create_update_task]res.json():${e.message || ''}`)
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
            console.error(`wswTest:[bilibili_create_update_task]not_ok:${JSON.stringify(data)}`)
            return null
          })
          .catch((e) => {
            if (times + 1 >= maxRetryTime) {
              console.error(`wswTest:[bilibili_create_update_task]fetch:${e?.message || ''}`)
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
              throw new Error(`[bilibili_get_upload_id]HTTP error! status: ${res.status}`)
            }
            return res.json().catch((e) => {
              if (times + 1 >= maxRetryTime) {
                console.error(`wswTest:[bilibili_get_upload_id]res.json():${e?.message || ''}`)
                return null
              }
              return bilibili_get_upload_id(params, times + 1)
            })
          })
          .then((data) => {
            const upload_id = data?.upload_id || ''
            if (!upload_id) {
              console.error(
                `wswTest:[bilibili_get_upload_id]empty_upload_id:${JSON.stringify(data)}`
              )
              return null
            }
            return { upload_id }
          })
          .catch((e) => {
            if (times + 1 >= maxRetryTime) {
              console.error(`wswTest:[bilibili_get_upload_id]fetch:${e?.message || ''}`)
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
        _totalChunks = totalChunks
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
                throw new Error(`[bilibili_stream_upload_video]HTTP error! status: ${res.status}`)
              }
              return res.text().catch((e) => {
                if (times + 1 >= maxRetryTime) {
                  console.error(
                    `wswTest:[bilibili_stream_upload_video]res.text():${e?.message || ''}`
                  )
                  return null
                }
                return bilibili_stream_upload_video(file, params, times + 1)
              })
            })
            .then((res) => {
              if ('MULTIPART_PUT_SUCCESS' !== res?.trim()) {
                console.error(`wswTest:[bilibili_stream_upload_video]upload_failed:${res?.trim()}`)
                return null
              }
              return 'MULTIPART_PUT_SUCCESS' === res?.trim()
            })
            .catch((e) => {
              if (times + 1 >= maxRetryTime) {
                console.error(`wswTest:[bilibili_stream_upload_video]fetch:${e?.message || ''}`)
                return null
              }
              return bilibili_stream_upload_video(file, params, times + 1)
            })
        }
        return uploadSuccess
      }

      /**
       * 视频分段合并请求
       * 通知oss服务器，将已经上传的分段合并为一个完整的视频
       */
      const bilibili_upload_video_concat = async (params, times = 0) => {
        const { auth, endpoint, upload_path, ...restParams } = params || {}
        const api = `${endpoint}/${upload_path}`

        return fetch(`${api}?${qstr(restParams)}`, {
          method: 'post',
          headers: {
            'Content-Type': 'application/json',
            Origin: 'https://member.bilibili.com',
            Referer: 'https://member.bilibili.com/',
            'X-Upos-Auth': auth
          },
          body: JSON.stringify({ parts: [{ partNumber: Number(_totalChunks), eTag: 'etag' }] })
        })
          .then((res) => {
            if (!res.ok) {
              throw new Error(`[bilibili_upload_video_concat]HTTP error! status: ${res.status}`)
            }
            return res.json().catch((e) => {
              if (times + 1 >= maxRetryTime) {
                console.error(`wswTest:[bilibili_upload_video_concat]:${e?.message || ''}`)
                return null
              }
              return bilibili_upload_video_concat(params, times + 1)
            })
          })
          .then((res) => {
            if (res.OK !== 1) {
              console.error(`wswTest:[bilibili_upload_video_concat]not_ok:${JSON.stringify(res)}`)
              return false
            }
            return true
          })
          .catch((e) => {
            if (times + 1 >= maxRetryTime) {
              console.error(`wswTest:[bilibili_upload_video_concat]fetch:${e?.message || ''}`)
              return null
            }
            return bilibili_upload_video_concat(params, times + 1)
          })
      }

      /**
       * 视频投稿送审批
       */
      const bilibili_video_draft_auditing = (draft_params, times = 0) => {
        const video_draft_auditing_api = `https://member.bilibili.com/x/vu/web/add/v3?t=${new Date().getTime()}&csrf=${getCookieValueByName('bili_jct')}`
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
              throw new Error(`[bilibili_video_draft_auditing]HTTP error! status: ${res.status}`)
            }
            return res.json().catch((e) => {
              if (times + 1 >= maxRetryTime) {
                console.error(
                  `wswTest:[bilibili_video_draft_auditing]res.json():${e.message || ''}`
                )
                return null
              }
              return bilibili_video_draft_auditing(draft_params, times + 1)
            })
          })
          .then((data) => {
            const { aid, bvid } = data?.data || {}
            if (!aid && !bvid) {
              console.error(
                `wswTest:[bilibili_video_draft_auditing]no_aid_and_no_bvid:${JSON.stringify(data)}`
              )
              return null
            }
            return { aid, bvid }
          })
          .catch((e) => {
            if (times + 1 >= maxRetryTime) {
              console.error(`wswTest:[bilibili_video_draft_auditing]fetch:${e?.message || ''}`)
              return null
            }
            return bilibili_video_draft_auditing(draft_params, times + 1)
          })
      }

      /**
       * 视频封面上传
       */
      const bilibili_video_cover_upload = (params, times = 0) => {
        const formData = new URLSearchParams()
        for (let param in params) {
          formData.append(param, params[param])
        }
        const api = `https://member.bilibili.com/x/vu/web/cover/up?t=${new Date().getTime()}`

        return fetch(api, {
          method: 'post',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: formData
        })
          .then((res) => {
            if (!res.ok) {
              throw new Error(`[bilibili_video_cover_upload]HTTP error! status: ${res.status}`)
            }
            return res.json().catch((e) => {
              if (times + 1 >= maxRetryTime) {
                console.error(`wswTest:[bilibili_video_cover_upload]res.json():${e?.message || ''}`)
                return null
              }
              return bilibili_video_cover_upload(params, times + 1)
            })
          })
          .then((data) => {
            const cover_url = data?.data?.url || ''
            if (!cover_url) {
              console.error(
                'wswTest:[bilibili_video_cover_upload]empty_cover:',
                JSON.stringify(data)
              )
              return null
            }
            return { cover_url }
          })
          .catch((e) => {
            if (times + 1 >= maxRetryTime) {
              console.error(`wswTest:[bilibili_video_cover_upload]fetch:${e?.message || ''}`)
              return null
            }
            return bilibili_video_cover_upload(params, times + 1)
          })
      }

      const distribute_draft = async (cover_file, video_file, index = 0) => {
        let cover_url = ''
        const { size: videoSize, name: fileName } = videoList[index] || {}
        console.log('wswTest:', '===============================')
        console.log('wswTest: 开始分发', `${fileName}`)
        console.log('wswTest:', '===============================')
        // S4: 上传封面
        if (cover_file) {
          const cover_file_base64 = await read_file_base64(cover_file)
          const upload_res = await bilibili_video_cover_upload({
            cover: cover_file_base64,
            csrf: getCookieValueByName('bili_jct')
          })
          cover_url = (upload_res || {}).cover_url || ''
        }
        if (video_file) {
          // S1: 对视频建立上传任务
          const video_task_info = await bilibili_create_update_task({
            ssl: 0,
            r: 'upos',
            zone: 'cs',
            upcdn: 'qn',
            build: '2140000',
            version: '2.14.0.0',
            webVersion: '2.14.0',
            probe_version: '20221109',
            profile,
            name: fileName,
            size: videoSize
          })
          if (!video_task_info) {
            console.error('wswTest: 创建视频上传任务失败')
            return false
          }
          console.log('wswTest: 创建视频上传任务成功', JSON.stringify(video_task_info))

          const { chunk_size, biz_id, upload_path, endpoint, auth } = video_task_info || {}
          // S2: 获取上传任务id
          const { upload_id } =
            (await bilibili_get_upload_id({
              auth,
              biz_id,
              profile,
              endpoint,
              upload_path,
              filesize: videoSize,
              partsize: chunk_size
            })) || {}
          if (!upload_id) {
            console.error('wswTest: 获取上传任务id失败')
            return false
          }
          console.log('wswTest: 获取上传任务id成功', upload_id)

          // S3: 启动上传任务
          const upload_result = await bilibili_stream_upload_video(video_file, {
            auth,
            endpoint,
            upload_path,
            size: videoSize,
            chunk_size,
            uploadId: upload_id
          })
          if (!upload_result) {
            console.error('wswTest: 上传视频文件失败', upload_result)
            return false
          }
          console.log('wswTest: 上传视频文件成功', upload_result, upload_id)

          // S4: 合片
          const concat_result = await bilibili_upload_video_concat({
            auth,
            endpoint,
            upload_path,
            biz_id,
            profile,
            name: fileName,
            output: 'json',
            uploadId: upload_id
          })
          if (!concat_result) {
            console.error('wswTest: 视频合片失败', upload_result)
            return false
          }
          console.log('wswTest: 视频合片成功', concat_result)

          // S5: 投稿
          const upload_file_name = upload_path?.split?.('/')?.[1] || ''
          const upload_draft_result = await bilibili_video_draft_auditing({
            title: `${videoInfo?.title_prefix || ''}${fileName}`, // 视频标题
            desc: videoInfo?.desc || '', // 视频介绍
            tag: videoInfo?.tag || '', // 标签
            cover: cover_url, // 视频封面
            // b站特有的字段
            desc_format_id: videoInfo?.desc_format_id || 0, //
            copyright: videoInfo?.bilibili_copyright || 1, // 自制1 转载2
            act_reserve_create: videoInfo?.bilibili_act_reserve_create || 0, //
            no_disturbance: videoInfo?.bilibili_no_disturbance || 0,
            no_reprint: videoInfo?.bilibili_no_reprint || 1, // 禁止转载 0：无 1：禁止
            open_elec: videoInfo?.bilibili_open_elec || 1, // 是否开启充电 0: 无 1: 开启
            tid: videoInfo?.bilibili_tid || '', // 分区ID https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/video/video_zone.md
            recreate: videoInfo?.bilibili_recreate || 1, //
            dynamic: videoInfo?.dynamic || '', //
            interactive: videoInfo?.interactive || 0, //
            subtitle: { open: 0, lan: 'zh-CN' }, // 字幕相关
            dolby: videoInfo?.bilibili_dolby || 0, //
            lossless_music: videoInfo?.lossless_music || 0, //
            up_selection_reply: videoInfo?.up_selection_reply || false, //
            up_close_reply: videoInfo?.up_close_reply || false, //
            up_close_danmu: videoInfo?.up_close_danmu || false, //
            csrf: getCookieValueByName('bili_jct'), // 防跨站伪造攻击
            mission_id: videoInfo?.bilibili_mission_id || '', // 任务id
            topic_id: videoInfo?.bilibili_topic_id || '', // 话题id
            videos: [{ filename: upload_file_name?.split?.('.')?.[0] }]
            // 其他平台特有字段
          })
          if (!upload_draft_result) {
            console.log('wswTest:', '===============================')
            console.log('wswTest: 分发结束', `${fileName}`)
            console.error('wswTest: 投稿失败')
            console.log('wswTest:', '===============================')
            return false
          }
          console.log('wswTest:', '===============================')
          console.log('wswTest: 分发结束', `${fileName}`)
          console.info('wswTest: 投稿成功', JSON.stringify(upload_draft_result))
          console.info(
            'wswTest: 稿件地址',
            `https://www.bilibili.com/video/${upload_draft_result?.bvid || ''}/`
          )
          console.log('wswTest:', '===============================')
          return true
        }
      }

      // 视频上传基础参数
      const profile = 'ugcfx%2Fbup'
      const fileInputElement = document.querySelector(`#${videoUploadInput}`)
      fileInputElement.addEventListener('change', async (event) => {
        const files = event?.target?.files || []
        let distribute_times = 0
        let distribute_success = 0
        const success_video_list = []
        console.log('wswTest: 开始分发当前选中视频队列')
        for (let i = 0; i < files.length; i = i + 2) {
          if (!files[i] || !files[i + 1]) {
            return
          }
          distribute_times++
          // TODO:(wsw) 传入文件数量不足2
          const distribute_res = await distribute_draft(files[i], files[i + 1], i / 2)
          if (distribute_res) {
            success_video_list.push(videoList[i / 2])
            distribute_success = distribute_success + 1
          }
          const wait_time = Math.ceil(Math.max(0.2, Math.random()) * 10) * 1000
          console.log(`wswTest: 等待${wait_time / 1000}秒，继续投稿`)
          await new Promise((resolve) => setTimeout(resolve, wait_time))
        }
        if (distribute_success === distribute_times) {
          console.info(
            `wswTest: 当前视频队列已分发完毕，成功${distribute_success}个/共${distribute_times}个`
          )
        } else {
          console.error(
            `wswTest: 当前视频队列已分发完毕，成功${distribute_success}个/共${distribute_times}个`
          )
        }
        console.log(`${RM_SUCCESS_VIDEOS}${JSON.stringify(success_video_list)}`)
      })
    },
    { videoInfo, videoList, videoUploadInput, maxRetryTime, RM_SUCCESS_VIDEOS }
  )

  // TODO:(wsw) videoInfo.video 无值
  // TODO:(wsw) videoInfo.video 对应非视频
  // 触发文件上传，开始投稿流程
  const elementHandle = await mainPage.$(`#${videoUploadInput}`)
  // TODO:(wsw) 获取封面失败
  const drafts_list = []
  // 获取封面图片，保存并上传
  for (let vid = 0; vid < videoList.length; vid++) {
    const videoObj = videoList[vid]
    const cover_path = await get_cover_from_video(videoObj?.path)
    drafts_list.push(cover_path)
    drafts_list.push(videoObj?.path)
  }
  await elementHandle.uploadFile(...drafts_list)
}

export default platform_upload_video
