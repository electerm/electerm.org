import logger from 'morgan'
import { viewPath, env, staticPath, cwd } from './common.js'
import data from './data.js'
import express from 'express'
import stylus from 'stylus'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const devPort = env.SERVER_DEV_PORT || 6068
const host = env.SERVER_HOST || '127.0.0.1'
const h = `http://${host}:${devPort}`

// Override locale and page URLs to use dev host
data.langs = data.langs.map(l => ({
  ...l,
  url: l.slug === '' ? h : h + '/' + l.slug + '/'
}))

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
  const { langCode, lang } = data.langs[2]
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
  const { langCode, lang } = data.langs[2]
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

function handleVideo (req, res) {
  const { langCode, lang } = data.langs[2]
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

  // Home page
  app.get('/', handleIndex)

  // Video routes
  app.get('/videos', handleVideosIndex)
  app.get('/videos/:videoSlug', handleVideo)

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
