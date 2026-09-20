/**
 * Blog loader: reads markdown files from src/blogs/<slug>/{en,cn}.md
 * and serves them as HTML.
 *
 * Each blog lives in its own folder with per-language markdown:
 *   src/blogs/my-post/en.md
 *   src/blogs/my-post/cn.md
 *
 * In dev, markdown is rendered on every request (no build step).
 * In production (bin/build-all.js), markdown is pre-rendered once and
 * written to public/blogs/<slug>/index.html (en) and
 * public/blogs/<slug>/cn/index.html (cn) as static HTML.
 *
 * Frontmatter keys:
 *   title         post title (h1 + <title>)
 *   description   meta description / og:description
 *   date          YYYY-MM-DD, drives ordering and datePublished
 *   tags          [a, b] or "a, b"
 *   videos        [videoSlug, ...] — listed as "related videos" at the bottom
 *   featureVideo  single videoSlug — embedded as a player above the article
 *   banner        absolute site path (e.g. /blogs/my-post/banner.png) used as
 *                 the post hero image, the og:image and the list card thumbnail.
 *                 Raster assets live in src/static/blogs/<slug>/ so `npm run cp`
 *                 copies them to public/blogs/<slug>/.
 *   bannerScript  file name of a JS module sitting next to the post, e.g.
 *                 `banner.js` -> src/blogs/my-post/banner.js, published at
 *                 /blogs/my-post/banner.js. It renders a live, animated banner
 *                 instead of a raster image — loaded on the post page and on
 *                 the blog index. It receives an empty element carrying
 *                 data-eb-banner="hero" (post page) or "card" (index card).
 *                 When set, `banner` is ignored for display (og:image then
 *                 falls back to the default site icon).
 *                 An absolute site path (/blogs/my-post/banner.js) is still
 *                 accepted and used verbatim; in that case nothing is copied
 *                 and the file is expected to come from src/static.
 *
 * Every .js / .mjs / .css file inside a post folder is published at
 * /blogs/<slug>/<file> — by `bin/build-all.js` for the built site, and
 * straight from source by `bin/dev-server.js` in development. That is what
 * lets a banner module import a sibling helper without a bundler.
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'fs'
import { resolve } from 'path'
import { marked } from 'marked'
import { cwd } from './common.js'

export const blogsDir = resolve(cwd, 'src/blogs')

export const BLOG_LANGS = ['en', 'cn']

export function normalizeBlogLang (lang) {
  return lang === 'cn' ? 'cn' : 'en'
}

/**
 * Locale data ({ langCode, lang }) for a blog language.
 *
 * The blog is its own bilingual section rather than a translation of the site
 * shell, so each page renders under the locale of the language it is written
 * in. Handing both blog languages the site locale meant /blogs/cn/ showed a
 * Chinese article under an English nav.
 */
export function blogLocale (langs, blogLang) {
  const id = normalizeBlogLang(blogLang) === 'cn' ? 'zh_cn' : 'en_us'
  return langs.find((l) => l.id === id) || langs.find((l) => l.id === 'en_us')
}

marked.setOptions({
  gfm: true,
  breaks: false
})

// Minimal frontmatter parser: --- \n key: value \n ---
function parseFrontmatter (raw) {
  if (!raw.startsWith('---')) {
    return { meta: {}, body: raw }
  }
  const end = raw.indexOf('\n---', 3)
  if (end === -1) {
    return { meta: {}, body: raw }
  }
  const fmRaw = raw.slice(3, end).trim()
  const body = raw.slice(end + 4).replace(/^\n/, '')
  const meta = {}
  for (const line of fmRaw.split('\n')) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    // strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    // tags: [a, b] or "a, b"
    if (key === 'tags' || key === 'videos') {
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
      } else if (typeof value === 'string' && value.includes(',')) {
        value = value.split(',').map(s => s.trim()).filter(Boolean)
      } else if (value) {
        value = [value]
      } else {
        value = []
      }
    }
    meta[key] = value
  }
  return { meta, body }
}

function renderMarkdown (md) {
  return marked.parse(md)
}

function isValidSlug (slug) {
  return /^[a-z0-9-]+$/i.test(slug)
}

// Files published next to a post. Anything else in a post folder stays
// source-only (markdown, notes, images referenced from the article body).
const BLOG_ASSET_RE = /^[\w.-]+\.(js|mjs|css)$/i

function blogFileFor (slug, lang) {
  return resolve(blogsDir, slug, normalizeBlogLang(lang) + '.md')
}

/**
 * Post-local modules/styles, as { name, file, url }.
 * `file` is an absolute source path; `url` is where it is published.
 */
export function getBlogAssets (slug) {
  if (!isValidSlug(slug)) return []
  const dir = resolve(blogsDir, slug)
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((name) => BLOG_ASSET_RE.test(name))
    .filter((name) => {
      try {
        return statSync(resolve(dir, name)).isFile()
      } catch {
        return false
      }
    })
    .sort()
    .map((name) => ({
      name,
      file: resolve(dir, name),
      url: `/blogs/${slug}/${name}`
    }))
}

export function getAllBlogAssets () {
  return getBlogSlugs().flatMap((slug) => getBlogAssets(slug))
}

/**
 * `bannerScript` frontmatter -> { url, file }.
 *   banner.js            -> src/blogs/<slug>/banner.js, /blogs/<slug>/banner.js
 *   /blogs/x/banner.js   -> used as-is, nothing to copy (legacy / src/static)
 * A named module that does not exist is reported and dropped, so a typo
 * renders no banner instead of a 404 script tag.
 */
export function resolveBannerScript (slug, value) {
  const name = String(value || '').trim()
  if (!name) return { url: '', file: '' }
  if (name.includes('/')) return { url: name, file: '' }
  if (!BLOG_ASSET_RE.test(name)) {
    console.warn(`⚠️  blog "${slug}": bannerScript "${name}" is not a .js/.mjs/.css file name`)
    return { url: '', file: '' }
  }
  const file = resolve(blogsDir, slug, name)
  if (!existsSync(file)) {
    console.warn(`⚠️  blog "${slug}": bannerScript "${name}" not found at ${file}`)
    return { url: '', file: '' }
  }
  return { url: `/blogs/${slug}/${name}`, file }
}

export function getBlogSlugs () {
  if (!existsSync(blogsDir)) return []
  return readdirSync(blogsDir)
    .filter((f) => {
      if (!isValidSlug(f)) return false
      try {
        return statSync(resolve(blogsDir, f)).isDirectory()
      } catch {
        return false
      }
    })
    .filter((slug) => BLOG_LANGS.some((l) => existsSync(resolve(blogsDir, slug, l + '.md'))))
    .sort()
}

export function getBlogLangs (slug) {
  if (!isValidSlug(slug)) return []
  return BLOG_LANGS.filter((l) => existsSync(resolve(blogsDir, slug, l + '.md')))
}

export function getBlog (slug, lang = 'en') {
  // basic slug sanitization to avoid path traversal
  if (!isValidSlug(slug)) return null
  const want = normalizeBlogLang(lang)
  // fall back to English when the requested language file is missing
  const file = existsSync(blogFileFor(slug, want))
    ? blogFileFor(slug, want)
    : blogFileFor(slug, 'en')
  if (!existsSync(file)) return null
  const raw = readFileSync(file, 'utf-8')
  const { meta, body } = parseFrontmatter(raw)
  const html = renderMarkdown(body)
  // banner script: a module next to the post, or a site path used verbatim
  const bannerScript = resolveBannerScript(slug, meta.bannerScript)
  // plain-text excerpt fallback when no description in frontmatter
  const excerpt = (body.replace(/[#>*`[\]()!]/g, '').replace(/\s+/g, ' ').trim().slice(0, 160))
  const actualLang = file.endsWith('/cn.md') ? 'cn' : 'en'
  return {
    slug,
    lang: actualLang,
    requestedLang: want,
    title: meta.title || slug,
    description: meta.description || meta.desc || excerpt,
    date: meta.date || '',
    dateISO: meta.date ? new Date(meta.date).toISOString() : '',
    tags: Array.isArray(meta.tags) ? meta.tags : (meta.tags ? [meta.tags] : []),
    // video slugs from electerm.org/videos that this post references
    videos: Array.isArray(meta.videos) ? meta.videos : (meta.videos ? [meta.videos] : []),
    // single video slug rendered as an embedded player at the top of the post
    featureVideo: meta.featureVideo || '',
    // banner/hero image, absolute site path (e.g. /blogs/my-post/banner.png)
    banner: meta.banner || meta.cover || '',
    // live animated banner module (no image), absolute site path
    bannerScript: bannerScript.url,
    html,
    raw: body,
    meta
  }
}

export function getAllBlogs (lang = 'en') {
  const want = normalizeBlogLang(lang)
  const blogs = getBlogSlugs()
    .map((slug) => getBlog(slug, want))
    .filter(Boolean)
  // newest first; posts without date go last
  blogs.sort((a, b) => {
    if (!a.date && !b.date) return a.slug.localeCompare(b.slug)
    if (!a.date) return 1
    if (!b.date) return -1
    return new Date(b.date) - new Date(a.date)
  })
  return blogs
}
