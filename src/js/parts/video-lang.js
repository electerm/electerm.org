// Video pages: language toggle (zh / en) for titles and UI.
/* global localStorage */
function getBrowserLang () {
  const lang = navigator.language || navigator.userLanguage
  return lang.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

function getCurrentLang () {
  const saved = localStorage.getItem('video-lang')
  return saved || getBrowserLang()
}

function updateLanguage (lang) {
  document.documentElement.setAttribute('data-video-lang', lang)
  localStorage.setItem('video-lang', lang)

  const h1Title = document.querySelector('h1.video-title')
  if (h1Title) {
    const titleEn = h1Title.dataset.titleEn
    const titleZh = h1Title.dataset.titleZh
    document.title = lang === 'zh' ? titleZh : titleEn
  } else {
    document.title = lang === 'zh' ? 'Electerm 视频教程' : 'Electerm Videos'
  }

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang)
  })

  document.querySelectorAll('[data-title-en]').forEach(el => {
    const titleEn = el.dataset.titleEn
    const titleZh = el.dataset.titleZh
    el.textContent = lang === 'zh' ? titleZh : titleEn
  })
}

document.addEventListener('DOMContentLoaded', function () {
  const currentLang = getCurrentLang()
  updateLanguage(currentLang)

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      updateLanguage(this.dataset.lang)
    })
  })
})
