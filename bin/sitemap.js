import fs from 'fs/promises'
import { createSitemap } from 'sitemaps'
import { cwd } from './common.js'
import { resolve } from 'path'
import dayjs from 'dayjs'
import data from './data.js'

const fmt = 'YYYY-MM-DD'

async function buildSiteMap () {
  const urls = []
  const host = data.host || 'https://electerm.org'

  // English index
  const index = resolve(cwd, 'public/index.html')
  const state = await fs.stat(index)
  urls.push({
    loc: host,
    lastmod: dayjs(state.mtime).format(fmt),
    changefreq: 'weekly',
    priority: 1
  })

  // Locale pages (exclude en_us which is root)
  for (const item of data.langs) {
    if (item.slug) {
      const dir = resolve(cwd, 'public/' + item.slug)
      try {
        const s = await fs.stat(resolve(dir, 'index.html'))
        urls.push({
          loc: host + '/' + item.slug + '/',
          lastmod: dayjs(s.mtime).format(fmt),
          changefreq: 'weekly',
          priority: 0.8
        })
      } catch (e) {}
    }
  }

  // FAQ pages for all locales
  for (const item of data.langs) {
    if (item.slug) {
      urls.push({
        loc: host + '/faq/' + item.slug + '/',
        lastmod: dayjs(state.mtime).format(fmt),
        changefreq: 'weekly',
        priority: 0.8
      })
    } else {
      urls.push({
        loc: host + '/faq/',
        lastmod: dayjs(state.mtime).format(fmt),
        changefreq: 'weekly',
        priority: 0.8
      })
    }
  }

  // Other static pages (sponsor-electerm, privacy-policy, etc)
  for (const page of data.pages) {
    if (page !== 'faq') {
      urls.push({
        loc: host + '/' + page + '/',
        lastmod: dayjs(state.mtime).format(fmt),
        changefreq: 'weekly',
        priority: 1
      })
    }
  }

  // Videos index
  urls.push({
    loc: host + '/videos/',
    lastmod: dayjs().format(fmt),
    changefreq: 'weekly',
    priority: 0.9
  })

  // Individual video pages
  if (data.videos) {
    for (const video of data.videos) {
      urls.push({
        loc: `${host}/videos/${video.videoSlug}/`,
        lastmod: dayjs().format(fmt),
        changefreq: 'monthly',
        priority: 0.7
      })
    }
    console.log(`✅ Added ${data.videos.length} video pages to sitemap`)
  }

  createSitemap({
    filePath: resolve(cwd, 'public/sitemap.xml'),
    urls
  })
}

buildSiteMap()
