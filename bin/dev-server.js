import logger from 'morgan'
import { viewPath, env, staticPath, cwd, releaseData as releaseInfo } from './common.js'
import data from './data.js'
import { jsUrl } from './js-entry.js'
import { filterAssets } from '../src/release-asset-filter.js'
import express from 'express'
import stylus from 'stylus'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { getAllBlogs, getBlog, getBlogAssets, blogLocale } from './blogs.js'

const devPort = env.SERVER_DEV_PORT || 6068
const host = env.SERVER_HOST || '127.0.0.1'
const h = `http://${host}:${devPort}`

// Override locale and page URLs to use dev host
const enLang = data.langs.find(l => l.slug === '') || data.langs[0]
data.langs = data.langs.map(l => ({
  ...l,
  url: l.slug === '' ? h : h + '/' + l.slug + '/'
}))

// Make the per-page JS entry resolver available to every rendered template.
data.jsUrl = (p) => jsUrl(p, true)

// Compile stylus to CSS
function compileStylus () {
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
      .set('compress', false)
      .render()
    css += compiled + '\n'
  }
  return css
}

function handleLocale (req, res) {
  const slug = req.params.param || req.params.lang
  const langData = data.langs.find(l => l.slug === slug)
  if (!langData) {
    res.status(404).send('Language not found')
    return
  }
  res.render('index', {
    ...data,
    host: h,
    url: h + '/' + slug + '/',
    dev: true,
    cssUrl: '/index.bundle.css',
    langCode: langData.langCode,
    lang: langData.lang,
    desc: langData.lang.lang.desc
  })
}

function handlePage (req, res) {
  const page = req.params.param || req.params.page
  const { langCode, lang } = enLang
  res.render(page, {
    ...data,
    host: h,
    url: h + '/' + page + '/',
    dev: true,
    cssUrl: '/index.bundle.css',
    langCode,
    lang,
    desc: lang.lang.desc
  })
}

function handleIndex (req, res) {
  const { langCode, lang } = enLang
  res.render('index', {
    ...data,
    host: h,
    url: h,
    dev: true,
    cssUrl: '/index.bundle.css',
    langCode,
    lang,
    desc: lang.lang.desc
  })
}

// Mirrors the production Worker route (src/worker.js): the release info the
// electerm app polls, with an optional ?src=<asset-name> that keeps only the
// asset the calling build asks for. Production serves this from public/data/.
function handleReleaseInfo (req, res) {
  const src = String(req.query.src || '').trim()
  const release = releaseInfo.release || {}
  res.set('Access-Control-Allow-Origin', '*')
  res.json(src
    ? {
        ...releaseInfo,
        release: { ...release, assets: filterAssets(release.assets, src) }
      }
    : releaseInfo)
}

function handleVideo (req, res) {
  const { langCode, lang } = enLang
  const videoSlug = req.params.videoSlug
  const video = data.videos.find(v => v.videoSlug === videoSlug)
  if (!video) {
    res.status(404).send('Video not found')
    return
  }
  res.render('video', {
    ...data,
    host: h,
    url: h,
    dev: true,
    cssUrl: '/index.bundle.css',
    langCode,
    lang,
    desc: video.description,
    video
  })
}

function handleVideosIndex (req, res) {
  const { langCode, lang } = data.langs[2]
  res.render('videos', {
    ...data,
    host: h,
    url: h + '/videos',
    dev: true,
    cssUrl: '/index.bundle.css',
    langCode,
    lang,
    desc: lang.lang.desc,
    videos: data.videos
  })
}

// Post-local modules and styles — the animated banner scripts declared with
// `bannerScript` (src/blogs/<slug>/banner.js) and anything they import.
// Production serves these from public/blogs/<slug>/ (bin/build-all.js copies
// them); in dev they are read straight from source so editing a banner needs
// no rebuild. Anything that is not a published post asset falls through.
function handleBlogAsset (req, res, next) {
  const { slug, file } = req.params
  const asset = getBlogAssets(slug).find((a) => a.name === file)
  if (!asset) {
    return next()
  }
  res.set('Cache-Control', 'no-store')
  res.type(asset.name)
  res.sendFile(asset.file)
}

function handleBlogsIndex (req, res) {
  const blogLang = req.params.blogLang === 'cn' ? 'cn' : 'en'
  const { langCode, lang } = blogLocale(data.langs, blogLang)
  const posts = getAllBlogs(blogLang)
  const isCn = blogLang === 'cn'
  res.render('blogs', {
    ...data,
    host: h,
    url: h + (isCn ? '/blogs/cn/' : '/blogs/'),
    dev: true,
    cssUrl: '/index.bundle.css',
    langCode,
    lang,
    keywords: 'electerm blog, terminal tutorial, ssh guide, terminal client guide',
    desc: isCn
      ? 'Electerm 博客：免费开源终端客户端的教程、指南与深度文章。'
      : 'Electerm blog: tutorials, guides and deep-dives for the free and open-source terminal client.',
    posts,
    blogLang
  })
}

function handleBlog (req, res) {
  const slug = req.params.slug
  const blogLang = req.params.blogLang === 'cn' ? 'cn' : 'en'
  const { langCode, lang } = blogLocale(data.langs, blogLang)
  const post = getBlog(slug, blogLang)
  if (!post) {
    res.status(404).send('Blog post not found')
    return
  }
  const isCn = blogLang === 'cn'
  const posts = getAllBlogs(blogLang)
  const idx = posts.findIndex(p => p.slug === slug)
  const prevPost = idx > 0 ? posts[idx - 1] : null
  const nextPost = idx >= 0 && idx < posts.length - 1 ? posts[idx + 1] : null
  const relatedVideos = (post.videos || [])
    .map(vs => data.videos.find(v => v.videoSlug === vs))
    .filter(Boolean)
  const featureVideo = post.featureVideo
    ? data.videos.find(v => v.videoSlug === post.featureVideo) || null
    : null
  res.render('blog', {
    ...data,
    host: h,
    url: h + '/blogs/' + slug + '/' + (isCn ? 'cn/' : ''),
    dev: true,
    cssUrl: '/index.bundle.css',
    langCode,
    lang,
    keywords: 'electerm, ' + post.title.toLowerCase() + ', ' + (post.tags || []).join(', '),
    desc: post.description,
    post,
    posts,
    prevPost,
    nextPost,
    relatedVideos,
    featureVideo,
    blogLang
  })
}

function handleFaq (req, res) {
  const langSlug = req.params.lang || ''
  let langData
  if (!langSlug) {
    // English FAQ at /faq/
    langData = data.langs.find(l => l.id === 'en_us')
  } else {
    langData = data.langs.find(l => l.slug === langSlug)
  }
  if (!langData) {
    res.status(404).send('Not found')
    return
  }
  // Build FAQ-aware lang URLs
  const faqLangs = data.langs.map(lm => ({
    ...lm,
    url: lm.slug === '' ? h + '/faq/' : h + '/faq/' + lm.slug + '/'
  }))
  res.render('faq', {
    ...data,
    langs: faqLangs,
    host: h,
    url: h + '/faq/' + (langSlug ? langSlug + '/' : ''),
    dev: true,
    cssUrl: '/index.bundle.css',
    langCode: langData.langCode,
    lang: langData.lang,
    desc: langData.lang.lang.faqTitle
  })
}

function createServer () {
  const app = express()

  app.use(logger('tiny'))
  app.use(express.json())
  app.use(express.urlencoded({
    extended: true
  }))

  // FAQ routes must come before express.static to avoid
  // serving pre-built FAQ HTML statically instead of rendering fresh
  app.get('/faq', handleFaq)
  app.get('/faq/', handleFaq)
  app.get('/faq/:lang/', handleFaq)

  app.use(express.static(staticPath))
  // Serve the unbundled source JS modules in dev (native ESM, no build step).
  // Never cache these during development so edits are picked up immediately.
  app.use('/js-src', (req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
  })
  app.use('/js-src', express.static(resolve(cwd, 'src/js')))
  // Dev CSS is compiled on the fly too — disable caching for it as well.
  app.use('/index.bundle.css', (req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
  })
  app.set('views', viewPath)
  app.set('view engine', 'pug')

  // Serve compiled CSS
  app.get('/index.bundle.css', (req, res) => {
    try {
      const css = compileStylus()
      res.setHeader('Content-Type', 'text/css')
      res.send(css)
    } catch (err) {
      console.error('Stylus compilation error:', err)
      res.status(500).send('CSS compilation error')
    }
  })

  // API routes
  app.get('/api/country', (req, res) => {
    const country = (req.headers['cf-ipcountry'] || 'us').toUpperCase()
    res.json({ country })
  })

  // Release info for the electerm app (see src/worker.js in production)
  app.get('/data/electerm-github-release.json', handleReleaseInfo)

  // Home page
  app.get('/', handleIndex)

  // Video routes
  app.get('/videos', handleVideosIndex)
  app.get('/videos/:videoSlug', handleVideo)

  // Blog routes (markdown from src/blogs/<slug>/{en,cn}.md,
  // rendered on every request in dev). The /cn/ variants must come first
  // so "cn" is not mistaken for a post slug.
  app.get('/blogs', handleBlogsIndex)
  app.get('/blogs/', handleBlogsIndex)
  app.get('/blogs/cn', (req, res) => {
    req.params.blogLang = 'cn'
    return handleBlogsIndex(req, res)
  })
  app.get('/blogs/cn/', (req, res) => {
    req.params.blogLang = 'cn'
    return handleBlogsIndex(req, res)
  })
  app.get('/blogs/:slug/cn', (req, res) => {
    req.params.blogLang = 'cn'
    return handleBlog(req, res)
  })
  app.get('/blogs/:slug/cn/', (req, res) => {
    req.params.blogLang = 'cn'
    return handleBlog(req, res)
  })
  // Post-local assets (banner modules) — /blogs/<slug>/banner.js
  app.get('/blogs/:slug/:file', handleBlogAsset)
  app.get('/blogs/:slug', handleBlog)
  app.get('/blogs/:slug/', handleBlog)

  // Release archive now lives on https://history.electerm.org (301'd at the
  // edge/worker). Dev server just 301s there to mirror production.
  app.get(['/releases', '/releases/', '/releases/:version', '/releases/:version/'], (req, res) => {
    const target = 'https://history.electerm.org/releases/' +
      (req.params.version ? req.params.version + '/' : '') + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '')
    res.redirect(301, target)
  })

  // Catch-all for /:something/ routes
  app.get('/:param/', (req, res, next) => {
    const param = req.params.param
    const langData = data.langs.find(l => l.slug === param)
    if (langData) {
      return handleLocale(req, res)
    }
    // Check if it's a known page
    if (data.pages.includes(param)) {
      return handlePage(req, res)
    }
    res.status(404).send('Not found')
  })

  app.listen(devPort, host, () => {
    console.log(`server started at ${h}`)
  })
}

createServer()
