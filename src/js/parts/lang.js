// Site-wide language preference, shared by the blog and the video pages.
//
// There is one setting. The two sections consume it differently:
//   blog  — statically built per language (/blogs/ vs /blogs/cn/), so the URL
//           decides what a page renders. Every blog page records the language
//           it was rendered in here, and the header's Blog links follow it.
//   video — a single page carrying both languages, swapped client-side, so it
//           reads the value to pick the initial one and writes it back when
//           the visitor toggles.
//
// Stored under `lang`. `video-lang` is the key used before the two settings
// were merged; it is still read so a choice made earlier is not lost.
/* global localStorage, CustomEvent */
const KEY = 'lang'
const LEGACY_KEY = 'video-lang'

// stored language <-> blog URL segment
const BLOG_SEGMENT = { en: 'en', zh: 'cn' }
const SEGMENT_LANG = { en: 'en', cn: 'zh' }

export function normalizeLang (value) {
  const v = String(value === null || value === undefined ? '' : value)
    .trim()
    .toLowerCase()
  if (v === 'cn' || v.startsWith('zh')) return 'zh'
  if (v.startsWith('en')) return 'en'
  return ''
}

export function getBrowserLang () {
  return normalizeLang(navigator.language || navigator.userLanguage) || 'en'
}

export function getLang () {
  let saved = ''
  try {
    saved = normalizeLang(localStorage.getItem(KEY)) ||
      normalizeLang(localStorage.getItem(LEGACY_KEY))
  } catch (e) {}
  return saved || getBrowserLang()
}

// Persist a choice. Returns the normalized value that was stored, so callers
// can render straight from the return value.
export function setLang (lang) {
  const v = normalizeLang(lang)
  if (!v) return ''
  try {
    localStorage.setItem(KEY, v)
    localStorage.removeItem(LEGACY_KEY)
  } catch (e) {}
  document.documentElement.setAttribute('data-lang', v)
  document.dispatchEvent(new CustomEvent('site:lang', { detail: v }))
  return v
}

// Stored language -> blog URL segment, and back again.
export function blogSegment (lang) {
  return BLOG_SEGMENT[normalizeLang(lang) || getLang()] || 'en'
}

export function blogLangToStored (segment) {
  return SEGMENT_LANG[String(segment || '').toLowerCase()] || 'en'
}

export function blogUrl (lang) {
  return blogSegment(lang) === 'cn' ? '/blogs/cn/' : '/blogs/'
}

// The blog is the only section with a URL per language, so its header links
// follow the shared setting instead of always landing on the English list.
export function syncLangLinks (root) {
  const scope = root || document
  scope.querySelectorAll('[data-lang-blog-link]').forEach(function (a) {
    a.setAttribute('href', blogUrl())
  })
}

function init () {
  // Blog pages are rendered one language per URL; remember which one the
  // visitor is reading so the video pages and the header follow along.
  const page = normalizeLang(document.documentElement.dataset.pageLang)
  if (page) setLang(page)
  syncLangLinks()
}

document.addEventListener('site:lang', function () {
  syncLangLinks()
})

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
