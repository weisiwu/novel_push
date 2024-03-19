/**
 * 系统配置
 * 都是在进行时中才能获取的变量
 */
import { join, resolve } from 'path'
import mainProcessBin from '../../../resources/sdk/main_process/bin/main.exe?asset&asarUnpack'

// 所有路径，统一在初始化的时候进行测试和创建
const appPath = process.cwd()

// wswTest: process.resourcesPath1 C:\Users\Administrator\Desktop\github\novel_push\dist\win-unpacked
// wswTest: process.resourcesPath2 C:\Users\Administrator\Desktop\github\novel_push\dist\win-unpacked\resources
// wswTest: process.resourcesPath3 C:\Users\Administrator\Desktop\github\novel_push\dist\win-unpacked\resources\app.asar\out\main
console.log('wswTest: process.resourcesPath1', appPath)
console.log('wswTest: process.resourcesPath2', process.resourcesPath)
console.log('wswTest: process.resourcesPath3', resolve(__dirname))
const configPath = join(appPath, 'resources', 'BaoganAiConfig.json')
console.log('wswTestconfigPath: ', configPath)

// 环境变量
const isWindows = process.platform === 'win32'
const isMac = process.platform === 'darwin'

export { isMac, isWindows, configPath, mainProcessBin }
