import { join, dirname } from 'path'
import { exec } from 'child_process'
import videorecog20200320, * as $videorecog20200320 from '@alicloud/videorecog20200320'
import * as $OpenApi from '@alicloud/openapi-client'
import * as $Util from '@alicloud/tea-util'
import GetAsyncJobResult from './GetAsyncJobResult'
import apiConfig from './ali_linzhi_config.json'

export default class Client {
  /**
   * 使用AK&SK初始化账号Client
   * @param accessKeyId
   * @param accessKeySecret
   * @return Client
   * @throws Exception
   */
  static createClient(accessKeyId, accessKeySecret) {
    let config = new $OpenApi.Config({
      // 必填，您的 AccessKey ID
      accessKeyId: accessKeyId,
      // 必填，您的 AccessKey Secret
      accessKeySecret: accessKeySecret
    })
    // Endpoint 请参考 https://api.aliyun.com/product/videorecog
    config.endpoint = `videorecog.cn-shanghai.aliyuncs.com`
    return new videorecog20200320.default(config)
  }

  /**
   * 使用STS鉴权方式初始化账号Client，推荐此方式。
   * @param accessKeyId
   * @param accessKeySecret
   * @param securityToken
   * @return Client
   * @throws Exception
   */
  static createClientWithSTS(accessKeyId, accessKeySecret, securityToken) {
    let config = new $OpenApi.Config({
      // 必填，您的 AccessKey ID
      accessKeyId: accessKeyId,
      // 必填，您的 AccessKey Secret
      accessKeySecret: accessKeySecret,
      // 必填，您的 Security Token
      securityToken: securityToken,
      // 必填，表明使用 STS 方式
      type: 'sts'
    })
    // Endpoint 请参考 https://api.aliyun.com/product/videorecog
    config.endpoint = `videorecog.cn-shanghai.aliyuncs.com`
    return new videorecog20200320.default(config)
  }

  static async main({ videoUrlObject, filePath, event }) {
    let client = Client.createClient(apiConfig.accessKeyId, apiConfig.accessKeySecret)
    // 本地视频解析参考文档，需要将选择的视频文件转化为Stream格式
    // https://help.aliyun.com/zh/viapi/developer-reference/node-js?spm=a2c4g.11186623.0.i6
    let detectVideoShotRequest = new $videorecog20200320.DetectVideoShotAdvanceRequest()
    detectVideoShotRequest.videoUrlObject = videoUrlObject
    let runtime = new $Util.RuntimeOptions({})
    try {
      const result = await client.detectVideoShotAdvance(detectVideoShotRequest, runtime)
      const requestId = result?.body?.requestId
      const resultImgs = []
      let timer = setInterval(() => {
        GetAsyncJobResult.main(requestId, (result2) => {
          const quereyResult = result2?.body?.data?.result || '{}'
          const quereyStatus = result2?.body?.data?.status || ''
          if (quereyStatus !== 'PROCESS_SUCCESS') {
            return
          }

          const frames = JSON.parse((JSON.parse(quereyResult) || {})?.ShotFrameIds || '[]')
          console.log(`正在查询任务结果: ${requestId} 结果为: ${JSON.stringify(frames)}`)
          const outputFilePattern = join(dirname(filePath), 'frame-%03d.png')
          const frameIndexFilter = frames
            ?.map?.((part, index) => {
              // 取中间帧，以达到画面稳定
              const next = frames[index + 1]
              if (!next) {
                return part
              }
              resultImgs.push(
                join(dirname(filePath), `frame-${String(index + 1).padStart(3, 0)}.png`)
              )
              return Math.ceil((next + part) / 2)
            })
            ?.map?.((part) => {
              return `eq(n\\,${part})`
            })
            ?.join('+')

          exec(
            `ffmpeg -i ${filePath} -vf "select=${frameIndexFilter}" -vsync vfr ${outputFilePattern}`,
            (error) => {
              if (error) {
                console.error('error:', error)
                return
              }
              event.sender.send('cut-video-complete', resultImgs)
            }
          )
          clearInterval(timer)
        })
      }, 5000)
    } catch (error) {
      // 错误 message
      console.log('DetectVideoShot error', error?.message)
      console.log('DetectVideoShot error Full', error)
    }
  }
}
