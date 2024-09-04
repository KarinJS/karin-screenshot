import { EventEmitter as Emitter } from 'events'

/**
 * 事件监听器
 */
class EventEmitter extends Emitter {
  /**
   * 图片生成次数
   */
  count: number
  /**
   * 打开新页面次数
   */
  newPage: number
  constructor () {
    super()
    this.count = 0
    this.newPage = 0
    this.on('screenshot', () => this.count++)
    this.on('newPage', () => this.newPage++)
  }
}
export const core = new EventEmitter()
