import { readFileSync } from 'fs'
import { resolve } from 'path'
import { cwd } from './common.js'

let manifestCache = null

function getManifest () {
  if (manifestCache) return manifestCache
  try {
    manifestCache = JSON.parse(readFileSync(resolve(cwd, 'data/js-manifest.json'), 'utf-8'))
  } catch {
    manifestCache = {}
  }
  return manifestCache
}

// Resolve the <script src> for a page entry.
//   dev  -> /js-src/pages/{page}.js   (served by the dev server, native ESM)
//   prod -> /js/{hashed}.js           (from data/js-manifest.json)
export function jsUrl (page, dev) {
  if (dev) return `/js-src/pages/${page}.js`
  const file = getManifest()[page]
  return file ? `/js/${file}` : ''
}
