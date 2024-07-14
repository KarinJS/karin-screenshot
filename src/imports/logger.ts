import log4js from 'log4js'

const pattern = '%[[Karin-puppeteer][%d{hh:mm:ss.SSS}][%4.4p]%] %m'

log4js.configure({
  appenders: {
    console: {
      type: 'console',
      layout: {
        type: 'pattern',
        pattern,
      },
    },
  },
  categories: {
    default: { appenders: ['console'], level: 'info' },
  },
})

const logger = log4js.getLogger('default')
export default Object.freeze(logger)
