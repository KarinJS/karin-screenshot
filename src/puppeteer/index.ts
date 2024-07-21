import logger from '@logger'
import puppeteer from 'puppeteer-core'
import { event } from '../imports/EventEmitter'
import { Browser, BrowserLaunchArgumentOptions, GoToOptions } from 'puppeteer-core'

export interface screenshot {
  /**
   * http地址或本地文件路径
   */
  file: string
  /**
   * 模板名称 不提供为render
   */
  name?: string
  /**
   * 截图类型 默认'jpeg'
   */
  type?: 'png' | 'jpeg' | 'webp'
  /**
   * 截图质量 默认90
   * @default 90
   */
  quality?: number
  /**
   * 页面hash 这里是用于ws渲染识别来源
   */
  hash?: string
  /**
   * 截图整个页面
   * @default false
   */
  fullPage?: boolean
  /**
   * 控制截图的优化速度
   * @default false
   */
  optimizeForSpeed?: boolean
  /**
   * 截图后的图片编码
   * @default 'binary'
   */
  encoding?: 'base64' | 'binary'
  /**
   * 保存图片的文件路径
   */
  path?: string
  /**
   * 是否隐藏背景
   * @default false
   */
  omitBackground?: boolean
  /**
   * 捕获视口之外的屏幕截图
   * @default false
   */
  captureBeyondViewport?: boolean
  /**
   * 设置视窗大小和设备像素比 如果不传则使用body的大小
   */
  setViewport?: {
    /**
     * 视窗宽度
     */
    width?: number
    /**
     * 视窗高度
     */
    height?: number
    /**
     * 设备像素比
     * @default 2
     */
    deviceScaleFactor?: number
  }
  /**
   * 分页截图 传递数字则视为视窗高度 返回数组
   */
  multiPage?: number | boolean
  /**
   * 页面goto时的参数
   */
  pageGotoParams?: GoToOptions,
  /**
   * 等待指定元素加载完成
   */
  waitForSelector?: string | string[]
  /**
   * 等待特定函数完成
   */
  waitForFunction?: string | string[]
  /**
   * 等待特定请求完成
   */
  waitForRequest?: string | string[]
  /**
   * 等待特定响应完成
   */
  waitForResponse?: string | string[]
}

export interface screenshotRes {
  status: 'ok' | 'fail'
  data: string | string[] | Buffer | Buffer[] | Error
}

export default class Puppeteer {
  /**
   * 浏览器id
   */
  id: number
  /**
   * 浏览器启动配置
   */
  config: BrowserLaunchArgumentOptions
  /**
   * 浏览器实例
   */
  browser!: Browser
  /**
   * 截图队列 存放每个任务的id
   */
  list: string[]
  constructor (id: number, config: BrowserLaunchArgumentOptions) {
    this.id = id
    this.config = config
    this.list = []
  }

  async start () {
    this.browser = await puppeteer.launch(this.config)

    this.browser.on('disconnected', () => {
      logger.error(`[浏览器][${this.id}] 已关闭或崩溃`)
      /** 先传递一个浏览器崩溃事件出去 用于在浏览器池子中移除掉当前浏览器 */
      event.emit('browserCrash', this.id)

      const res = {
        status: 'fail',
        data: '浏览器已关闭或崩溃',
      }
      this.list.forEach(id => event.emit(id, res))
      /** 尝试关闭 */
      this.browser?.close && this.browser.close()
    })
  }

  async screenshot (id: string, data: screenshot): Promise<screenshotRes> {
    try {
      if (!data.file) return { status: 'fail', data: `[图片生成][${data.name}] 缺少文件路径` }
      if (!data.name) data.name = 'render'

      this.list.push(id)

      /** 打开页面数+1 */
      event.emit('newPage', this.id)

      /** 开始时间 */
      const start = Date.now()

      /** 创建页面 */
      const page = await this.browser.newPage()

      /** 设置全局的HTTP头部 用于ws渲染识别 */
      if (data.hash) await page.setExtraHTTPHeaders({ 'x-renderer-id': data.hash })

      /** 加载页面 */
      await page.goto(data.file, data.pageGotoParams)

      /** 等待body加载完成 */
      await page.waitForSelector('body')

      /** 等待指定元素加载完成 */
      if (data.waitForSelector) {
        if (!Array.isArray(data.waitForSelector)) data.waitForSelector = [data.waitForSelector]
        for (const selector of data.waitForSelector) {
          try { await page.waitForSelector(selector) } catch { }
        }
      }

      /** 等待特定函数完成 */
      if (data.waitForFunction) {
        if (!Array.isArray(data.waitForFunction)) data.waitForFunction = [data.waitForFunction]
        for (const func of data.waitForFunction) {
          try { await page.waitForFunction(func) } catch { }
        }
      }

      /** 等待特定请求完成 */
      if (data.waitForRequest) {
        if (!Array.isArray(data.waitForRequest)) data.waitForRequest = [data.waitForRequest]
        for (const req of data.waitForRequest) {
          try { await page.waitForRequest(req) } catch { }
        }
      }

      /** 等待特定响应完成 */
      if (data.waitForResponse) {
        if (!Array.isArray(data.waitForResponse)) data.waitForResponse = [data.waitForResponse]
        for (const res of data.waitForResponse) {
          try { await page.waitForResponse(res) } catch { }
        }
      }

      const options = {
        path: data.path,
        type: data.type || 'jpeg',
        quality: data.quality || 90 as number | undefined,
        fullPage: data.fullPage || false,
        optimizeForSpeed: data.optimizeForSpeed || false,
        encoding: data.encoding || 'binary',
        omitBackground: data.omitBackground || false,
        captureBeyondViewport: data.captureBeyondViewport || false,
      }

      /** 整个页面截图 */
      if (data.fullPage) {
        options.captureBeyondViewport = true
      }

      /** 如果是png并且有quality则删除quality */
      if (options.quality && data.type === 'png') {
        options.quality = undefined
      }

      /** 获取页面元素 */
      const body = await page.$('#container') || await page.$('body')

      /** 计算页面高度 */
      const box = await body?.boundingBox()

      /** 设置视窗大小 */
      const setViewport = {
        width: Math.round(data?.setViewport?.width || box?.width || 1920),
        height: Math.round(data?.setViewport?.height || box?.height || 1080),
        deviceScaleFactor: Math.round(data?.setViewport?.deviceScaleFactor || 2),
      }
      await page.setViewport(setViewport)

      /** 截图 */
      const image = await page.screenshot(options)
      if (!image) {
        /** 从队列中去除 */
        this.list.splice(this.list.indexOf(id), 1)
        return { status: 'fail', data: `[图片生成][${data.name}] 截图失败，图片为空` }
      }

      /** 先返回结果再处理其他~ */
      event.emit(id, { status: 'ok', data: image })

      /** 从队列中去除 */
      this.list.splice(this.list.indexOf(id), 1)
      /** 图片生成次数+1 */
      event.emit('screenshot', this.id)
      /** 图片大小 */
      const kb = (image.length / 1024).toFixed(2) + 'KB'
      logger.mark(`[图片生成][${data.name}][${event.count}次] ${kb} ${Date.now() - start}ms`)
      /** 关闭页面 */
      await page.close()
      return { status: 'ok', data: image }
    } catch (error) {
      event.emit(id, {
        status: 'fail',
        data: error,
      })

      /** 怪怪的ts... */
      return {
        status: 'fail',
        data: error as Error,
      }
    }
  }
}
