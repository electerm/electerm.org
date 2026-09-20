// Video pages: language toggle (zh / en) for the page title, the video titles
// and the switcher's active state.
//
// The choice itself lives in the shared site setting (./lang.js), so picking a
// language here also decides which blog the header links to, and vice versa.
import { getLang, setLang } from './lang.js'

const INDEX_TITLE = { zh: 'Electerm 视频教程', en: 'Electerm Videos' }

function render (lang) {
  // Single video page: <h1> carries both titles. Videos index: no <h1>.
  const h1Title = document.querySelector('h1.video-title')
  document.title = h1Title
    ? (lang === 'zh' ? h1Title.dataset.titleZh : h1Title.dataset.titleEn)
    : INDEX_TITLE[lang]

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang)
  })

  document.querySelectorAll('[data-title-en]').forEach(el => {
    el.textContent = lang === 'zh' ? el.dataset.titleZh : el.dataset.titleEn
  })
}

// setLang() normalizes, persists and publishes the value; render from what it
// actually stored rather than from the raw argument.
function apply (lang) {
  render(setLang(lang) || getLang())
}

document.addEventListener('DOMContentLoaded', function () {
  apply(getLang())

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      apply(this.dataset.lang)
    })
  })
})
