/**
 * 系统配置
 * 都是在进行时中才能获取的变量
 */
import configPath from '../../../resources/BaoganAiConfig.json?commonjs-external&asset&asarUnpack'
// windows下调试
// import mainProcessBin from '../../../resources/sdk/main_process/bin/main.exe?asset&asarUnpack'
// macos 下调试
// import mainProcessBin from '../../../resources/sdk/main_process/bin/main?asset&asarUnpack'

// 所有路径，统一在初始化的时候进行测试和创建
console.log('wswTestconfigPath: ', configPath)

// 环境变量
const isWindows = process.platform === 'win32'
const isMac = process.platform === 'darwin'

// export { isMac, isWindows, configPath, mainProcessBin }
export { isMac, isWindows, configPath }
