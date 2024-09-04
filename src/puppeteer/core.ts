import { common } from '@Common'
import logger from '@logger'
import crypto from 'crypto'
import InitChrome from '../init/init'
import { core } from '../imports/EventEmitter'
import Puppeteer, { screenshot, screenshotRes } from './index'

export interface RunConfig {
  /**
   * 启动浏览器数量
   * @default 1
   */
  browserCount?: number
  /**
   * 传递给浏览器实例的其他命令行参数
   */
  args: string[]
  /**
   * 指定要使用的调试端口号
   */
  debuggingPort?: number
  /**
   * 是否为每个选项卡自动打开 DevTools 面板。如果设置为 true，则 headless 将被强制为 false
   */
  devtools?: boolean
  /**
   * 资源根目录
   */
  dir?: string
}

export class Render {
  index: number
  list: Puppeteer[]
  config: RunConfig
  constructor (config: RunConfig) {
    this.index = 0
    this.list = []
    this.config = config
  }

  async init () {
    if (this.config.dir) {
      common.dir = this.config.dir
      delete this.config.dir
    }

    const version = '125.0.6422.78'
    const init = new InitChrome(version)
    const executablePath = await init.init()

    /** 初始化浏览器 */
    const config = {
      ...this.config,
      userDataDir: common.dir + '/data/userDataDir',
      executablePath,
      /** 管道 */
      pipe: true,
    }
    /** 监听浏览器关闭事件 移除浏览器实例 */
    core.on('browserCrash', (id) => {
      const index = this.list.findIndex(item => item.id === id)
      if (index !== -1) this.list.splice(index, 1)
    })

    const browserCount = this.config.browserCount || 1

    delete this.config.browserCount

    for (let i = 0; i < browserCount; i++) {
      const browser = new Puppeteer(this.index++, config as any)
      await browser.start()
      this.list.push(browser)
    }
    logger.info('[chrome] 初始化完成~')
  }

  async start (options: screenshot) {
    /** 第一次 */
    const res = await this.run(options)
    if (res.status === 'ok') return res

    /** 第二次 */
    logger.info('[chrome] 第一次截图失败，正在重试~')
    return await this.run(options)
  }

  async run (options: screenshot): Promise<screenshotRes> {
    /** 生成唯一id */
    const id = crypto.randomUUID()
    /** 将第一个浏览器实例放到最后 */
    const browser = this.list.shift()
    browser?.screenshot(id, options)
    if (browser) this.list.push(browser)
    return new Promise((resolve) => {
      core.once(id, (data) => resolve(data))
    })
  }
}
