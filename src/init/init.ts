import fs from 'fs'
import Common from '@Common'
import { Platform } from '@Common'
import logger from '@logger'

type Info = {
  /**
   * 根路径 也就是解压路径
   */
  dir: string
  /**
   * 下载后zip存放路径
   */
  zip: string
  /**
   * chrome文件夹根路径
   */
  chromeDir: string
  /**
   * chrome二进制路径
   */
  chrome: string
}

export default class Chrome {
  /**
   * @param version - 传入下载的chrome版本
   */
  version: string
  platform: Platform
  info: Info
  constructor (version: string) {
    this.version = version
    /** 获取系统版本 */
    this.platform = Common.Platform()
    this.info = this.GetInfo()
  }

  async start (): Promise<boolean | string> {
    /** 判断是否存在chrome */
    if (Common.exists(this.info.chrome)) {
      logger.info(`[chrome] ${this.info.chrome}`)
      return this.info.chrome
    }

    const url = await this.GetDownloadUrl()

    /** 检查zip是否已存在 已存在删除 */
    if (Common.exists(this.info.zip)) fs.unlinkSync(this.info.zip)

    const downloadRes = await Common.download(url, this.info.zip)
    if (!downloadRes) throw new Error('[chrome][init] 下载失败')

    logger.info('[chrome][init] 下载完成，开始解压')
    const unzipRes = await Common.unzip(this.info.zip, this.info.dir)
    if (!unzipRes) throw new Error('[chrome][init] 解压失败')
    /** 解压完成删除zip文件 */
    fs.unlinkSync(this.info.zip)
    logger.info('[chrome][init] 解压完成: ', this.info.chrome)
    return this.info.chrome
  }

  /**
   * 获取下载地址
   */
  async GetDownloadUrl (): Promise<string> {
    /** 先测试谷歌源 */
    let host = 'https://storage.googleapis.com'

    /** 判断是否能ping通 */
    const isGoogle = await Common.ping(host)

    /** 获取host */
    host = `https://${isGoogle ? 'storage.googleapis.com/chrome-for-testing-public' : 'cdn.npmmirror.com/binaries/chrome-for-testing'}`
    /** 组合url */
    const url = `${host}/${this.version}/${this.platform}/chrome-headless-shell-${this.platform}.zip`
    logger.info(`[chrome][init] 获取下载地址完成：${url}`)
    return url
  }

  /**
   * 获取chrome信息
   */
  GetInfo (): Info {

    /**
     * 版本
     */
    const version = `chrome-headless-shell-${this.platform}`

    /**
     * 根路径 也就是解压路径
     */
    const dir = `${Common.dir}/data/chromium`

    /**
     * 下载后zip存放路径
     */
    const zip = `${dir}/${version}.zip`

    /**
     * chrome文件夹根路径
     */
    const chromeDir = `${dir}/${version}`

    /**
     * chrome二进制路径
     */
    const chrome = `${chromeDir}/chrome-headless-shell${this.platform === 'win64' ? '.exe' : ''}`

    return {
      dir,
      zip,
      chromeDir,
      chrome,
    }
  }
}
