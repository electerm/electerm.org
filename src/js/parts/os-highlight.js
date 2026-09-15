/**
 * OS-variant highlight animation for the hero "supports" line (.hero-supports).
 *
 * The supports sentence lists every OS/arch electerm ships for
 * (Windows/macOS/Linux/Android/HarmonyOS/iOS + Ubuntu 18, Windows 7,
 * macOS 10+, UOS, Kylin, LoongArch old/new-world, riscv64, ppc64le ...).
 * This module wraps each OS token in a pill chip and spotlights one random
 * chip at a time — so visitors notice the breadth of supported variants.
 *
 * - Language-agnostic: matches latin + CJK tokens, longest-first.
 * - Random spotlight order with a glow/pop effect (CSS class .os-active).
 * - Clicking a chip jumps to #downloads and opens the matching OS tab.
 * - Respects prefers-reduced-motion (static chips, no cycling).
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

function initOsHighlight () {
  const el = document.querySelector('.hero-supports')
  if (!el || el.dataset.osAnimated) return
  const raw = el.textContent
  if (!raw || !RE.test(raw)) return
  RE.lastIndex = 0
  el.dataset.osAnimated = '1'

  el.innerHTML = escapeHtml(raw).replace(RE, function (m) {
    const tab = tabFor(m)
    const emoji = emojiFor(m)
    return '<span class="os-chip" data-tab="' + tab + '" title="See ' +
      escapeHtml(m) + ' downloads ↓"><span class="os-emoji" aria-hidden="true">' +
      emoji + '</span>' + escapeHtml(m) + '</span>'
  })

  const chips = Array.from(el.querySelectorAll('.os-chip'))
  if (chips.length === 0) return

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      jumpToDownload(chip.dataset.tab || 'linux')
    })
  })

  const reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduceMotion) {
    el.classList.add('os-static')
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
    if (current >= 0 && chips[current]) chips[current].classList.remove('os-active')
    current = pickNext()
    const chip = chips[current]
    if (chip) {
      chip.classList.remove('os-pop')
      // force reflow so the pop animation re-triggers every cycle
      chip.getBoundingClientRect()
      chip.classList.add('os-active', 'os-pop')
    }
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
