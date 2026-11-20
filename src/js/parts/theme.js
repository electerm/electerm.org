// Site-wide colour theme. Light is the explicit default: the site never
// follows the OS preference unless the visitor has chosen a theme here.
/* global localStorage, CustomEvent */
const KEY = 'theme'

const META_COLORS = {
  light: '#ffffff',
  dark: '#0f172a'
}

export function normalizeTheme (value) {
  return String(value).toLowerCase() === 'dark' ? 'dark' : 'light'
}

export function getTheme () {
  try {
    return normalizeTheme(localStorage.getItem(KEY))
  } catch (e) {
    return 'light'
  }
}

export function setTheme (value) {
  const theme = normalizeTheme(value)
  try {
    localStorage.setItem(KEY, theme)
  } catch (e) {}

  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.style.colorScheme = theme

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', META_COLORS[theme])

  document.querySelectorAll('[data-theme-toggle]').forEach(function (button) {
    button.setAttribute('aria-pressed', String(theme === 'dark'))
  })

  document.dispatchEvent(new CustomEvent('site:theme', { detail: theme }))
  return theme
}

export function toggleTheme () {
  return setTheme(getTheme() === 'dark' ? 'light' : 'dark')
}

export function initTheme () {
  setTheme(getTheme())
  document.querySelectorAll('[data-theme-toggle]').forEach(function (button) {
    button.addEventListener('click', toggleTheme)
  })
}
