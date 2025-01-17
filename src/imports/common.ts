import logger from '@logger'
import decompress from 'decompress'
import fs from 'fs'
import https from 'https'
import os from 'os'
import path from 'path'
import { pipeline } from 'stream'
import { fileURLToPath } from 'url'
import { promisify } from 'util'

const streamPipeline = promisify(pipeline)

export type Platform = 'linux64' | 'mac-arm64' | 'mac-x64' | 'win32' | 'win64' | Error

class Common {
  /**
   * 项目根目录
   */
  dir: string
  constructor () {
    this.dir = this.pathDir()
  }

  /**
   * 判断路径是否存在
   */
  exists (path: string): boolean {
    return fs.existsSync(path)
  }

  /**
   * 递归创建路径
   * @param dirname - 文件夹路径
   */
  mkdirs (dirname: string): boolean {
    if (fs.existsSync(dirname)) return true
    if (this.mkdirs(path.dirname(dirname))) {
      fs.mkdirSync(dirname)
      return true
    }
    return true
  }

  /**
   * 获取项目根目录
   * @returns 项目根目录
   */
  pathDir (): string {
    if (process.env.KarinPuppeteerDir) return process.env.KarinPuppeteerDir
    const filename = fileURLToPath('file://' + __dirname)
    const _dirname = path.dirname(filename)
    let dir = path.join(_dirname, '../../')
    dir = dir.replace(/\\/g, '/')
    // 去掉最后的/ 标准化路径
    dir = dir.replace(/\/$/, '')
    return dir
  }

  /**
   * 获取系统版本
   * @returns linux64、mac-arm64、mac-x64、win32、win64
   */
  Platform (): Platform {
    switch (process.platform) {
      case 'linux': {
        return 'linux64'
      }
      case 'darwin': {
        const platform = os.arch() === 'arm64' ? 'mac-arm64' : 'mac-x64'
        return platform
      }
      case 'win32': {
        const platform = os.arch() === 'x64' ? 'win64' : 'win32'
        return platform
      }
      default: {
        throw new Error('不支持的系统')
      }
    }
  }

  /**
   * 网络探针
   * @param url - 探测地址
   * @param timeout - 超时时间 默认2000ms
   * @returns 是否可访问
   */
  async ping (url: string, timeout: number = 2000): Promise<boolean> {
    return new Promise((resolve) => {
      const request = https.get(url, (res) => {
        resolve(res.statusCode === 200)
      })

      request.on('error', () => {
        resolve(false)
      })

      request.setTimeout(timeout, () => {
        request.abort()
        resolve(false)
      })
    })
  }

  /**
   * 下载保存文件
   * @param url 下载文件地址
   * @param file 保存绝对路径
   * @param params fetch参数
   */
  async download (url: string, file: string, params: https.RequestOptions = {}): Promise<boolean> {
    try {
      this.mkdirs(path.dirname(file))
      logger.mark(`[下载文件] ${url}`)

      return new Promise((resolve, reject) => {
        const request = https.get(url, params, (res) => {
          if (res.statusCode !== 200) {
            reject(new Error(`Failed to get '${url}' (${res.statusCode})`))
            return
          }

          const fileStream = fs.createWriteStream(file)
          streamPipeline(res, fileStream)
            .then(() => resolve(true))
            .catch((err) => {
              logger.error(`[下载文件] 错误：${err}`)
              resolve(false)
            })
        })

        request.on('error', (err) => {
          logger.error(`[下载文件] 错误: ${err}`)
          resolve(false)
        })
      })
    } catch (err) {
      logger.error(`[下载文件] 错误: ${err}`)
      return false
    }
  }

  /**
   * 解压文件
   * @param file zip文件路径
   * @param output 输出路径
   */
  async unzip (file: string, output: string) {
    try {
      logger.info(`[解压文件] ${file}`)
      await decompress(file, output)
      return true
    } catch (err) {
      logger.error(`[解压文件] 错误：${err}`)
      return false
    }
  }
}

const common = new Common()
export default common
