/**
 * Animated banner for the "data sync" blog post.
 *
 * Everything is generated here — no image, no GIF, no canvas: the headline,
 * the mock Settings → Sync panel (tab strip + credential form + data-type
 * chips + device/server transfer lane) are plain DOM + CSS driven by one
 * requestAnimationFrame timeline.
 *
 * One loop, in the order the article introduces the feature:
 *
 *   1. The five sync tabs cycle: github → gitee → custom → cloud → webdav.
 *   2. Per tab the credential rows swap (token/gist, JWT/user-id, WebDAV
 *      server/user/pass …) mirroring setting-sync-form.jsx.
 *   3. Packets (bookmarks, themes, quickCommands, profiles, triggers … from
 *      syncDataMaps) fly device ↔ server; even tabs upload, odd tabs
 *      download — with a progress bar and a lastSyncTime stamp.
 *   4. The server file list (bookmarks.json, userConfig.json,
 *      electerm-status.json …) lights up as files land; bookmarks/profiles
 *      rows show a lock when the sync password (encrypt) is on.
 *
 * Modelled on the real electerm UI:
 *   tabs ........... src/client/components/setting-sync/setting-sync.jsx
 *                    (antd Tabs over allowedSyncTypes())
 *   form ........... src/client/components/setting-sync/setting-sync-form.jsx
 *   data types ..... src/client/common/constants.js (syncDataMaps)
 *   upload/download  src/client/store/sync.js
 *                    (uploadSettingAction / downloadSettingAction)
 *   auto sync ...... src/client/components/setting-sync/data-import.jsx +
 *                    auto-sync.jsx
 *
 * Mount points: any element carrying [data-eb-banner]:
 *   data-eb-banner="hero"  -> headline + full panel (blog post page)
 *   data-eb-banner="card"  -> panel only            (blog index thumbnail)
 * Every banner script on the blog index is loaded for every card, so a mount
 * also has to match data-eb-banner-src — otherwise the first script to run
 * would claim every card.
 *
 * Layout is expressed in `em`, root font-size is 1% of banner width, so one
 * design scales to any container.
 */

const STYLE_ID = 'eb-ds-style'

const TABS = [
  {
    id: 'github',
    label: 'github',
    accent: '#24292f',
    server: 'secret gist',
    rows: [['token', 'ghp_••••••••'], ['gist id', 'a1b2c3d4']]
  },
  {
    id: 'gitee',
    label: 'gitee',
    accent: '#c71d23',
    server: 'secret gist',
    rows: [['token', '••••••••'], ['gist id', 'xxxxxxxx']]
  },
  {
    id: 'custom',
    label: 'custom',
    accent: '#7c3aed',
    server: 'your server',
    rows: [['JWT secret', '••••••••'], ['user id', 'me@home']]
  },
  {
    id: 'cloud',
    label: 'cloud',
    accent: '#0284c7',
    server: 'sync.electerm.org',
    rows: [['token', '••••••••'], ['api', 'sync.electerm.org']]
  },
  {
    id: 'webdav',
    label: 'webdav',
    accent: '#059669',
    server: '/electerm/',
    rows: [['server', 'dav.jianguoyun.com/dav/'], ['user', 'me@home']]
  }
]

// One tab at a time, upload and download alternate so both arrows animate.
const TAB_DUR = 2400
const PERIOD = TAB_DUR * TABS.length
const FADE_FROM = PERIOD - 600

const CHIPS = ['bookmarks', 'themes', 'quickCmd', 'profiles', 'triggers']
const FILES = [
  { name: 'bookmarks.json', lock: true },
  { name: 'profiles.json', lock: true },
  { name: 'userConfig.json', lock: false },
  { name: 'electerm-status.json', lock: false }
]

const CSS = `
.eb-ds {
  --eb-primary: #2563eb;
  --eb-line: #dbe4f3;
  --eb-ink: #0f172a;
  --eb-sub: #5b6b82;
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: var(--radius-lg, 12px);
  border: 1px solid var(--color-border, #d9e2f0);
  background: linear-gradient(135deg, #e9f1ff 0%, #eef2ff 48%, #fdf0f6 100%);
  color: #16233a;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.3;
  isolation: isolate;
  -webkit-font-smoothing: antialiased;
}
.eb-ds-deco { position: absolute; inset: 0; pointer-events: none; }
.eb-ds-dots {
  position: absolute;
  inset: -6em;
  background-image: radial-gradient(rgba(37, 99, 235, 0.18) 0.18em, transparent 0.18em);
  background-size: 4.2em 4.2em;
  animation: eb-ds-drift 36s linear infinite;
}
@keyframes eb-ds-drift { to { transform: translate3d(4.2em, 4.2em, 0); } }
.eb-ds-blob { position: absolute; border-radius: 50%; background: rgba(255,255,255,0.6); }
.eb-ds-blob-a { width: 30em; height: 30em; right: -10em; top: -13em; }
.eb-ds-blob-b { width: 24em; height: 24em; left: -8em; bottom: -11em; }
.eb-ds-head { position: absolute; left: 5em; right: 5em; top: 3em; }
.eb-ds-brand {
  display: inline-flex; align-items: center; gap: 0.45em;
  font-size: 1.4em; font-weight: 800; color: #2563eb;
}
.eb-ds-brand::before {
  content: ''; width: 1.05em; height: 1.05em; border-radius: 50%;
  background: #2563eb; box-shadow: inset 0 0 0 0.32em #fff;
}
.eb-ds-h1 { margin: 0.22em 0 0; font-size: 3.1em; font-weight: 800; line-height: 1.05; letter-spacing: -0.025em; color: #0f172a; }
.eb-ds-h1 em {
  font-style: normal;
  background: linear-gradient(96deg, #2563eb, #7c3aed 52%, #ec4899);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.eb-ds-sub { margin: 0.5em 0 0; max-width: 66em; font-size: 1.5em; line-height: 1.4; color: #475569; }
.eb-ds-sub b { color: #0f172a; }
.eb-ds-panel {
  position: absolute; left: 50%; bottom: 5.2%; transform: translateX(-50%);
  width: 93em; border-radius: 0.9em; overflow: hidden; text-align: left;
  background: #fff; border: 1px solid var(--eb-line);
  box-shadow: 0 1.3em 2.6em rgba(15,23,42,0.28), 0 0 2.4em rgba(37,99,235,0.18);
  animation: eb-ds-glow 4.6s ease-in-out infinite;
}
@keyframes eb-ds-glow {
  0%, 100% { box-shadow: 0 1.3em 2.6em rgba(15,23,42,0.28), 0 0 2.4em rgba(37,99,235,0.16); }
  50% { box-shadow: 0 1.3em 2.6em rgba(15,23,42,0.3), 0 0 3.4em rgba(124,58,237,0.36); }
}
.eb-ds-tabs { display: flex; gap: 0.4em; padding: 0.7em 0.9em 0; background: #f4f6fb; }
.eb-ds-tab {
  flex: 1; text-align: center; font-size: 1.35em; font-weight: 700;
  padding: 0.5em 0.2em 0.55em; border-radius: 0.5em 0.5em 0 0;
  color: #8a97ab; background: transparent; border: 1px solid transparent;
  border-bottom: none; transition: all 0.25s; white-space: nowrap;
}
.eb-ds-tab .dot { display: inline-block; width: 0.55em; height: 0.55em; border-radius: 50%; background: currentColor; margin-right: 0.4em; vertical-align: 0.05em; }
.eb-ds-tab.is-active { background: #fff; color: var(--eb-ink); border-color: var(--eb-line); box-shadow: 0 -0.3em 0.8em rgba(15,23,42,0.06); }
.eb-ds-body { display: flex; gap: 1em; padding: 1em 1.1em 1.1em; background: #fff; }
.eb-ds-form { flex: 1.25; min-width: 0; }
.eb-ds-row {
  display: flex; align-items: center; justify-content: space-between; gap: 0.8em;
  font-size: 1.3em; border: 1px solid var(--eb-line); border-radius: 0.5em;
  padding: 0.42em 0.7em; margin-bottom: 0.5em; background: #fbfcff; color: var(--eb-sub);
}
.eb-ds-row b { color: var(--eb-ink); font-weight: 700; }
.eb-ds-row .val { font-family: ui-monospace, Menlo, monospace; font-size: 0.92em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.eb-ds-encrypt {
  display: flex; align-items: center; gap: 0.5em; font-size: 1.25em; font-weight: 700; color: #047857;
  background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 0.5em; padding: 0.4em 0.7em; margin-bottom: 0.55em;
}
.eb-ds-chips { display: flex; flex-wrap: wrap; gap: 0.35em; }
.eb-ds-chip {
  font-size: 1.12em; font-weight: 700; color: #334155; background: #f1f5f9;
  border: 1px solid var(--eb-line); border-radius: 999px; padding: 0.18em 0.6em;
}
.eb-ds-chip.is-flying { background: #dbeafe; border-color: #93c5fd; color: #1d4ed8; }
.eb-ds-lane { flex: 1; min-width: 0; border: 1px solid var(--eb-line); border-radius: 0.6em; background: #f8fafc; padding: 0.7em 0.8em; position: relative; overflow: hidden; }
.eb-ds-endpoints { display: flex; justify-content: space-between; align-items: center; font-size: 1.25em; font-weight: 800; color: var(--eb-ink); }
.eb-ds-pill { font-size: 0.82em; font-weight: 700; background: #e0e7ff; color: #3730a3; border-radius: 999px; padding: 0.15em 0.6em; }
.eb-ds-track { position: relative; height: 4.4em; margin: 0.5em 0 0.4em; }
.eb-ds-track::before {
  content: ''; position: absolute; left: 0.4em; right: 0.4em; top: 50%; height: 0.28em;
  background: #e2e8f0; border-radius: 999px; transform: translateY(-50%);
}
.eb-ds-dir { position: absolute; left: 0.4em; right: 0.4em; top: 50%; height: 0.28em; border-radius: 999px; background: linear-gradient(90deg, #2563eb, #7c3aed); transform: translateY(-50%) scaleX(0); transform-origin: left center; }
.eb-ds[data-dir='down'] .eb-ds-dir { transform-origin: right center; background: linear-gradient(90deg, #059669, #0284c7); }
.eb-ds-pkt {
  position: absolute; top: 50%; left: 0.2em; width: 1.15em; height: 1.15em; margin-top: -0.575em;
  border-radius: 50%; background: #2563eb; box-shadow: 0 0 0 0.28em rgba(37,99,235,0.18);
  animation: eb-ds-fly 2.2s linear infinite;
}
.eb-ds-pkt:nth-child(3) { animation-delay: 0.35s; background: #7c3aed; box-shadow: 0 0 0 0.28em rgba(124,58,237,0.18); }
.eb-ds-pkt:nth-child(4) { animation-delay: 0.7s; background: #ec4899; box-shadow: 0 0 0 0.28em rgba(236,72,153,0.16); }
.eb-ds-pkt:nth-child(5) { animation-delay: 1.05s; background: #059669; box-shadow: 0 0 0 0.28em rgba(5,150,105,0.16); }
@keyframes eb-ds-fly { from { left: 0.2em; opacity: 0; } 12% { opacity: 1; } 88% { opacity: 1; } to { left: calc(100% - 1.35em); opacity: 0; } }
.eb-ds[data-dir='down'] .eb-ds-pkt { animation-name: eb-ds-fly-rev; }
@keyframes eb-ds-fly-rev { from { left: calc(100% - 1.35em); opacity: 0; } 12% { opacity: 1; } 88% { opacity: 1; } to { left: 0.2em; opacity: 0; } }
.eb-ds-files { display: grid; grid-template-columns: 1fr 1fr; gap: 0.35em; }
.eb-ds-file {
  font-size: 1.08em; font-family: ui-monospace, Menlo, monospace; color: #475569;
  background: #fff; border: 1px solid var(--eb-line); border-radius: 0.4em; padding: 0.28em 0.5em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: all 0.25s;
}
.eb-ds-file.is-hit { border-color: #6ee7b7; background: #ecfdf5; color: #065f46; font-weight: 700; }
.eb-ds-foot { display: flex; align-items: center; gap: 0.6em; margin-top: 0.55em; font-size: 1.2em; color: var(--eb-sub); }
.eb-ds-btn { font-weight: 800; border-radius: 0.45em; padding: 0.3em 0.8em; border: 1px solid var(--eb-line); background: #fff; color: var(--eb-ink); }
.eb-ds-btn.is-go { background: #2563eb; border-color: #2563eb; color: #fff; }
.eb-ds-status { margin-left: auto; font-weight: 700; }
.eb-ds-status.ok { color: #059669; }
.eb-ds[data-variant='card'] .eb-ds-panel { bottom: auto; top: 50%; transform: translate(-50%, -50%); }
.eb-ds[data-variant='card'] .eb-ds-tab { font-size: 1.7em; }
.eb-ds[data-variant='card'] .eb-ds-row { font-size: 1.6em; }
.eb-ds[data-variant='card'] .eb-ds-file { font-size: 1.35em; }
.eb-ds[data-variant='card'] .eb-ds-foot { font-size: 1.5em; }
.eb-ds[data-variant='card'] .eb-ds-chip { font-size: 1.4em; }
@media (prefers-reduced-motion: reduce) {
  .eb-ds-dots, .eb-ds-panel, .eb-ds-pkt { animation: none !important; }
}
`

function injectStyle () {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = CSS
  document.head.appendChild(style)
}

function clamp (v, min, max) {
  return Math.max(min, Math.min(max, v))
}

function markup (variant) {
  const head = variant === 'card'
    ? ''
    : `
      <div class="eb-ds-head">
        <span class="eb-ds-brand">electerm</span>
        <h2 class="eb-ds-h1">One setup, <em>every machine</em> in sync</h2>
        <p class="eb-ds-sub"><b>Data sync</b> carries bookmarks, themes &amp; settings to a secret gist, your own server, the cloud or WebDAV.</p>
      </div>`
  const tabs = TABS.map((t, i) =>
    `<span class="eb-ds-tab${i === 0 ? ' is-active' : ''}" data-tab="${t.id}"><span class="dot" style="color:${t.accent};background:${t.accent}"></span>${t.label}</span>`
  ).join('')
  const chips = CHIPS.map((c) => `<span class="eb-ds-chip" data-chip="${c}">${c}</span>`).join('')
  const files = FILES.map((f) =>
    `<span class="eb-ds-file" data-file="${f.name}">${f.lock ? '🔒 ' : ''}${f.name}</span>`
  ).join('')
  return `
    <div class="eb-ds-deco">
      <span class="eb-ds-blob eb-ds-blob-a"></span>
      <span class="eb-ds-blob eb-ds-blob-b"></span>
      <span class="eb-ds-dots"></span>
    </div>
    ${head}
    <div class="eb-ds-panel">
      <div class="eb-ds-tabs">${tabs}</div>
      <div class="eb-ds-body">
        <div class="eb-ds-form">
          <div class="eb-ds-row"><b class="eb-ds-k1">token</b><span class="val eb-ds-v1">ghp_••••••••</span></div>
          <div class="eb-ds-row"><b class="eb-ds-k2">gist id</b><span class="val eb-ds-v2">a1b2c3d4</span></div>
          <div class="eb-ds-encrypt">🔒 encrypt password • on</div>
          <div class="eb-ds-chips">${chips}</div>
        </div>
        <div class="eb-ds-lane">
          <div class="eb-ds-endpoints"><span>💻 this pc</span><span class="eb-ds-pill eb-ds-arrow">upload →</span><span class="eb-ds-srv">secret gist</span></div>
          <div class="eb-ds-track"><div class="eb-ds-dir"></div><span class="eb-ds-pkt"></span><span class="eb-ds-pkt"></span><span class="eb-ds-pkt"></span><span class="eb-ds-pkt"></span></div>
          <div class="eb-ds-files">${files}</div>
          <div class="eb-ds-foot"><span class="eb-ds-btn eb-ds-up">↑ upload</span><span class="eb-ds-btn eb-ds-down">↓ download</span><span class="eb-ds-status ok">✓ synced</span></div>
        </div>
      </div>
    </div>`
}

function mount (host) {
  if (host.getAttribute('data-eb-mounted')) return
  host.setAttribute('data-eb-mounted', '1')

  const variant = host.getAttribute('data-eb-banner') === 'card' ? 'card' : 'hero'
  const root = document.createElement('div')
  root.className = 'eb-ds'
  root.setAttribute('data-variant', variant)
  root.setAttribute('data-dir', 'up')
  root.setAttribute('role', 'img')
  root.setAttribute('aria-label', 'electerm data sync: five backends — github, gitee, custom, cloud, webdav — syncing bookmarks and settings between this pc and the server')
  root.innerHTML = markup(variant)
  host.appendChild(root)

  const el = {
    tabs: Array.from(root.querySelectorAll('.eb-ds-tab')),
    k1: root.querySelector('.eb-ds-k1'),
    v1: root.querySelector('.eb-ds-v1'),
    k2: root.querySelector('.eb-ds-k2'),
    v2: root.querySelector('.eb-ds-v2'),
    srv: root.querySelector('.eb-ds-srv'),
    arrow: root.querySelector('.eb-ds-arrow'),
    dir: root.querySelector('.eb-ds-dir'),
    up: root.querySelector('.eb-ds-up'),
    down: root.querySelector('.eb-ds-down'),
    status: root.querySelector('.eb-ds-status'),
    chips: Array.from(root.querySelectorAll('.eb-ds-chip')),
    files: Array.from(root.querySelectorAll('.eb-ds-file'))
  }

  const fit = () => {
    const w = root.clientWidth
    if (w) root.style.fontSize = (w / 100) + 'px'
  }
  fit()
  if (window.ResizeObserver) {
    new window.ResizeObserver(fit).observe(root)
  } else {
    window.addEventListener('resize', fit)
  }

  let lastTab = -1
  function frame (t) {
    const fade = 1 - clamp((t - FADE_FROM) / (PERIOD - FADE_FROM), 0, 1)
    const idx = Math.floor(t / TAB_DUR) % TABS.length
    const tab = TABS[idx]
    const p = (t % TAB_DUR) / TAB_DUR
    const uploading = idx % 2 === 0

    if (idx !== lastTab) {
      lastTab = idx
      el.tabs.forEach((n, i) => n.classList.toggle('is-active', i === idx))
      el.k1.textContent = tab.rows[0][0]
      el.v1.textContent = tab.rows[0][1]
      el.k2.textContent = tab.rows[1][0]
      el.v2.textContent = tab.rows[1][1]
      el.srv.textContent = tab.server
      root.setAttribute('data-dir', uploading ? 'up' : 'down')
      el.arrow.textContent = uploading ? 'upload →' : '← download'
    }

    // progress lane fills across the tab window
    const eased = 1 - Math.pow(1 - clamp(p, 0, 1), 2)
    el.dir.style.transform = `translateY(-50%) scaleX(${(eased * fade).toFixed(3)})`
    const done = p > 0.72
    el.status.textContent = done ? '✓ synced' : (uploading ? '↑ uploading…' : '↓ downloading…')
    el.status.classList.toggle('ok', done)
    el.up.classList.toggle('is-go', uploading && !done)
    el.down.classList.toggle('is-go', !uploading && !done)

    // chips + files light up in sequence as the transfer progresses
    const lit = Math.floor(eased * (CHIPS.length + 1))
    el.chips.forEach((c, i) => c.classList.toggle('is-flying', i < lit))
    const flit = Math.floor(eased * (FILES.length + 1))
    el.files.forEach((f, i) => f.classList.toggle('is-hit', i < flit))
    root.style.opacity = fade.toFixed(3)
  }

  const reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    frame(TAB_DUR * 0.9)
    return
  }

  const state = { raf: null }
  const start = performance.now()
  const tick = (now) => {
    frame((now - start) % PERIOD)
    state.raf = window.requestAnimationFrame(tick)
  }
  const play = () => {
    if (state.raf === null) state.raf = window.requestAnimationFrame(tick)
  }
  const pause = () => {
    if (state.raf !== null) {
      window.cancelAnimationFrame(state.raf)
      state.raf = null
    }
  }

  if (window.IntersectionObserver) {
    new window.IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) play()
      else pause()
    }, { threshold: 0 }).observe(root)
  } else {
    play()
  }
}

// The path this module was served from, e.g. /blogs/my-post/banner.js.
function selfPath () {
  try {
    return new URL(import.meta.url).pathname
  } catch (err) {
    return ''
  }
}

export function initBanners (doc = document) {
  injectStyle()
  const self = selfPath()
  const hosts = doc.querySelectorAll('[data-eb-banner]')
  for (const host of hosts) {
    // The blog index loads every post's banner module, so a mount has to be
    // the one this module was loaded for. A host with no data-eb-banner-src
    // (a test harness) is fair game for any module.
    const src = host.getAttribute('data-eb-banner-src')
    if (src && self && src !== self) continue
    mount(host)
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initBanners())
  } else {
    initBanners()
  }
}
