/**
 * Animated banner for the "SSH tunnels" blog post.
 *
 * Everything you see is generated here — no image, no GIF, no canvas: the
 * background, the headline, the mock electerm window (tab bar + three tunnel
 * rows + footer) and the travelling packets are plain DOM + CSS driven by one
 * requestAnimationFrame timeline.
 *
 * One loop cycles through the three tunnel types in the order the article
 * introduces them:
 *
 *   1. L→R (forwardLocalToRemote, ssh -L) — packets run
 *      laptop:5000 -> ssh server -> remote:6000.
 *   2. R→L (forwardRemoteToLocal, ssh -R) — packets run the other way,
 *      server:6000 -> ssh server -> laptop:5000.
 *   3. Dynamic (dynamicForward, ssh -D) — the laptop end becomes a SOCKS5
 *      proxy and packets fan out to several destinations through the server.
 *
 * Modelled on the real electerm UI / code:
 *   tunnel form ...... src/client/components/bookmark-form/common/ssh-tunnel-form.jsx
 *                      (L→R / R→L radio + dynamicForward socks proxy,
 *                       local/remote host+port, name, add/save button)
 *   tunnel list ...... src/client/components/bookmark-form/common/ssh-tunnels.jsx
 *                      (sshTunnels array, default 127.0.0.1:12200 -> 127.0.0.1:12300)
 *   engine ........... src/app/server/ssh-tunnel.js
 *                      (forwardLocalToRemote: net.createServer + conn.forwardOut,
 *                       forwardRemoteToLocal: conn.forwardIn + net.connect,
 *                       dynamicForward: socksv5-server + conn.forwardOut,
 *                       all torn down on conn close)
 *   UI theme ......... src/client/css/includes/theme.styl with the shipped dark
 *                      theme (src/client/common/theme-defaults.js, #121214)
 *   terminal theme ... src/client/common/theme-defaults.js (bg #20111b)
 *
 * Mount points: any element carrying [data-eb-banner]:
 *   data-eb-banner="hero"  -> headline + full window (blog post page)
 *   data-eb-banner="card"  -> window only         (blog index thumbnail)
 * Every banner script on the blog index is loaded for every card, so a mount
 * also has to match data-eb-banner-src — otherwise the first script to run
 * would claim every card.
 *
 * Layout is in `em`, root font-size is 1% of banner width.
 */

const STYLE_ID = 'eb-tn-style'

// One full pass of the story (three modes), in ms.
const PERIOD = 9000
const MODE_DUR = PERIOD / 3

const T = {
  fadeFrom: 8300,
  fadeTo: 8850
}

const MODES = [
  {
    id: 'l2r',
    tag: 'L→R',
    cli: 'ssh -L 5000:localhost:6000',
    caption: 'local :5000 reaches remote :6000'
  },
  {
    id: 'r2l',
    tag: 'R→L',
    cli: 'ssh -R 6000:localhost:5000',
    caption: 'remote :6000 reaches back to local :5000'
  },
  {
    id: 'dyn',
    tag: 'SOCKS',
    cli: 'ssh -D 1080',
    caption: 'socks5://:1080 exits from the server'
  }
]

const CLOSE_PATH = 'M563.8 512l262.5-312.9c4.4-5.2.7-13.1-6.1-13.1h-79.8c-4.7 0-9.2 2.1-12.3 5.7L511.6 449.8 295.1 191.7c-3-3.6-7.5-5.7-12.3-5.7H203c-6.8 0-10.5 7.9-6.1 13.1L459.4 512 196.9 824.9A7.95 7.95 0 0 0 203 838h79.8c4.7 0 9.2-2.1 12.3-5.7l216.5-258.1 216.5 258.1c3 3.6 7.5 5.7 12.3 5.7h79.8c6.8 0 10.5-7.9 6.1-13.1L563.8 512z'
const PLUS_PATH = 'M482 152h60q8 0 8 8v704q0 8-8 8h-60q-8 0-8-8V160q0-8 8-8z M176 474h672q8 0 8 8v60q0 8-8 8H176q-8 0-8-8v-60q0-8 8-8z'
const CARET_PATH = 'M884 256h-75c-5.1 0-9.9 2.5-12.9 6.6L512 654.2 227.9 262.6c-3-4.1-7.8-6.6-12.9-6.6h-75c-6.5 0-10.3 7.4-6.5 12.7l352.6 486.1c12.8 17.6 39 17.6 51.7 0l352.6-486.1c3.9-5.3.1-12.7-6.4-12.7z'

const icon = (path, cls, viewBox = '64 64 896 896') =>
  `<svg class="${cls}" viewBox="${viewBox}" aria-hidden="true"><path d="${path}"/></svg>`

const CSS = `
.eb-tn {
  --eb-main-dark: #000;
  --eb-main: #121214;
  --eb-text: #ddd;
  --eb-text-light: #fff;
  --eb-text-dark: #888;
  --eb-primary: #08c;
  --eb-success: #06d6a0;
  --eb-warn: #e55934;
  --eb-term-bg: #20111b;
  --eb-term-fg: #bbbbbb;
  --eb-term-green: #19f9d8;
  --eb-term-blue: #6fc1ff;
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: var(--radius-lg, 12px);
  border: 1px solid var(--color-border, #d9e2f0);
  background: linear-gradient(135deg, #e8f1ff 0%, #eef2ff 50%, #fdf0f6 100%);
  color: #16233a;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.3;
  isolation: isolate;
  -webkit-font-smoothing: antialiased;
}
.eb-tn-deco { position: absolute; inset: 0; pointer-events: none; }
.eb-tn-dots {
  position: absolute;
  inset: -6em;
  background-image: radial-gradient(rgba(37, 99, 235, 0.2) 0.18em, transparent 0.18em);
  background-size: 4.2em 4.2em;
  animation: eb-tn-drift 34s linear infinite;
}
@keyframes eb-tn-drift { to { transform: translate3d(4.2em, 4.2em, 0); } }
.eb-tn-blob { position: absolute; border-radius: 50%; background: rgba(255, 255, 255, 0.62); }
.eb-tn-blob-a { width: 32em; height: 32em; right: -10em; top: -12em; }
.eb-tn-blob-b { width: 26em; height: 26em; left: -9em; bottom: -11em; }
.eb-tn-spark {
  position: absolute;
  width: 1.7em; height: 1.7em; background: #f59e0b;
  clip-path: polygon(50% 0, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0 50%, 39% 39%);
  animation: eb-tn-twinkle 3.6s ease-in-out infinite;
}
.eb-tn-spark-a { right: 7.5em; top: 4.6em; }
.eb-tn-spark-b { right: 14.5em; top: 12em; width: 1.05em; height: 1.05em; background: #14b8a6; animation-delay: 0.9s; }
@keyframes eb-tn-twinkle { 0%,100% { transform: scale(0.72) rotate(0deg); opacity: 0.5; } 50% { transform: scale(1.16) rotate(35deg); opacity: 1; } }
.eb-tn-head { position: absolute; left: 5em; right: 5em; top: 3.2em; }
.eb-tn-brand { display: inline-flex; align-items: center; gap: 0.45em; font-size: 1.4em; font-weight: 800; color: #2563eb; }
.eb-tn-brand::before { content: ''; width: 1.05em; height: 1.05em; border-radius: 50%; background: #2563eb; box-shadow: inset 0 0 0 0.32em #fff; }
.eb-tn-h1 { margin: 0.24em 0 0; font-size: 3.2em; font-weight: 800; line-height: 1.05; letter-spacing: -0.025em; color: #0f172a; }
.eb-tn-h1 em { font-style: normal; background: linear-gradient(96deg, #2563eb, #7c3aed 52%, #ec4899); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.eb-tn-sub { margin: 0.5em 0 0; max-width: 64em; font-size: 1.55em; line-height: 1.4; color: #475569; }
.eb-tn-sub b { color: #0f172a; }
.eb-tn-sub code { font-family: Menlo, Monaco, monospace; font-size: 0.85em; background: rgba(37,99,235,0.1); border-radius: 0.3em; padding: 0.05em 0.35em; color: #1d4ed8; }
.eb-tn-app {
  position: absolute; left: 50%; bottom: 5.4%; transform: translateX(-50%);
  width: 92em; background: var(--eb-term-bg); border-radius: 0.8em; overflow: hidden; text-align: left;
  box-shadow: 0 1.3em 2.6em rgba(15,23,42,0.32), 0 0 2.2em rgba(37,99,235,0.2);
  animation: eb-tn-glow 4.4s ease-in-out infinite;
}
@keyframes eb-tn-glow { 0%,100% { box-shadow: 0 1.3em 2.6em rgba(15,23,42,0.32), 0 0 2.2em rgba(37,99,235,0.18); } 50% { box-shadow: 0 1.3em 2.6em rgba(15,23,42,0.34), 0 0 3.4em rgba(124,58,237,0.4); } }
.eb-tn-tabbar { display: flex; align-items: stretch; height: 2.6em; padding: 0 0.5em; background: var(--eb-main-dark); font-size: 1.3em; line-height: 1; }
.eb-tn-tab { position: relative; display: flex; align-items: center; gap: 0.42em; height: 100%; padding: 0 1em; border-radius: 0.21em 0.21em 0 0; background: var(--eb-main); color: var(--eb-text); font-weight: 700; white-space: nowrap; }
.eb-tn-tab-status { position: absolute; left: 0.14em; top: 0.14em; width: 0.4em; height: 0.4em; border-radius: 50%; background: var(--eb-success); }
.eb-tn-tab-count { flex: none; height: 1.43em; padding: 0 0.3em; border-radius: 0.72em 0.14em 0.14em 0.72em; background: var(--eb-primary); color: #fff; line-height: 1.43em; }
.eb-tn-tab-close { display: inline-flex; align-items: center; justify-content: center; width: 1.15em; height: 1.15em; border-radius: 50%; background: var(--eb-main-dark); color: var(--eb-text); }
.eb-tn-tab-close svg { width: 0.6em; height: 0.6em; fill: currentColor; }
.eb-tn-tab-add, .eb-tn-tabbar-caret { display: inline-flex; align-items: center; align-self: center; height: 1.6em; color: var(--eb-text); }
.eb-tn-tab-add { width: 1.5em; margin-left: 0.3em; } .eb-tn-tab-add svg { width: 0.95em; height: 0.95em; fill: currentColor; }
.eb-tn-tabbar-caret { width: 1.4em; margin-left: auto; color: var(--eb-text-dark); } .eb-tn-tabbar-caret svg { width: 0.85em; height: 0.85em; fill: currentColor; }
.eb-tn-rows { display: flex; flex-direction: column; gap: 0.9em; padding: 1.2em 1.4em 1.3em; background: var(--eb-term-bg); }
.eb-tn-row {
  position: relative;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 0.7em;
  background: rgba(255,255,255,0.045);
  padding: 0.8em 1em 0.85em;
  opacity: 0.42;
  transition: opacity 0.3s, border-color 0.3s, background 0.3s;
}
.eb-tn-row.is-active { opacity: 1; border-color: rgba(25,249,216,0.55); background: rgba(25,249,216,0.06); }
.eb-tn-row-top { display: flex; align-items: center; gap: 0.7em; margin-bottom: 0.6em; }
.eb-tn-chip { flex: none; font-size: 1.25em; font-weight: 800; letter-spacing: 0.02em; color: #0f172a; background: #94a3b8; border-radius: 999px; padding: 0.18em 0.7em; }
.eb-tn-row.is-active .eb-tn-chip { background: var(--eb-term-green); }
.eb-tn-cli { font-family: Menlo, Monaco, monospace; font-size: 1.3em; color: var(--eb-term-fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.eb-tn-row.is-active .eb-tn-cli { color: #fff; }
.eb-tn-cap { margin-left: auto; font-size: 1.2em; color: #8a8a92; white-space: nowrap; }
.eb-tn-row.is-active .eb-tn-cap { color: var(--eb-term-blue); }
.eb-tn-lane { position: relative; display: flex; align-items: center; gap: 0.6em; }
.eb-tn-node { flex: none; font-size: 1.2em; font-weight: 700; color: var(--eb-term-fg); background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.14); border-radius: 0.45em; padding: 0.3em 0.6em; white-space: nowrap; }
.eb-tn-node.srv { color: var(--eb-term-green); border-color: rgba(25,249,216,0.4); }
.eb-tn-row.is-active .eb-tn-node { color: #fff; }
.eb-tn-row.is-active .eb-tn-node.srv { color: var(--eb-term-green); }
.eb-tn-pipe { position: relative; flex: 1; height: 0.32em; min-width: 4em; border-radius: 999px; background: rgba(255,255,255,0.14); overflow: visible; }
.eb-tn-pipe.ssh { background: repeating-linear-gradient(90deg, rgba(25,249,216,0.55) 0 0.9em, rgba(255,255,255,0.14) 0.9em 1.5em); }
.eb-tn-dot { position: absolute; top: 50%; left: 0; width: 0.85em; height: 0.85em; margin: -0.425em 0 0 -0.425em; border-radius: 50%; background: var(--eb-term-green); box-shadow: 0 0 0.5em rgba(25,249,216,0.9); opacity: 0; }
.eb-tn-row.is-active .eb-tn-dot { opacity: 1; }
.eb-tn-dot.rev { background: var(--eb-term-blue); box-shadow: 0 0 0.5em rgba(111,193,255,0.9); }
.eb-tn-dot.socks { background: #f59e0b; box-shadow: 0 0 0.5em rgba(245,158,11,0.9); }
.eb-tn-foot { display: flex; align-items: center; height: 2.6em; padding: 0 0.8em; background: var(--eb-main); font-size: 1.3em; color: var(--eb-text-dark); }
.eb-tn-foot b { color: var(--eb-term-green); font-weight: 700; }
.eb-tn-foot .eb-tn-mode { margin-left: 0.5em; color: var(--eb-text); }
.eb-tn-foot-encode { margin-left: auto; }
.eb-tn[data-variant='card'] .eb-tn-app { bottom: auto; top: 50%; transform: translate(-50%,-50%); }
.eb-tn[data-variant='card'] .eb-tn-rows { gap: 0.7em; padding: 1em 1.2em; }
.eb-tn[data-variant='card'] .eb-tn-cap { display: none; }
.eb-tn[data-variant='card'] .eb-tn-cli { font-size: 1.15em; }
@media (prefers-reduced-motion: reduce) { .eb-tn-dots, .eb-tn-spark, .eb-tn-app { animation: none !important; } }
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

function seg (t, from, to) {
  return clamp((t - from) / (to - from), 0, 1)
}

function easeInOut (p) {
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2
}

function row (mode, index) {
  const left = index === 1 ? 'server :6000' : index === 2 ? 'browser' : 'laptop :5000'
  const right = index === 1 ? 'laptop :5000' : index === 2 ? 'any host' : 'remote :6000'
  const dots = [0, 1, 2].map((i) => {
    const cls = index === 1 ? 'eb-tn-dot rev' : index === 2 ? 'eb-tn-dot socks' : 'eb-tn-dot'
    return `<span class="${cls}" data-dot="${index}-${i}"></span>`
  }).join('')
  return `
    <div class="eb-tn-row" data-row="${index}">
      <div class="eb-tn-row-top">
        <span class="eb-tn-chip">${mode.tag}</span>
        <span class="eb-tn-cli">${mode.cli}</span>
        <span class="eb-tn-cap">${mode.caption}</span>
      </div>
      <div class="eb-tn-lane">
        <span class="eb-tn-node">${left}</span>
        <span class="eb-tn-pipe ssh">${dots}</span>
        <span class="eb-tn-node srv">ssh server</span>
        <span class="eb-tn-pipe">${dots}</span>
        <span class="eb-tn-node">${right}</span>
      </div>
    </div>`
}

function markup (variant) {
  const head = variant === 'card'
    ? ''
    : `
      <div class="eb-tn-head">
        <span class="eb-tn-brand">electerm</span>
        <h2 class="eb-tn-h1">SSH tunnels, <em>minus the flags</em></h2>
        <p class="eb-tn-sub"><b>L→R</b> reaches in · <b>R→L</b> reaches back · <b>SOCKS</b> exits anywhere — one loop, three modes, <code>ssh -L / -R / -D</code> in GUI form.</p>
      </div>`
  return `
    <div class="eb-tn-deco">
      <span class="eb-tn-blob eb-tn-blob-a"></span>
      <span class="eb-tn-blob eb-tn-blob-b"></span>
      <span class="eb-tn-dots"></span>
      <span class="eb-tn-spark eb-tn-spark-a"></span>
      <span class="eb-tn-spark eb-tn-spark-b"></span>
    </div>
    ${head}
    <div class="eb-tn-app">
      <div class="eb-tn-tabbar">
        <span class="eb-tn-tab">
          <span class="eb-tn-tab-status"></span>
          <span class="eb-tn-tab-count">1</span>
          <span>zxd@bastion:22</span>
          <span class="eb-tn-tab-close">${icon(CLOSE_PATH, '')}</span>
        </span>
        <span class="eb-tn-tab-add">${icon(PLUS_PATH, '')}</span>
        <span class="eb-tn-tabbar-caret">${icon(CARET_PATH, '')}</span>
      </div>
      <div class="eb-tn-rows">
        ${MODES.map(row).join('')}
      </div>
      <div class="eb-tn-foot">
        <span>◉ <b class="eb-tn-mode-label">L→R · ssh -L</b><span class="eb-tn-mode"> — tunnels ride the session, auto-connect</span></span>
        <span class="eb-tn-foot-encode">UTF-8</span>
      </div>
    </div>`
}

function mount (host) {
  if (host.getAttribute('data-eb-mounted')) return
  host.setAttribute('data-eb-mounted', '1')

  const variant = host.getAttribute('data-eb-banner') === 'card' ? 'card' : 'hero'
  const root = document.createElement('div')
  root.className = 'eb-tn'
  root.setAttribute('data-variant', variant)
  root.setAttribute('role', 'img')
  root.setAttribute('aria-label', 'electerm SSH tunnels: local L to R forwarding, remote R to L forwarding, and dynamic SOCKS proxy, all inside one SSH session')
  root.innerHTML = markup(variant)
  host.appendChild(root)

  const el = {
    rows: root.querySelectorAll('.eb-tn-row'),
    dots: root.querySelectorAll('.eb-tn-dot'),
    modeLabel: root.querySelector('.eb-tn-mode-label')
  }

  const labels = ['L→R · ssh -L', 'R→L · ssh -R', 'SOCKS · ssh -D']

  // 1em === 1% of the banner width, so the whole design scales with it.
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

  function frame (t) {
    const gone = easeInOut(seg(t, T.fadeFrom, T.fadeTo))
    const vis = 1 - gone
    root.style.opacity = vis.toFixed(3)

    const active = Math.min(2, Math.floor(t / MODE_DUR))
    for (let i = 0; i < el.rows.length; i++) {
      el.rows[i].classList.toggle('is-active', i === active)
    }
    if (el.modeLabel) el.modeLabel.textContent = labels[active]

    // packets: three dots per pipe, staggered; direction flips for R→L.
    for (const d of el.dots) {
      const [ri, di] = d.getAttribute('data-dot').split('-').map(Number)
      if (ri !== active) {
        d.style.opacity = 0
        continue
      }
      const local = (t - active * MODE_DUR) / MODE_DUR
      let p = (local + di / 3) % 1
      if (ri === 1) p = 1 - p // R→L flows backwards
      d.style.opacity = vis.toFixed(3)
      d.style.left = (p * 100).toFixed(2) + '%'
    }
  }

  const reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    frame(MODE_DUR * 0.5)
    return
  }

  // Pause the loop while the banner is scrolled out of view.
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
