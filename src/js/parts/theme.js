// Site-wide colour theme. Dark is the default — the site never follows the OS
// preference, and only a visitor's explicit choice here (stored as 'light' or
// 'dark') overrides it. The inline script in parts/react-header.pug mirrors
// this rule so the first paint is already correct.
/* global localStorage, CustomEvent */
const KEY = 'theme'
const DEFAULT_THEME = 'dark'

const META_COLORS = {
  light: '#ffffff',
  dark: '#0f172a'
}

export function normalizeTheme (value) {
  const theme = String(value || '').toLowerCase()
  return theme === 'light' || theme === 'dark' ? theme : DEFAULT_THEME
}

export function getTheme () {
  try {
    return normalizeTheme(localStorage.getItem(KEY))
  } catch (e) {
    return DEFAULT_THEME
  }
}

// `persist` is false for the first paint: visiting the site should not look
// like the visitor chose dark, otherwise a later change to DEFAULT_THEME would
// never reach anyone who has been here once.
function apply (theme, persist) {
  if (persist) {
    try {
      localStorage.setItem(KEY, theme)
    } catch (e) {}
  }

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

export function setTheme (value) {
  return apply(normalizeTheme(value), true)
}

export function toggleTheme () {
  return setTheme(getTheme() === 'dark' ? 'light' : 'dark')
}

export function initTheme () {
  let stored = null
  try {
    stored = localStorage.getItem(KEY)
  } catch (e) {}

  apply(stored ? normalizeTheme(stored) : DEFAULT_THEME, false)

  document.querySelectorAll('[data-theme-toggle]').forEach(function (button) {
    button.addEventListener('click', toggleTheme)
  })
}
