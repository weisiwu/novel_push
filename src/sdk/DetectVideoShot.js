// This file is auto-generated, don't edit it
// 依赖的模块可通过下载工程中的模块依赖文件或右上角的获取 SDK 依赖信息查看
import videorecog20200320, * as $videorecog20200320 from '@alicloud/videorecog20200320'
import OpenApi, * as $OpenApi from '@alicloud/openapi-client'
import Console from '@alicloud/tea-console'
import Util, * as $Util from '@alicloud/tea-util'
import * as $tea from '@alicloud/tea-typescript'
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

  // TODO:(wsw) 非得传递到oss吗？
  static async main(videoUrlObject, cb) {
    let client = Client.createClient(apiConfig.accessKeyId, apiConfig.accessKeySecret)
    // 本地视频解析参考文档，需要将选择的视频文件转化为Stream格式
    // https://help.aliyun.com/zh/viapi/developer-reference/node-js?spm=a2c4g.11186623.0.i6
    // let detectVideoShotRequest = new $videorecog20200320.DetectVideoShotAdvanceRequest({
    let detectVideoShotRequest = new $videorecog20200320.DetectVideoShotRequest({
      // videoUrlObject: videoUrlObject
      videoUrl:
        'https://novel-test-1-1.oss-cn-shanghai.aliyuncs.com/demo.mp4?Expires=1709516575&OSSAccessKeyId=TMP.3KebbRdXekqXryv53rSUQUoJY15ni2xUGWYbY9j8cSSNRsxtLGVpcNeD9gGHFPARy295zEkS8fL2x38BjbnKPcJuEcqFcj&Signature=%2FEfuL9Y7Dnb2kqZ5xRL5Crrgxj4%3D'
    })
    let runtime = new $Util.RuntimeOptions({})
    try {
      let resp = await client.detectVideoShotWithOptions(detectVideoShotRequest, runtime)
      cb?.(resp)
    } catch (error) {
      // 错误 message
      console.log(error.message)
      // 诊断地址
      console.log(error.data['Recommend'])
      Util.assertAsString(error.message)
    }
  }
}
