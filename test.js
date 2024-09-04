import fs from 'fs'
import Core from './esm/index.mjs'

const chrome = new Core({
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
  headless: true,
  devtools: false,
})

try {
  const image = await chrome.start('https://www.google.com')
  fs.writeFileSync('image.png', image)
} catch (e) {
  console.error(e)
}