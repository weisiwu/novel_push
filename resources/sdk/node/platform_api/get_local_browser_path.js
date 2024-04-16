import { debug } from '../../../../package.json'
// TODO:(wsw) mac临时注释
// import browserPath from '../../../puppeteer/chrome/win64-123.0.6312.105/chrome-win64/chrome.exe?commonjs-external&asset&asarUnpack'
// import browserHeaderlessPath from '../../../puppeteer/chrome-headless-shell/win64-123.0.6312.105/chrome-headless-shell-win64/chrome-headless-shell.exe?commonjs-external&asset&asarUnpack'

class GetBrowserPath {
  constructor() {
    this.browserPath = ''
  }

  get(headerless) {
    if (debug) {
      return ''
    }
    // if (headerless) {
    //   return browserHeaderlessPath
    // }
    // return browserPath
  }
}

export default new GetBrowserPath()
