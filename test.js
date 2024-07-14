import { writeFileSync } from 'fs'
import Core from './lib/index.js'

const chrome = new Core({
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
  headless: true,
  devtools: false,
})

chrome.init().then(() => {
  chrome.start('https://www.google.com').then(image => {
    writeFileSync('image.png', image.data)
  })
})
