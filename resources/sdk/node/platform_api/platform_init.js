import cookies from '../../../cookies/BilibiliCookies.json'
import puppeteer_manage from './puppeteer_manage.js'

const maxRetryTimes = 3
const update_topic_list = 'wswTest:update_topic_list'
const update_mission_list = 'wswTest:update_mission_list'

const platform_init = async (tid, updateProgress) => {
  if (!tid) {
    return
  }
  updateProgress(`初始化平台特定信息: 任务、话题`)
  const headless = true
  const browser = await puppeteer_manage.launch(headless)
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

  await initPage.setExtraHTTPHeaders({
    Cookie: cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ')
  })

  await initPage.evaluate(
    async (params) => {
      const { tid, update_topic_list, update_mission_list } = params || {}

      /**
       * 获取任务列表
       */
      const update_missions_list = async (tid, times = 0) => {
        return fetch(
          `https://member.bilibili.com/x/app/h5/mission/type/v3?tid=${tid}&from=0&pn=1&ps=10&version=0&t=${new Date().getTime()}`
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
                return update_missions_list(tid, times + 1)
              }
              return []
            }
          })
          .catch((e) => {
            if (times < maxRetryTimes) {
              return update_missions_list(tid, times + 1)
            }
            return []
          })
      }

      /**
       * 获取话题列表
       */
      const update_topics_list = async (tid, times = 0) => {
        return fetch(
          `https://member.bilibili.com/x/vupre/web/topic/type?type_id=${tid}&pn=0&ps=6&title=&t=${new Date().getTime()}`,
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
                return update_topics_list(tid, times + 1)
              }
              return []
            }
          })
          .catch((e) => {
            if (times < maxRetryTimes) {
              return update_topics_list(tid, times + 1)
            }
            return []
          })
      }

      console.log('wswTest: 开始刷新任务')
      const mission_list = await update_missions_list(tid)
      if (mission_list?.length) {
        console.info('wswTest: 刷新任务成功')
      } else {
        console.error('wswTest: 刷新任务失败')
      }
      console.log(`${update_mission_list}${JSON.stringify(mission_list)}`)

      console.log('wswTest: 开始刷新话题')
      const topic_list = await update_topics_list(tid)
      if (topic_list?.length) {
        console.info('wswTest: 刷新话题成功')
      } else {
        console.error('wswTest: 刷新话题失败')
      }
      console.log(`${update_topic_list}${JSON.stringify(topic_list)}`)
    },
    { tid, update_topic_list, update_mission_list }
  )

  await browser.close()
}

export default platform_init
