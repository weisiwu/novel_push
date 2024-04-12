import puppeteer from 'puppeteer'

class PuppeteerManager {
  constructor(headless = true) {
    if (!PuppeteerManager.instance) {
      this.browser = null
      this.headless = headless
      PuppeteerManager.instance = this
    }
    return PuppeteerManager.instance
  }

  async launch() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: this.headless
      })
    }
    return this.browser
  }
}

export default new PuppeteerManager()
