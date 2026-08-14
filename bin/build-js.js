import { build } from 'esbuild'
import { resolve, basename } from 'path'
import { readdirSync, writeFileSync, mkdirSync, rmSync } from 'fs'
import { cwd } from './common.js'

const pagesDir = resolve(cwd, 'src/js/pages')
const outDir = resolve(cwd, 'public/js')

mkdirSync(outDir, { recursive: true })

// esbuild does not clean its output dir, so hashed entry/chunk files from
// previous builds would pile up here. Remove them before each build — but
// keep the static files that `npm run cp` copies into this directory.
const STATIC_KEEP = new Set(['hero-cinema.js', 'qrcode-generator.min.js'])
for (const f of readdirSync(outDir)) {
  if (f.endsWith('.js') && !STATIC_KEEP.has(f)) {
    rmSync(resolve(outDir, f), { force: true })
  }
}

const entries = readdirSync(pagesDir)
  .filter(f => f.endsWith('.js'))
  .map(f => resolve(pagesDir, f))

if (entries.length === 0) {
  console.warn('No page entries found in', pagesDir)
  process.exit(0)
}

// Keep `three` (and its addons) external: it is resolved at runtime via the
// importmap declared in footer.pug, so we never bundle the CDN module.
const threeExternal = {
  name: 'three-external',
  setup (b) {
    b.onResolve({ filter: /^three(\/.*)?$/ }, args => ({ path: args.path, external: true }))
  }
}

const result = await build({
  entryPoints: entries,
  outdir: outDir,
  bundle: true,
  format: 'esm',
  splitting: true,
  entryNames: '[name].[hash]',
  chunkNames: 'chunk.[hash]',
  target: ['es2019'],
  plugins: [threeExternal],
  metafile: true,
  logLevel: 'info'
})

const manifest = {}
for (const [file, info] of Object.entries(result.metafile.outputs)) {
  if (info.entryPoint) {
    const name = basename(info.entryPoint, '.js')
    manifest[name] = basename(file)
  }
}

mkdirSync(resolve(cwd, 'data'), { recursive: true })
writeFileSync(resolve(cwd, 'data/js-manifest.json'), JSON.stringify(manifest, null, 2))
console.log('✅ JS built:', manifest)
