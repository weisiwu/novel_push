// This file is auto-generated, don't edit it
// 依赖的模块可通过下载工程中的模块依赖文件或右上角的获取 SDK 依赖信息查看
import videorecog20200320, * as $videorecog20200320 from '@alicloud/videorecog20200320'
import * as $OpenApi from '@alicloud/openapi-client'
import * as $Util from '@alicloud/tea-util'
import apiConfig from './AliyunServer.json'

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

  static async main(requestId, cb) {
    // 请确保代码运行环境设置了环境变量 ALIBABA_CLOUD_ACCESS_KEY_ID 和 ALIBABA_CLOUD_ACCESS_KEY_SECRET。
    // 工程代码泄露可能会导致 AccessKey 泄露，并威胁账号下所有资源的安全性。以下代码示例仅供参考，建议使用更安全的 STS 方式，更多鉴权访问方式请参见：https://help.aliyun.com/document_detail/378664.html
    let client = Client.createClient(apiConfig.accessKeyId, apiConfig.accessKeySecret)
    let getAsyncJobResultRequest = new $videorecog20200320.GetAsyncJobResultRequest({
      jobId: requestId
    })
    let runtime = new $Util.RuntimeOptions({
      readTimeout: 10000,
      connectTimeout: 10000
    })
    try {
      let resp = await client.getAsyncJobResultWithOptions(getAsyncJobResultRequest, runtime)
      cb?.(resp)
    } catch (error) {
      console.log(`【error】GetAsyncJobResult =>`, error)
    }
  }
}
