/**
 * OS-variant highlight animation for the hero "supports" line (.hero-supports).
 *
 * The supports sentence lists every OS/arch electerm ships for
 * (Windows/macOS/Linux/Android/HarmonyOS/iOS + Ubuntu 18, Windows 7,
 * macOS 10+, UOS, Kylin, LoongArch old/new-world, riscv64, ppc64le ...).
 * This module spotlights one random token at a time — so visitors notice
 * the breadth of supported variants.
 *
 * - Language-agnostic: matches latin + CJK tokens, longest-first.
 * - Idle state is plain text: no pill, no emoji, no margin, not clickable.
 * - Only the spotlighted token gets the pill + emoji + link behavior
 *   (CSS class .os-active), emoji node is added/removed on the fly.
 * - Clicking the active chip jumps to #downloads and opens matching OS tab.
 * - Respects prefers-reduced-motion (plain text, no cycling).
 * - Pauses on hover / hidden tab / off-screen.
 */
/* global IntersectionObserver */

const KEYWORDS = [
  'Windows 7',
  'macOS 10+',
  'PowerPC 64-bit little-endian',
  'PowerPC 64-Bit-Little-Endian',
  'old-world',
  'new-world',
  'LoongArch',
  'riscv64',
  'RISC-V',
  'RISC V',
  'ppc64le',
  'PowerPC',
  'HarmonyOS',
  'Windows',
  'macOS',
  'Android',
  'Ubuntu 18',
  'Ubuntu',
  'Kylin',
  'UOS',
  'Linux',
  'iOS',
  // CJK tokens (zh-cn / zh-tw)
  '银河麒麟',
  '统信',
  '龙芯',
  '麒麟',
  '新旧世界'
]

const EMOJI = [
  { re: /windows 7/i, emoji: '🪟' },
  { re: /windows/i, emoji: '🪟' },
  { re: /macos/i, emoji: '🍎' },
  { re: /^mac$/i, emoji: '🍎' },
  { re: /linux|ubuntu|uos|kylin|麒麟|统信/i, emoji: '🐧' },
  { re: /android/i, emoji: '🤖' },
  { re: /harmony/i, emoji: '🌸' },
  { re: /ios/i, emoji: '📱' },
  { re: /loongarch|龙芯|old-world|new-world|新旧世界/i, emoji: '🐉' },
  { re: /risc/i, emoji: '🧬' },
  { re: /ppc|powerpc/i, emoji: '⚙️' }
]

function emojiFor (text) {
  for (const m of EMOJI) {
    if (m.re.test(text)) return m.emoji
  }
  return '💻'
}

// Map a chip label to a download tab name (matches data-tab in download.pug)
function tabFor (text) {
  const t = text.toLowerCase()
  if (t.includes('windows')) return 'windows'
  if (t.includes('macos') || t === 'mac' || t.includes('mac os')) return 'mac'
  if (t.includes('android')) return 'android'
  if (t.includes('harmony')) return 'harmony'
  if (t.includes('ios')) return 'ios'
  return 'linux'
}

function escapeRe (s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const PATTERN = KEYWORDS
  .slice()
  .sort((a, b) => b.length - a.length)
  .map(escapeRe)
  .join('|')

const RE = new RegExp('(' + PATTERN + ')', 'gi')

function escapeHtml (s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function jumpToDownload (tab) {
  const btn = document.querySelector('.download-tab-btn[data-tab="' + tab + '"]')
  if (btn) btn.click()
  const anchor = document.getElementById('downloads')
  if (anchor) {
    anchor.scrollIntoView({ behavior: 'smooth', block: 'start' })
  } else {
    window.location.hash = '#downloads'
  }
}

function setActive (chip, on) {
  if (on) {
    const orig = chip.dataset.orig || chip.textContent
    if (!chip.querySelector('.os-emoji')) {
      const em = document.createElement('span')
      em.className = 'os-emoji'
      em.setAttribute('aria-hidden', 'true')
      em.textContent = emojiFor(orig)
      chip.insertBefore(em, chip.firstChild)
    }
    if (!chip.title) chip.title = 'See ' + orig + ' downloads ↓'
    chip.classList.remove('os-pop')
    // force reflow so the pop animation re-triggers every cycle
    chip.getBoundingClientRect()
    chip.classList.add('os-active', 'os-pop')
  } else {
    chip.classList.remove('os-active', 'os-pop')
    chip.removeAttribute('title')
    const em = chip.querySelector('.os-emoji')
    if (em) em.remove()
  }
}

function initOsHighlight () {
  const el = document.querySelector('.hero-supports')
  if (!el || el.dataset.osAnimated) return
  const raw = el.textContent
  if (!raw || !RE.test(raw)) return
  RE.lastIndex = 0
  el.dataset.osAnimated = '1'

  // Wrap tokens as plain text only — no pill, no emoji, no link affordance.
  // Decoration (emoji + .os-active pill + title) is added in setActive().
  el.innerHTML = escapeHtml(raw).replace(RE, function (m) {
    const tab = tabFor(m)
    return '<span class="os-chip" data-tab="' + tab + '" data-orig="' +
      escapeHtml(m) + '">' + escapeHtml(m) + '</span>'
  })

  const chips = Array.from(el.querySelectorAll('.os-chip'))
  if (chips.length === 0) return

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      // Only the highlighted chip acts as a link
      if (!chip.classList.contains('os-active')) return
      jumpToDownload(chip.dataset.tab || 'linux')
    })
  })

  const reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduceMotion) {
    // Stay as plain text, no cycling, no decoration
    return
  }

  let current = -1
  let timer = null
  let hover = false
  let inView = true

  function pickNext () {
    if (chips.length === 1) return 0
    let next = Math.floor(Math.random() * chips.length)
    if (next === current) next = (next + 1 + Math.floor(Math.random() * (chips.length - 1))) % chips.length
    return next
  }

  function spotlight () {
    if (current >= 0 && chips[current]) setActive(chips[current], false)
    current = pickNext()
    const chip = chips[current]
    if (chip) setActive(chip, true)
  }

  function schedule () {
    clearTimeout(timer)
    // random cadence 900–1900ms keeps it playful / non-mechanical
    timer = setTimeout(function () {
      if (!hover && inView && !document.hidden) spotlight()
      schedule()
    }, 900 + Math.random() * 1000)
  }

  el.addEventListener('mouseenter', function () { hover = true })
  el.addEventListener('mouseleave', function () { hover = false })

  if (window.IntersectionObserver) {
    const io = new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting
    }, { threshold: 0.1 })
    io.observe(el)
  }

  // kick off with a small stagger so it doesn't fire before paint
  setTimeout(spotlight, 600)
  schedule()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initOsHighlight)
} else {
  initOsHighlight()
}

export default initOsHighlight
