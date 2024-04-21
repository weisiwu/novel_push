import { join } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import puppeteer_manage from './puppeteer_manage.js'
import baoganDistributeConfigPath from '../../../BaoganDistributeConfig.json?commonjs-external&asset&asarUnpack'

const maxRetryTimes = 3
const update_topic_list = 'wswTest:update_topic_list'
const update_mission_list = 'wswTest:update_mission_list'
const chromeUserDataPath = join(process.resourcesPath, 'chromeUserData')

/**
 * b站相关初始化
 */
const init_bilibili_platform = async ({ bilibili_tid, updateProgress } = {}) => {
  updateProgress(`初始化平台特定信息: 任务、话题`)
  const browser = await puppeteer_manage.launch(true)
  const initPage = await browser.newPage()

  await initPage.goto('https://member.bilibili.com/', { waitUntil: 'load' })

  initPage.on('console', (msg) => {
    const m_type = msg.type()
    const m_text = msg.text()
    if (m_text.indexOf(update_topic_list) >= 0) {
      const raw_str = m_text?.replace?.(update_topic_list, '')?.trim()
      return updateProgress(m_text, 'info', 'normal', { data: raw_str, type: 'topic' })
    } else if (m_text.indexOf(update_mission_list) >= 0) {
      const raw_str = m_text?.replace?.(update_mission_list, '')?.trim()
      return updateProgress(m_text, 'info', 'normal', { data: raw_str, type: 'mission' })
    }

    if (m_text?.indexOf('wswTest:') < 0) {
      return
    }
    console.log(`BROWSER LOG: ${m_text}`)
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

  await initPage.evaluate(
    async (params) => {
      const { bilibili_tid, update_topic_list, update_mission_list } = params || {}

      /**
       * 获取任务列表
       */
      const update_missions_list = async (bilibili_tid, times = 0) => {
        return fetch(
          `https://member.bilibili.com/x/app/h5/mission/type/v3?bilibili_tid=${bilibili_tid}&from=0&pn=1&ps=10&version=0&t=${new Date().getTime()}`
        )
          .then(async (res) => {
            if (res.ok) {
              const resJson = await res.json()
              return resJson?.data?.acts?.map?.((act) => {
                return {
                  value: act.id,
                  label: act.name,
                  protocol: act.protocol,
                  url: act.act_url
                }
              })
            } else {
              if (times < maxRetryTimes) {
                return update_missions_list(bilibili_tid, times + 1)
              }
              return false
            }
          })
          .catch((e) => {
            if (times < maxRetryTimes) {
              return update_missions_list(bilibili_tid, times + 1)
            }
            return false
          })
      }

      /**
       * 获取话题列表
       */
      const update_topics_list = async (bilibili_tid, times = 0) => {
        return fetch(
          `https://member.bilibili.com/x/vupre/web/topic/type?type_id=${bilibili_tid}&pn=0&ps=6&title=&t=${new Date().getTime()}`,
          {
            headers: {
              Origin: 'https://member.bilibili.com',
              Referer: 'https://member.bilibili.com/'
            }
          }
        )
          .then(async (res) => {
            if (res.ok) {
              const resJson = await res.json()
              return resJson.data?.topics?.map?.((topic) => {
                return {
                  value: topic.topic_id,
                  label: topic.topic_name,
                  description: topic.description,
                  mission_id: topic.mission_id
                }
              })
            } else {
              if (times < maxRetryTimes) {
                return update_topics_list(bilibili_tid, times + 1)
              }
              return []
            }
          })
          .catch((e) => {
            if (times < maxRetryTimes) {
              return update_topics_list(bilibili_tid, times + 1)
            }
            return []
          })
      }

      console.log(`wswTest: 开始刷新任务${bilibili_tid}`)
      const mission_list = await update_missions_list(bilibili_tid)
      if (!mission_list) {
        console.error('wswTest: 刷新任务失败')
      } else if (mission_list?.length) {
        console.info('wswTest: 刷新任务成功')
      } else {
        console.error('wswTest: 刷新任务为空')
      }
      console.log(`${update_mission_list}${JSON.stringify(mission_list)}`)

      console.log('wswTest: 开始刷新话题')
      const topic_list = await update_topics_list(bilibili_tid)
      if (topic_list?.length) {
        console.info('wswTest: 刷新话题成功')
      } else {
        console.error('wswTest: 刷新话题失败')
      }
      console.log(`${update_topic_list}${JSON.stringify(topic_list)}`)
    },
    { bilibili_tid, update_topic_list, update_mission_list }
  )
}

/**
 * 获取快手所有视频分类
 */
const fetch_kuaishou_type_list = async ({ updateProgress } = {}) => {
  const browser = await puppeteer_manage.launch(true)
  const initPage = await browser.newPage()
  const typeListAPI = 'https://cp.kuaishou.com/rest/cp/works/v2/video/pc/upload/domain/list'

  initPage.goto(typeListAPI)
  initPage.on('response', async (response) => {
    const respUrl = response.url()
    if (respUrl.indexOf(typeListAPI) >= 0 && response.status() >= 200 && response.status() < 300) {
      const resp = (await response.json()) || {}
      const { data, result } = resp || {}
      if (Number(result) === 1) {
        updateProgress(`获取快手平台视频分类列表`)
        // 有第四个参数的都是发送数据，非log
        updateProgress('', 'info', 'normal', { data, type: 'kuaishou_video_type' })
      } else {
        updateProgress(`获取快手平台视频分类列表失败`, 'error')
        updateProgress('', 'info', 'normal', { data, type: 'kuaishou_video_type' })
      }
      initPage.close()
    }
  })
}

/**
 * 整体进程初始化
 * 1、读取本地所有环境
 * 2、读取所有分发平台信息
 * 3、读取视频分发模板信息
 */
const platform_init = async ({ updateProgress, event } = {}) => {
  let localConfig = null
  try {
    updateProgress(`[初始化]读取本地配置文件`)
    if (!existsSync(baoganDistributeConfigPath)) {
      event.sender.send('platform-init-result', 'null')
      updateProgress(`[${new Date().toLocaleString()}]读取本地配置失败: 无本地配置文件`, 'error')
      return
    }
    localConfig = JSON.parse(readFileSync(baoganDistributeConfigPath).toString())
    updateProgress(`[${new Date().toLocaleString()}]成功读取本地配置`, 'success')
    updateProgress(`[初始化]读取本地环境列表`)
    if (!localConfig?.environments?.length) {
      updateProgress(`[初始化]初始化本地环境列表`)
      localConfig.environments = [
        {
          path: chromeUserDataPath,
          name: '默认环境'
        }
      ]
      localConfig.useEnvironment = '默认环境'
    }
    event.sender.send('platform-init-result', JSON.stringify(localConfig))
  } catch (e) {
    event.sender.send('platform-init-result', 'null')
    updateProgress(`[${new Date().toLocaleString()}]读取本地配置失败: ${e?.message || ''}`, 'error')
    console.log('wswTest: 读取本地配置失败', e)
    return
  }

  if (localConfig) {
    // 初始化完毕后，将改动写入
    writeFileSync(baoganDistributeConfigPath, JSON.stringify(localConfig))
  }
}

export default platform_init
export { init_bilibili_platform, fetch_kuaishou_type_list }
