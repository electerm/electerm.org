import data from './data.js'
import { buildPug } from './build-bug.js'
import { resolve } from 'path'
import { cwd } from './common.js'
import fs from 'fs/promises'
import { readFileSync } from 'fs'

let cssFilename = '/index.bundle.css'

const REDIRECT_TEMPLATE = (target) => `<!DOCTYPE html><html><head><meta charset="utf-8"><link rel="canonical" href="${target}"><script>location.replace("${target}")</script></head><body></body></html>`

async function buildVideoPages () {
  const { videos } = data
  const h = process.env.HOST
  const enLang = data.langs.find(l => l.id === 'en_us')
  const { langCode, lang } = enLang

  const videosIndexFrom = resolve(cwd, 'src/views/videos.pug')
  const videosIndexTo = resolve(cwd, 'public/videos/index.html')
  await fs.mkdir(resolve(cwd, 'public/videos'), { recursive: true })

  await buildPug(videosIndexFrom, videosIndexTo, {
    ...data,
    langCode,
    lang,
    lp: '',
    faqUrl: '/faq/',
    keywords: lang.lang.videosTitle + ', electerm video, terminal tutorial, ssh tutorial, sftp tutorial',
    desc: lang.lang.videosTitle + ' - Watch tutorial videos and demos for electerm terminal client',
    url: `${h}/videos/`,
    cssUrl: cssFilename,
    videos
  })

  for (const video of videos) {
    const videoSlug = video.videoSlug
    const videoDir = resolve(cwd, `public/videos/${videoSlug}`)
    await fs.mkdir(videoDir, { recursive: true })

    const videoFrom = resolve(cwd, 'src/views/video.pug')
    const videoTo = resolve(videoDir, 'index.html')

    const structuredData = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      name: video.titleEn,
      description: `Video tutorial: ${video.titleEn}. Learn how to use this feature in electerm, the free and open-source terminal client.`,
      thumbnailUrl: `${h}/video-thumb/${videoSlug}.jpg`,
      duration: `PT${Math.floor(video.duration / 60)}M${video.duration % 60}S`,
      contentUrl: `${h}/videos/${videoSlug}/`,
      embedUrl: `https://player.bilibili.com/player.html?bvid=${video.bvid}&page=1&high_quality=1`,
      uploadDate: video.publishDate || data.releaseDateISO
    })

    // Generate unique keywords per video based on title and slug
    const videoKeywords = generateVideoKeywords(video)

    await buildPug(videoFrom, videoTo, {
      ...data,
      langCode,
      lang,
      lp: '',
      faqUrl: '/faq/',
      keywords: videoKeywords,
      desc: `${video.titleEn} - electerm video tutorial. Learn how to use ${video.titleEn.toLowerCase()} in electerm terminal client.`,
      url: `${h}/videos/${videoSlug}/`,
      cssUrl: cssFilename,
      video: { ...video, structuredData }
    })
  }

  console.log(`✅ Built ${videos.length} video pages`)
}

function buildHreflangLinks (langs, host) {
  return langs.map(item => ({
    hreflang: item.langCode === 'en-US' ? 'x-default' : item.langCode,
    url: item.url
  }))
}

function generateVideoKeywords (video) {
  const base = 'electerm'
  const slug = video.videoSlug || ''
  const titleEn = video.titleEn || ''
  // Extract feature-specific keywords from the slug
  const slugParts = slug.replace('electerm-', '').split('-').filter(w => w.length > 2)
  const featureKeywords = slugParts.join(', ')
  // Protocol/type mapping
  const protocolMap = {
    ssh: 'ssh client, ssh tunnel',
    sftp: 'sftp client, file transfer',
    ftp: 'ftp client',
    telnet: 'telnet client',
    vnc: 'vnc client, remote desktop',
    rdp: 'rdp client, remote desktop',
    serial: 'serial port',
    spice: 'spice protocol',
    terminal: 'terminal emulator',
    theme: 'terminal theme, customization',
    bookmark: 'ssh bookmark, connection manager',
    batch: 'batch operations, automation',
    workspace: 'workspace, session layout',
    'quick-commands': 'quick commands, terminal shortcuts',
    'ai-command': 'ai terminal, ai command generation',
    'cloud-sync': 'cloud sync, data sync',
    'keyboard-shortcuts': 'keyboard shortcuts, hotkeys',
    proxy: 'socks proxy, ssh proxy',
    tunnel: 'ssh tunnel, port forwarding'
  }
  let extraKeywords = featureKeywords
  for (const [key, value] of Object.entries(protocolMap)) {
    if (slug.includes(key)) {
      extraKeywords = value
      break
    }
  }
  return `${base}, ${titleEn.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim().replace(/\s+/g, ', ')}, ${extraKeywords}, terminal client, open source`
}

async function main () {
  cssFilename = '/index.bundle.css'
  try {
    const assetsPath = resolve(cwd, 'data/assets.json')
    const assets = JSON.parse(readFileSync(assetsPath, 'utf-8'))
    cssFilename = '/' + assets.css
  } catch (e) {
    console.warn('Warning: data/assets.json not found, using fallback CSS filename')
  }

  const { langs, pages } = data
  const from = resolve(cwd, 'src/views/index.pug')
  const h = process.env.HOST

  // Build index page for each language
  for (const item of langs) {
    const { id, slug, langCode, lang } = item

    if (id === 'en_us') {
      // English → public/index.html
      const to = resolve(cwd, 'public/index.html')
      const hreflangLinks = buildHreflangLinks(langs, h)
      await buildPug(from, to, {
        ...data,
        langCode,
        lang,
        lp: '',
        faqUrl: '/faq/',
        keywords: lang.lang.keywords,
        desc: lang.lang.desc,
        url: h,
        hreflangLinks,
        cssUrl: cssFilename
      })
    } else {
      // Other locales → public/{slug}/index.html + public/index-{id}.html redirect
      const dir = resolve(cwd, 'public/' + slug)
      await fs.mkdir(dir, { recursive: true })

      const to = resolve(dir, 'index.html')
      const hreflangLinks = buildHreflangLinks(langs, h)
      const lp = '/' + slug
      const faqUrl = '/faq/' + slug + '/'
      await buildPug(from, to, {
        ...data,
        langCode,
        lang,
        lp,
        faqUrl,
        keywords: lang.lang.keywords,
        desc: lang.lang.desc,
        url: h + '/' + slug + '/',
        hreflangLinks,
        cssUrl: cssFilename
      })

      // Build redirect page at old path
      const redirectFrom = resolve(cwd, 'public/index-' + id + '.html')
      const target = h + '/' + slug + '/'
      await fs.writeFile(redirectFrom, REDIRECT_TEMPLATE(target))
    }
  }

  console.log(`✅ Built index pages for ${langs.length} languages`)

  const { version, androidVersion } = data
  await fs.writeFile(resolve(cwd, 'public/version.html'), version)
  await fs.writeFile(resolve(cwd, 'public/version-android.html'), androidVersion)

  // Build static pages (English only)
  const enLang = langs.find(l => l.id === 'en_us')
  const { langCode, lang } = enLang
  for (const item of pages) {
    const f = resolve(cwd, 'src/views/' + item + '.pug')

    if (item === 'faq') {
      // Build FAQ for all languages
      for (const langItem of langs) {
        const { id: lid, slug: lslug, langCode: lc, lang: l } = langItem
        const faqLangs = langs.map(lm => ({
          ...lm,
          url: lm.slug === '' ? `${h}/faq/` : `${h}/faq/${lm.slug}/`
        }))
        const descKey = 'faqTitle'

        if (lid === 'en_us') {
          // English → public/faq/index.html
          const dir = resolve(cwd, 'public/faq')
          await fs.mkdir(dir, { recursive: true })
          const hreflangLinks = buildHreflangLinks(faqLangs, h)
          await buildPug(f, resolve(dir, 'index.html'), {
            ...data,
            langs: faqLangs,
            langCode: lc,
            lang: l,
            lp: '',
            faqUrl: '/faq/',
            keywords: l.lang.keywords,
            desc: l.lang[descKey] || l.lang.desc,
            url: `${h}/faq/`,
            hreflangLinks,
            cssUrl: cssFilename
          })
          // Redirect from old /faq.html
          const redirectFrom = resolve(cwd, 'public/faq.html')
          const target = `${h}/faq/`
          await fs.writeFile(redirectFrom, REDIRECT_TEMPLATE(target))
        } else {
          // Other locales → public/faq/{slug}/index.html
          const dir = resolve(cwd, `public/faq/${lslug}`)
          await fs.mkdir(dir, { recursive: true })
          const hreflangLinks = buildHreflangLinks(faqLangs, h)
          const faqUrl = '/faq/' + lslug + '/'
          await buildPug(f, resolve(dir, 'index.html'), {
            ...data,
            langs: faqLangs,
            langCode: lc,
            lang: l,
            lp: '/' + lslug,
            faqUrl,
            keywords: l.lang.keywords,
            desc: l.lang[descKey] || l.lang.desc,
            url: `${h}/faq/${lslug}/`,
            hreflangLinks,
            cssUrl: cssFilename
          })
        }
      }
      console.log('✅ Built FAQ pages for ' + langs.length + ' languages')
      continue
    }

    const dir = resolve(cwd, `public/${item}`)
    await fs.mkdir(dir, { recursive: true })
    const titleKey = item.replace(/-/g, '') + 'Title'
    const descKey = item === 'sponsor-electerm' ? 'sponsorTitle' : (lang.lang[titleKey] ? titleKey : 'privacyPolicy')
    await buildPug(f, resolve(dir, 'index.html'), {
      ...data,
      langCode,
      lang,
      lp: '',
      faqUrl: '/faq/',
      keywords: lang.lang.keywords,
      desc: lang.lang[descKey] || lang.lang.desc,
      url: `${h}/${item}/`,
      cssUrl: cssFilename
    })

    // Redirect from old /{item}.html
    const redirectFrom = resolve(cwd, `public/${item}.html`)
    const target = `${h}/${item}/`
    await fs.writeFile(redirectFrom, REDIRECT_TEMPLATE(target))
  }

  console.log('✅ Built static pages (English)')

  // Build 404 page
  await build404Page()

  await buildVideoPages()
}

async function build404Page () {
  const enLang = data.langs.find(l => l.id === 'en_us')
  const { langCode, lang } = enLang
  const h = process.env.HOST
  const from = resolve(cwd, 'src/views/404.pug')
  const to = resolve(cwd, 'public/404.html')
  await buildPug(from, to, {
    ...data,
    langCode,
    lang,
    lp: '',
    faqUrl: '/faq/',
    keywords: lang.lang.keywords,
    desc: 'Page not found on electerm website',
    url: `${h}/404.html`,
    cssUrl: cssFilename
  })
  console.log('✅ Built 404 page')
}

main()
