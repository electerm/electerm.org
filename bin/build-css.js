import stylus from 'stylus'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve } from 'path'
import { cwd } from './common.js'
import { createHash } from 'crypto'

function compileStylus (compress = true) {
  const files = [
    'src/css/basic.styl',
    'src/css/home.styl'
  ]
  let css = ''
  for (const file of files) {
    const filePath = resolve(cwd, file)
    const content = readFileSync(filePath, 'utf-8')
    const compiled = stylus(content)
      .set('filename', filePath)
      .set('compress', compress)
      .render()
    css += compiled + '\n'
  }
  return css
}

function computeHash (content) {
  return createHash('sha256').update(content).digest('hex').slice(0, 8)
}

async function main () {
  const outDir = resolve(cwd, 'public')
  mkdirSync(outDir, { recursive: true })

  console.log('Building CSS...')
  const css = compileStylus(true)
  const hash = computeHash(css)
  const filename = `index.${hash}.css`
  const outPath = resolve(outDir, filename)
  writeFileSync(outPath, css)
  console.log(`✅ CSS built: ${outPath}`)

  const dataDir = resolve(cwd, 'data')
  mkdirSync(dataDir, { recursive: true })
  writeFileSync(
    resolve(dataDir, 'assets.json'),
    JSON.stringify({ css: filename })
  )
  console.log('✅ Assets manifest written')
}

main().catch(err => {
  console.error('CSS build failed:', err)
  process.exit(1)
})
