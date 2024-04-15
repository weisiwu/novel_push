import { join } from 'path'
import crypto from 'crypto'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import puppeteer_manage from './puppeteer_manage.js'
import baoganDistributeConfigPath from '../../../BaoganDistributeConfig.json?commonjs-external&asset&asarUnpack'

const maxEnvironments = 3
const md5hash = (str) => crypto.createHash('md5').update(str).digest('hex')

/**
 * 新建环境
 */
const create_new_environment = async ({ name = '' } = {}, updateProgress, event) => {
  let localConfig = null
  try {
    if (!existsSync(baoganDistributeConfigPath)) {
      event.sender.send('create-new-environment-result', '')
      updateProgress(
        `[${new Date().toLocaleString()}]新建环境(${name})失败: 无本地配置文件`,
        'error'
      )
      return
    }
    localConfig = JSON.parse(readFileSync(baoganDistributeConfigPath).toString())
    const newUserDataPath = join(process.resourcesPath, md5hash(name || '').slice(0, 32))
    console.log('wswTest: 新的用户信息保存环境是', newUserDataPath)
    if (localConfig.environments?.length >= maxEnvironments) {
      event.sender.send('create-new-environment-result', '')
      updateProgress(
        `[${new Date().toLocaleString()}]新建环境(${name})失败: 超出最大数量限制:${maxEnvironments}`,
        'error'
      )
      return
    }
    localConfig.environments?.push({ path: newUserDataPath, name })
    localConfig.useEnvironment = name
    const browser = await puppeteer_manage.launch(false, { userDataDir: newUserDataPath })
    await browser.close()
    event.sender.send('create-new-environment-result', 'true')
    updateProgress(`[${new Date().toLocaleString()}]新建环境(${name})成功`, 'success')
  } catch (e) {
    event.sender.send('create-new-environment-result', '')
    updateProgress(
      `[${new Date().toLocaleString()}]新建环境(${name})失败: ${e?.message || ''}`,
      'error'
    )
    console.log('wswTest: 读取本地配置失败', e)
  }

  // 初始化完毕后，将改动写入
  writeFileSync(baoganDistributeConfigPath, JSON.stringify(localConfig))
}

export default create_new_environment
