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
 *                 Assets live in src/static/blogs/<slug>/ so `npm run cp`
 *                 copies them to public/blogs/<slug>/.
 *   bannerScript  absolute site path to a JS module (e.g.
 *                 /blogs/my-post/banner.js) that renders a live, animated
 *                 banner instead of a raster image — loaded on the post page
 *                 and on the blog index. It receives an empty element carrying
 *                 data-eb-banner="hero" (post page) or "card" (index card).
 *                 When set, `banner` is ignored for display (og:image then
 *                 falls back to the default site icon).
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

function blogFileFor (slug, lang) {
  return resolve(blogsDir, slug, normalizeBlogLang(lang) + '.md')
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
    bannerScript: meta.bannerScript || '',
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
