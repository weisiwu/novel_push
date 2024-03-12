/**
 * 系统配置
 * 都是在进行时中才能获取的变量
 */
import { join } from 'path'
import sceneDetectBin from '../../../resources/sdk/py_sencedetect/bin/scenedetect.exe?asset&asarUnpack'
import cutPartsBin from '../../../resources/sdk/auto_clip_video/bin/auto_clip_video.exe?asset&asarUnpack'
import concatVideoPath from '../../../resources/sdk/concat_video/bin/concat_video.exe?asset&asarUnpack'

// 所有路径，统一在初始化的时候进行测试和创建
const appPath = process.resourcesPath
// 视频处理结果输出根目录
const outputPath = join(appPath, 'resources', 'output')
// 视频分段结果存储位置
const videoPartsOutputPath = join(outputPath, 'video_parts')
// 视频最终获取所有关键帧图片存放位置
const videoFramesOutputPath = join(outputPath, 'video_frames')

// 绘图负面提示词
const negativePrompt = [
  'nsfw',
  'paintings',
  'cartoon',
  'anime',
  'sketches',
  'worst quality',
  'low quality',
  'normal quality',
  'lowres',
  'watermark',
  'monochrome',
  'grayscale',
  'ugly',
  'blurry',
  'Tan skin',
  'dark skin',
  'black skin',
  'skin spots',
  'skin blemishes',
  'age spot',
  'glans',
  'disabled',
  'distorted',
  'bad anatomy',
  'morbid',
  'malformation',
  'amputation',
  'bad proportions',
  'twins',
  'missing body',
  'fused body',
  'extra head',
  'poorly drawn face',
  'bad eyes',
  'deformed eye',
  'unclear eyes',
  'cross-eyed',
  'long neck',
  'malformed limbs',
  'extra limbs',
  'extra arms',
  'missing arms',
  'bad tongue',
  'strange fingers',
  'mutated hands',
  'missing hands',
  'poorly drawn hands',
  'extra hands',
  'fused hands',
  'connected hand',
  'bad hands',
  'wrong fingers',
  'missing fingers',
  'extra fingers',
  '4 fingers',
  '3 fingers',
  'deformed hands',
  'extra legs',
  'bad legs',
  'many legs',
  'more than two legs',
  'bad feet',
  'wrong feet',
  'extra feets',
  'facelowres',
  'bad anatomy',
  'bad hands',
  'text',
  'error',
  'missing fingers',
  'extra digit',
  'fewer digits',
  'cropped',
  'worst quality',
  'low quality',
  'normal quality',
  'jpeg artifacts',
  'signature',
  'watermark',
  'username',
  'blurry',
  'bad feet',
  'ugly',
  'duplicate',
  'trannsexual',
  'hermaphrodite',
  'out of frame',
  'extra fingers',
  'mutated hands',
  'poorly drawn hands',
  'poorly drawn face',
  'mutation',
  'deformed',
  'blurry',
  'bad anatomy',
  'bad proportions',
  'extra limbs',
  'cloned face',
  'disfigured',
  'more than 2 nipples',
  'out of frame',
  'ugly',
  'extra limbs',
  'bad anatomy',
  'gross',
  'worst quality',
  'low quality',
  'normal quality',
  'signature',
  'watermark',
  'username',
  'blurry',
  'proportions',
  'malformed limbs',
  'missing arms',
  'missing legs',
  'extra arms',
  'extra legs',
  'mutated hands',
  'fused fingers',
  'too many fingers',
  'long neck'
]

// 环境变量
const isWindows = process.platform === 'win32'
const isMac = process.platform === 'darwin'

// sdk路径
const sdkBasePath = join(appPath, 'resources', 'sdk')

export {
  isWindows,
  isMac,
  outputPath,
  videoFramesOutputPath,
  videoPartsOutputPath,
  negativePrompt,
  sdkBasePath,
  sceneDetectBin,
  cutPartsBin,
  concatVideoPath
}
