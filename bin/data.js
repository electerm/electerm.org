import { config } from 'dotenv'
import { resolve } from 'path'
import { cwd, releaseData } from './common.js'
import fs from 'fs'
import dayjs from 'dayjs'
import { wikiLinks } from './wiki-links.js'

config()

const videos = JSON.parse(fs.readFileSync(resolve(cwd, 'bin/videos.json'), 'utf-8'))

function getSourceforgeUrl (url) {
  const arr = url.split('/')
  const len = arr.length
  return `https://master.dl.sourceforge.net/project/electerm.mirror/${arr[len - 2]}/${arr[len - 1]}?viasf=1`
}

function getCdnUrl (url) {
  return url.replace('github.com', 'r2.electerm.org')
}

function convertToProperLangCode (code) {
  const langMappings = {
    ar_ar: 'ar',
    de_de: 'de',
    en_us: 'en-US',
    es_es: 'es-ES',
    fr_fr: 'fr',
    id_id: 'id',
    ja_jp: 'ja',
    ko_kr: 'ko',
    pl_pl: 'pl',
    pt_br: 'pt-BR',
    ru_ru: 'ru',
    tr_tr: 'tr',
    zh_cn: 'zh-CN',
    zh_tw: 'zh-TW'
  }

  return langMappings[code] || code
}

function localeIdToSlug (id) {
  const slugMap = {
    ar_ar: 'ar',
    de_de: 'de',
    en_us: '',
    es_es: 'es',
    fr_fr: 'fr',
    id_id: 'id',
    ja_jp: 'ja',
    ko_kr: 'ko',
    pl_pl: 'pl',
    pt_br: 'pt-br',
    ru_ru: 'ru',
    tr_tr: 'tr',
    zh_cn: 'zh-cn',
    zh_tw: 'zh-tw'
  }
  return slugMap[id]
}

function createLocaleData () {
  // languages from local src/data/*.json files
  const dataFolder = resolve(cwd, 'src/data')
  const pre = process.env.HOST
  const idToFileMap = {
    ar_ar: 'ar',
    de_de: 'de',
    en_us: 'en',
    es_es: 'es',
    fr_fr: 'fr',
    id_id: 'id',
    ja_jp: 'ja',
    ko_kr: 'ko',
    pl_pl: 'pl',
    pt_br: 'pt-br',
    ru_ru: 'ru',
    tr_tr: 'tr',
    zh_cn: 'zh-cn',
    zh_tw: 'zh-tw'
  }
  return Object.entries(idToFileMap).reduce((prev, [id, fileName]) => {
    const filePath = resolve(dataFolder, fileName + '.json')
    if (!fs.existsSync(filePath)) {
      return prev
    }
    const lang = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    const slug = localeIdToSlug(id)
    const url = slug === '' ? pre : pre + '/' + slug + '/'
    prev = [
      ...prev,
      {
        id,
        slug,
        langCode: convertToProperLangCode(id),
        lang,
        url
      }
    ]
    return prev
  }, [])
}

function createReleaseData () {
  const data = releaseData
  const starCount = data.starCount
  const assets = data.release.assets
  const version = data.release.tag_name
  const releaseNote = data.release.body.replace(/\r?\n-{3,}\r?\n\r?\nDownload下载:.*$/, '')
  console.log('version:', version)
  const dt = dayjs(assets[0].created_at).format('YYYY-MM-DD')
  const dtISO = dayjs(assets[0].created_at).toISOString()
  const arr = assets.reduce((prev, curr) => {
    const nr = {
      ...curr,
      sourceforgeUrl: getSourceforgeUrl(curr.browser_download_url),
      cdnUrl: getCdnUrl(curr.browser_download_url)
    }
    const cname = curr.name
    if (
      cname.includes('win') &&
      !cname.endsWith('.blockmap') &&
      !cname.includes('.appx') &&
      !cname.includes('loose')
    ) {
      // Add descriptions for Windows files
      if (cname.includes('installer') && cname.endsWith('.exe')) {
        nr.desc = 'Windows installer (recommended)'
      } else if (cname.endsWith('.exe') && !cname.includes('installer')) {
        nr.desc = 'Portable executable'
      } else if (cname.endsWith('.zip')) {
        nr.desc = 'Portable zip archive'
      } else if (cname.endsWith('.msi')) {
        nr.desc = 'Windows installer package'
      } else if (cname.includes('portable') && cname.endsWith('.tar.gz')) {
        nr.desc = 'Portable archive'
      } else if (cname.includes('win7')) {
        nr.desc = 'Legacy Windows 7 compatible'
      } else if (cname.endsWith('.tar.gz')) {
        nr.desc = 'Just extract and run'
      }

      // Determine Windows architecture
      let archType = ''
      if (cname.includes('arm64')) {
        archType = 'arm64'
      } else if (cname.includes('x64') || cname.includes('x86_64')) {
        archType = 'x64'
      } else if (cname.includes('win7')) {
        archType = 'win7'
      } else {
        // Default to x64 for unspecified Windows releases
        archType = 'x64'
      }

      // Add to appropriate architecture group
      if (!prev.windows[archType]) {
        prev.windows[archType] = {
          name: '',
          items: []
        }
      }

      prev.windows[archType].releaseDate = dt
      prev.windows[archType].releaseNote = releaseNote
      prev.windows[archType].items.push(nr)
    } else if (cname.endsWith('.dmg')) {
      // Add descriptions for macOS files
      if (cname.includes('mac10')) {
        nr.desc = 'for macOS 10.x'
      } else if (cname.includes('arm64') || cname.includes('apple-silicon')) {
        nr.desc = 'for Apple Silicon Macs (M1, M2, etc.)'
      } else if (cname.includes('x64') || cname.includes('intel')) {
        nr.desc = 'for Intel Macs'
      } else {
        nr.desc = 'macOS disk image'
      }
      prev.mac.releaseNote = releaseNote
      prev.mac.releaseDate = dt
      prev.mac.items.push(nr)
    } else if (cname.includes('linux')) {
      const isLegacy = cname.includes('-legacy')

      const isLoong64 = cname.includes('loong64')
      const isLoongarch64 = cname.includes('loongarch64')

      if (cname.endsWith('.rpm')) {
        nr.desc = isLegacy ? 'for Red Hat, Fedora... (glibc < 2.34)' : 'for Red Hat, Fedora...'
      } else if (cname.endsWith('.deb')) {
        if (isLoong64) {
          nr.desc = isLegacy ? 'for old world UOS/Kylin...' : 'for new world UOS/Kylin...'
        } else if (isLoongarch64) {
          nr.desc = isLegacy ? 'for old world Debian, Ubuntu... (loongarch64)' : 'for new world Debian, Ubuntu... (loongarch64)'
        } else {
          nr.desc = isLegacy ? 'for Debian, Ubuntu... (glibc < 2.34, like UOS/Kylin/Ubuntu 18)' : 'for Debian, Ubuntu...'
        }
      } else if (cname.endsWith('.snap')) {
        nr.desc = 'for all linux that support snap'
      } else if (cname.endsWith('.gz')) {
        if (isLoong64 || isLoongarch64) {
          nr.desc = isLegacy ? 'for old world loongarch, just extract' : 'for new world loongarch, just extract'
        } else {
          nr.desc = isLegacy ? 'for all linux, just extract (glibc < 2.34)' : 'for all linux, just extract'
        }
      } else if (cname.endsWith('.AppImage')) {
        nr.desc = isLegacy ? 'for all linux, just run it (glibc < 2.34)' : 'for all linux, just run it'
      }

      // Determine architecture and legacy status
      let archType = ''

      if (cname.includes('x64') || cname.includes('x86') || cname.includes('amd64')) {
        archType = 'x86_64'
      } else if (cname.includes('arm64') || cname.includes('aarch64')) {
        archType = 'arm64'
      } else if (cname.includes('armv7l')) {
        archType = 'armv7'
      } else if (cname.includes('loong64') || cname.includes('loongarch64')) {
        archType = 'loong64'
      }

      // Add to appropriate architecture group
      const category = isLegacy ? `${archType}_legacy` : archType
      if (!prev.linux[category]) {
        prev.linux[category] = {
          name: '',
          items: []
        }
      }

      prev.linux[category].releaseDate = dt
      prev.linux[category].releaseNote = releaseNote
      prev.linux[category].items.push(nr)
    }
    return prev
  }, {
    linux: {
      x86_64: {
        name: 'Linux x86_64',
        items: []
      },
      x86_64_legacy: {
        name: 'Linux x86_64 Legacy',
        items: []
      },
      arm64: {
        name: 'Linux ARM64',
        items: []
      },
      arm64_legacy: {
        name: 'Linux ARM64 Legacy',
        items: []
      },
      armv7: {
        name: 'Linux ARMv7',
        items: []
      },
      armv7_legacy: {
        name: 'Linux ARMv7 Legacy',
        items: []
      },
      loong64: {
        name: 'Linux LoongArch64 (New World)',
        items: []
      },
      loong64_legacy: {
        name: 'Linux LoongArch64 (Old World)',
        items: []
      }
    },
    mac: {
      name: 'Mac OS x64',
      items: []
    },
    windows: {
      x64: {
        name: 'Windows x64',
        items: []
      },
      arm64: {
        name: 'Windows ARM64',
        items: []
      },
      win7: {
        name: 'Windows 7 Legacy',
        items: []
      }
    }
  })
  return {
    assets: arr,
    version,
    starCount,
    releaseDate: dt,
    releaseDateISO: dtISO
  }
}

export default {
  desc: 'Free and open-sourced terminal/ssh/sftp/telnet/serialport/RDP/VNC/Spice/ftp client (linux, mac, win)',
  siteName: 'electerm',
  host: process.env.HOST,
  videos: videos.videos,
  pages: [
    'sponsor-electerm',
    'privacy-policy',
    'faq',
    'about',
    'terms',
    'contact'
  ],
  langs: createLocaleData(),
  ...createReleaseData(),
  links: [
    {
      url: 'https://www.atlascloud.ai/?utm_source=github&utm_medium=link&utm_campaign=electerm',
      title: 'Atlas Cloud'
    },
    {
      url: 'https://electerm.org/videos/',
      title: 'Electerm Video guide'
    },
    {
      url: 'https://github.com/electerm/electerm',
      title: 'GitHub'
    },
    {
      url: 'https://github.com/electerm/electerm-web',
      title: 'electerm-web'
    },
    {
      url: 'https://github.com/electerm/electerm-web-docker',
      title: 'electerm-web-docker'
    },
    {
      url: 'https://github.com/electerm/electerm-locales',
      title: 'electerm-locales'
    },
    {
      url: 'https://www.microsoft.com/store/apps/9NCN7272GTFF',
      title: 'Windows Store'
    },
    {
      url: 'https://snapcraft.io/electerm',
      title: 'Snap Store'
    },
    {
      url: 'electerm@atomgit',
      title: 'https://atomgit.com/electerm/electerm'
    },
    {
      url: 'https://github.com/electerm/electerm/wiki/Know-issues',
      title: 'Know issues'
    },
    {
      url: 'https://github.com/electerm/electerm/wiki/Troubleshoot',
      title: 'Troubleshoot'
    },
    {
      url: 'https://github.com/electerm/electerm/discussions',
      title: 'Discussion'
    },
    {
      url: 'https://electerm.org/sponsor-electerm/',
      title: 'Sponsor Electerm'
    },
    {
      url: 'https://github.com/mbadolato/iTerm2-Color-Schemes/tree/master/electerm',
      title: 'Themes'
    },
    {
      url: 'https://sync.electerm.org/',
      title: 'electerm cloud'
    },
    {
      url: 'https://github.com/tylerlong/manate',
      title: 'manate'
    },
    {
      title: 'Simple games for kids',
      url: 'https://g.html5beta.com'
    },
    {
      title: 'China vs Rest of the World',
      url: 'https://china-vs-rest-of-the-world.html5beta.com'
    }
  ].concat(wikiLinks),
  linkCategories: [
    {
      key: 'Official',
      links: [
        { title: 'GitHub Repository', url: 'https://github.com/electerm/electerm', external: true },
        { title: 'Wiki & Documentation', url: 'https://github.com/electerm/electerm/wiki', external: true },
        { title: 'Command Line Usage', url: 'https://github.com/electerm/electerm/wiki/Command-line-usage', external: true },
        { title: 'Deep Link Support', url: 'https://github.com/electerm/electerm/wiki/Deep-link-support', external: true },
        { title: 'Known Issues', url: 'https://github.com/electerm/electerm/wiki/Know-issues', external: true },
        { title: 'Troubleshooting', url: 'https://github.com/electerm/electerm/wiki/Troubleshoot', external: true },
        { title: 'Discussions', url: 'https://github.com/electerm/electerm/discussions', external: true }
      ]
    },
    {
      key: 'Ecosystem',
      links: [
        { title: 'Electerm Online', url: 'https://cloud.electerm.org', external: true },
        { title: 'APT Repository', url: 'https://repos.electerm.org/deb', external: true },
        { title: 'RPM Repository', url: 'https://repos.electerm.org/rpm', external: true },
        { title: 'electerm-web', url: 'https://github.com/electerm/electerm-web', external: true },
        { title: 'electerm-web-docker', url: 'https://github.com/electerm/electerm-web-docker', external: true },
        { title: 'electerm-locales', url: 'https://github.com/electerm/electerm-locales', external: true },
        { title: 'electerm cloud', url: 'https://sync.electerm.org/', external: true }
        { title: 'AI Dream', url: 'https://ai-dream.html5beta.com', external: true }
      ]
    },
    {
      key: 'Community',
      links: [
        { title: 'Sponsor Electerm', url: '/sponsor-electerm/' },
        { title: 'Atlas Cloud', url: 'https://www.atlascloud.ai/?utm_source=github&utm_medium=link&utm_campaign=electerm', external: true },
        { title: 'Video Guides', url: '/videos/' },
        { title: 'Windows Store', url: 'https://www.microsoft.com/store/apps/9NCN7272GTFF', external: true },
        { title: 'Snap Store', url: 'https://snapcraft.io/electerm', external: true }
      ]
    }
  ]
}
