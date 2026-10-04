/**
 * Animated banner for the "SSH tunnels over IPv6" blog post.
 *
 * Everything you see is generated here — no image, no GIF, no canvas: the
 * background, the headline, the mock electerm window and the travelling
 * packets are plain DOM + CSS driven by one requestAnimationFrame timeline.
 *
 * One loop has two beats:
 *
 *   1. "ok"  — all three tunnel modes carry a bare IPv6 literal. Row 1 (L→R)
 *              sends direct-tcpip with dstIP=::1, row 2 (R→L) binds
 *              tcpip-forward on ::1, row 3 (SOCKS) listens on ::1. Packets
 *              flow; the footer says the address is fine.
 *   2. "bad" — row 1's remote host becomes [::1] instead of ::1. The packet
 *              hits a barrier, the row turns red and the footer reports the
 *              ENOTFOUND bind failure. This is the post's trap #1.
 *
 * Modelled on the real electerm UI / code:
 *   tunnel form ...... src/client/components/bookmark-form/common/ssh-tunnel-form.jsx
 *                      (L→R / R→L radio + dynamicForward socks proxy,
 *                       separate local/remote host + port inputs)
 *   tunnel list ...... src/client/components/bookmark-form/common/ssh-tunnels.jsx
 *                      (sshTunnels array, default 127.0.0.1:12200 -> 127.0.0.1:12300)
 *   engine ........... src/app/server/ssh-tunnel.js
 *                      (forwardLocalToRemote: conn.forwardOut -> direct-tcpip,
 *                       forwardRemoteToLocal: conn.forwardIn -> tcpip-forward,
 *                       dynamicForward: socksv5-server + conn.forwardOut)
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

const STYLE_ID = 'eb-i6-style'

const PERIOD = 9000
const BEAT = PERIOD / 2

// ms for one packet to cross one pipe
const SPEED = 2600

const CLOSE_PATH = 'M563.8 512l262.5-312.9c4.4-5.2.7-13.1-6.1-13.1h-79.8c-4.7 0-9.2 2.1-12.3 5.7L511.6 449.8 295.1 191.7c-3-3.6-7.5-5.7-12.3-5.7H203c-6.8 0-10.5 7.9-6.1 13.1L459.4 512 196.9 824.9A7.95 7.95 0 0 0 203 838h79.8c4.7 0 9.2-2.1 12.3-5.7l216.5-258.1 216.5 258.1c3 3.6 7.5 5.7 12.3 5.7h79.8c6.8 0 10.5-7.9 6.1-13.1L563.8 512z'
const PLUS_PATH = 'M482 152h60q8 0 8 8v704q0 8-8 8h-60q-8 0-8-8V160q0-8 8-8z M176 474h672q8 0 8 8v60q0 8-8 8H176q-8 0-8-8v-60q0-8 8-8z'
const CARET_PATH = 'M884 256h-75c-5.1 0-9.9 2.5-12.9 6.6L512 654.2 227.9 262.6c-3-4.1-7.8-6.6-12.9-6.6h-75c-6.5 0-10.3 7.4-6.5 12.7l352.6 486.1c12.8 17.6 39 17.6 51.7 0l352.6-486.1c3.9-5.3.1-12.7-6.4-12.7z'

const icon = (path, cls) =>
  `<svg class="${cls}" viewBox="64 64 896 896" aria-hidden="true"><path d="${path}"/></svg>`

const MODES = [
  {
    tag: 'L→R',
    cli: 'remote host = ::1',
    cliBad: 'remote host = [::1]',
    caption: 'direct-tcpip dstIP=::1',
    captionBad: 'ENOTFOUND — [::1] does not resolve',
    left: 'laptop :5000',
    right: '::1 :6000',
    rightBad: '[::1] :6000',
    rev: false
  },
  {
    tag: 'R→L',
    cli: 'remote bind = ::1',
    caption: 'tcpip-forward bindAddr=::1',
    left: '::1 :6000',
    right: 'laptop :5000',
    rev: true
  },
  {
    tag: 'SOCKS',
    cli: 'local host = ::1',
    caption: 'listens on ::1 :1080',
    left: '::1 :1080',
    right: 'any host',
    rev: false
  }
]

const CSS = `
.eb-i6 {
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
  --eb-bad: #f87171;
  --eb-bad-solid: #ef4444;
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
.eb-i6-deco { position: absolute; inset: 0; pointer-events: none; }
.eb-i6-dots {
  position: absolute;
  inset: -6em;
  background-image: radial-gradient(rgba(37, 99, 235, 0.2) 0.18em, transparent 0.18em);
  background-size: 4.2em 4.2em;
  animation: eb-i6-drift 34s linear infinite;
}
@keyframes eb-i6-drift { to { transform: translate3d(4.2em, 4.2em, 0); } }
.eb-i6-blob { position: absolute; border-radius: 50%; background: rgba(255, 255, 255, 0.62); }
.eb-i6-blob-a { width: 32em; height: 32em; right: -10em; top: -12em; }
.eb-i6-blob-b { width: 26em; height: 26em; left: -9em; bottom: -11em; }
.eb-i6-spark {
  position: absolute;
  width: 1.7em; height: 1.7em; background: #f59e0b;
  clip-path: polygon(50% 0, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0 50%, 39% 39%);
  animation: eb-i6-twinkle 3.6s ease-in-out infinite;
}
.eb-i6-spark-a { right: 7.5em; top: 4.6em; }
.eb-i6-spark-b { right: 14.5em; top: 12em; width: 1.05em; height: 1.05em; background: #14b8a6; animation-delay: 0.9s; }
@keyframes eb-i6-twinkle { 0%,100% { transform: scale(0.72) rotate(0deg); opacity: 0.5; } 50% { transform: scale(1.16) rotate(35deg); opacity: 1; } }
.eb-i6-head { position: absolute; left: 5em; right: 5em; top: 3.2em; }
.eb-i6-brand { display: inline-flex; align-items: center; gap: 0.45em; font-size: 1.4em; font-weight: 800; color: #2563eb; }
.eb-i6-brand::before { content: ''; width: 1.05em; height: 1.05em; border-radius: 50%; background: #2563eb; box-shadow: inset 0 0 0 0.32em #fff; }
.eb-i6-h1 { margin: 0.24em 0 0; font-size: 3.2em; font-weight: 800; line-height: 1.05; letter-spacing: -0.025em; color: #0f172a; }
.eb-i6-h1 em { font-style: normal; background: linear-gradient(96deg, #2563eb, #7c3aed 52%, #ec4899); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.eb-i6-sub { margin: 0.5em 0 0; max-width: 66em; font-size: 1.55em; line-height: 1.4; color: #475569; }
.eb-i6-sub b { color: #0f172a; }
.eb-i6-sub code { font-family: Menlo, Monaco, monospace; font-size: 0.85em; background: rgba(37,99,235,0.1); border-radius: 0.3em; padding: 0.05em 0.35em; color: #1d4ed8; }
.eb-i6-sub code.bad { background: rgba(239,68,68,0.12); color: #b91c1c; }
.eb-i6-app {
  position: absolute; left: 50%; bottom: 5.4%; transform: translateX(-50%);
  width: 92em; background: var(--eb-term-bg); border-radius: 0.8em; overflow: hidden; text-align: left;
  box-shadow: 0 1.3em 2.6em rgba(15,23,42,0.32), 0 0 2.2em rgba(37,99,235,0.2);
}
.eb-i6-tabbar { display: flex; align-items: stretch; height: 2.6em; padding: 0 0.5em; background: var(--eb-main-dark); font-size: 1.3em; line-height: 1; }
.eb-i6-tab { position: relative; display: flex; align-items: center; gap: 0.42em; height: 100%; padding: 0 1em; border-radius: 0.21em 0.21em 0 0; background: var(--eb-main); color: var(--eb-text); font-weight: 700; white-space: nowrap; }
.eb-i6-tab-status { position: absolute; left: 0.14em; top: 0.14em; width: 0.4em; height: 0.4em; border-radius: 50%; background: var(--eb-success); }
.eb-i6-tab-count { flex: none; height: 1.43em; padding: 0 0.3em; border-radius: 0.72em 0.14em 0.14em 0.72em; background: var(--eb-primary); color: #fff; line-height: 1.43em; }
.eb-i6-tab-close { display: inline-flex; align-items: center; justify-content: center; width: 1.15em; height: 1.15em; border-radius: 50%; background: var(--eb-main-dark); color: var(--eb-text); }
.eb-i6-tab-close svg { width: 0.6em; height: 0.6em; fill: currentColor; }
.eb-i6-tab-add, .eb-i6-tabbar-caret { display: inline-flex; align-items: center; align-self: center; height: 1.6em; color: var(--eb-text); }
.eb-i6-tab-add { width: 1.5em; margin-left: 0.3em; } .eb-i6-tab-add svg { width: 0.95em; height: 0.95em; fill: currentColor; }
.eb-i6-tabbar-caret { width: 1.4em; margin-left: auto; color: var(--eb-text-dark); } .eb-i6-tabbar-caret svg { width: 0.85em; height: 0.85em; fill: currentColor; }
.eb-i6-rows { display: flex; flex-direction: column; gap: 0.9em; padding: 1.2em 1.4em 1.3em; background: var(--eb-term-bg); }
.eb-i6-row {
  position: relative;
  border: 1px solid rgba(25,249,216,0.4);
  border-radius: 0.7em;
  background: rgba(25,249,216,0.06);
  padding: 0.8em 1em 0.85em;
  transition: border-color 0.3s, background 0.3s;
}
.eb-i6-row.is-bad { border-color: rgba(239,68,68,0.6); background: rgba(239,68,68,0.08); }
.eb-i6-row-top { display: flex; align-items: center; gap: 0.7em; margin-bottom: 0.6em; }
.eb-i6-chip { flex: none; font-size: 1.25em; font-weight: 800; letter-spacing: 0.02em; color: #0f172a; background: var(--eb-term-green); border-radius: 999px; padding: 0.18em 0.7em; }
.eb-i6-row.is-bad .eb-i6-chip { background: var(--eb-bad); }
.eb-i6-cli { font-family: Menlo, Monaco, monospace; font-size: 1.3em; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.eb-i6-cli-bad { display: none; color: var(--eb-bad); }
.eb-i6-row.is-bad .eb-i6-cli-ok { display: none; }
.eb-i6-row.is-bad .eb-i6-cli-bad { display: inline; }
.eb-i6-cap { margin-left: auto; font-size: 1.2em; color: var(--eb-term-blue); white-space: nowrap; }
.eb-i6-cap-bad { display: none; color: var(--eb-bad); }
.eb-i6-row.is-bad .eb-i6-cap { color: var(--eb-bad); }
.eb-i6-row.is-bad .eb-i6-cap-ok { display: none; }
.eb-i6-row.is-bad .eb-i6-cap-bad { display: inline; }
.eb-i6-lane { position: relative; display: flex; align-items: center; gap: 0.6em; }
.eb-i6-node { flex: none; font-size: 1.2em; font-weight: 700; color: #fff; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.14); border-radius: 0.45em; padding: 0.3em 0.6em; white-space: nowrap; }
.eb-i6-node.srv { color: var(--eb-term-green); border-color: rgba(25,249,216,0.4); }
.eb-i6-node.is-alt { display: none; }
.eb-i6-row.is-bad .eb-i6-node.is-main { display: none; }
.eb-i6-row.is-bad .eb-i6-node.is-alt { display: inline-block; color: var(--eb-bad); border-color: rgba(239,68,68,0.5); }
.eb-i6-pipe { position: relative; flex: 1; height: 0.32em; min-width: 4em; border-radius: 999px; background: repeating-linear-gradient(90deg, rgba(25,249,216,0.55) 0 0.9em, rgba(255,255,255,0.14) 0.9em 1.5em); overflow: visible; }
.eb-i6-row.is-bad .eb-i6-pipe { background: repeating-linear-gradient(90deg, rgba(239,68,68,0.5) 0 0.9em, rgba(255,255,255,0.12) 0.9em 1.5em); }
.eb-i6-dot { position: absolute; top: 50%; left: 0; width: 0.85em; height: 0.85em; margin: -0.425em 0 0 -0.425em; border-radius: 50%; background: var(--eb-term-green); box-shadow: 0 0 0.5em rgba(25,249,216,0.9); }
.eb-i6-dot.rev { background: var(--eb-term-blue); box-shadow: 0 0 0.5em rgba(111,193,255,0.9); }
.eb-i6-barrier {
  position: absolute; left: 7%; top: 50%;
  width: 0.42em; height: 2.3em; margin: -1.15em 0 0 -0.21em;
  border-radius: 0.21em; background: var(--eb-bad-solid);
  box-shadow: 0 0 0.7em rgba(239,68,68,0.85);
  opacity: 0; transition: opacity 0.3s;
}
.eb-i6-row.is-bad .eb-i6-barrier { opacity: 1; }
.eb-i6-foot { display: flex; align-items: center; gap: 0.55em; height: 2.6em; padding: 0 0.8em; background: var(--eb-main); font-size: 1.3em; color: var(--eb-text-dark); }
.eb-i6-led { flex: none; width: 0.7em; height: 0.7em; border-radius: 50%; background: var(--eb-term-green); box-shadow: 0 0 0.5em rgba(25,249,216,0.8); transition: background 0.3s; }
.eb-i6-foot.is-bad .eb-i6-led { background: var(--eb-bad-solid); box-shadow: 0 0 0.5em rgba(239,68,68,0.8); }
.eb-i6-msg { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.eb-i6-msg b { color: var(--eb-term-green); font-weight: 700; }
.eb-i6-msg-bad { display: none; color: var(--eb-bad); }
.eb-i6-msg-bad b { color: var(--eb-bad); }
.eb-i6-foot.is-bad .eb-i6-msg-ok { display: none; }
.eb-i6-foot.is-bad .eb-i6-msg-bad { display: inline; }
.eb-i6-encode { margin-left: auto; flex: none; }
.eb-i6[data-variant='card'] .eb-i6-app { bottom: auto; top: 50%; transform: translate(-50%,-50%); }
.eb-i6[data-variant='card'] .eb-i6-rows { gap: 0.7em; padding: 1em 1.2em; }
.eb-i6[data-variant='card'] .eb-i6-cap { display: none; }
.eb-i6[data-variant='card'] .eb-i6-cli { font-size: 1.15em; }
@media (prefers-reduced-motion: reduce) { .eb-i6-dots, .eb-i6-spark { animation: none !important; } }
`

function injectStyle () {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = CSS
  document.head.appendChild(style)
}

function row (mode, index) {
  const dots = [0, 1, 2].map((i) =>
    `<span class="eb-i6-dot${mode.rev ? ' rev' : ''}" data-dot="${index}-${i}"></span>`
  ).join('')
  const alt = mode.rightBad
    ? `<span class="eb-i6-node is-alt">${mode.rightBad}</span>`
    : ''
  const cliBad = mode.cliBad
    ? `<span class="eb-i6-cli-bad">${mode.cliBad}</span>`
    : ''
  // the barrier sits just past the ssh server: that is where the address fails
  // to resolve, so the connection never reaches the far end
  const barrier = mode.rightBad ? '<span class="eb-i6-barrier"></span>' : ''
  const capBad = mode.captionBad
    ? `<span class="eb-i6-cap-bad">${mode.captionBad}</span>`
    : ''
  return `
    <div class="eb-i6-row" data-row="${index}">
      <div class="eb-i6-row-top">
        <span class="eb-i6-chip">${mode.tag}</span>
        <span class="eb-i6-cli"><span class="eb-i6-cli-ok">${mode.cli}</span>${cliBad}</span>
        <span class="eb-i6-cap"><span class="eb-i6-cap-ok">${mode.caption}</span>${capBad}</span>
      </div>
      <div class="eb-i6-lane">
        <span class="eb-i6-node">${mode.left}</span>
        <span class="eb-i6-pipe">${dots}</span>
        <span class="eb-i6-node srv">ssh server</span>
        <span class="eb-i6-pipe">${dots}${barrier}</span>
        <span class="eb-i6-node is-main">${mode.right}</span>${alt}
      </div>
    </div>`
}

function markup (variant) {
  const head = variant === 'card'
    ? ''
    : `
      <div class="eb-i6-head">
        <span class="eb-i6-brand">electerm</span>
        <h2 class="eb-i6-h1">SSH tunnels over <em>IPv6</em></h2>
        <p class="eb-i6-sub">L→R, R→L and SOCKS all take a bare <b>::1</b> — the only thing that fails is <code class="bad">[::1]</code>.</p>
      </div>`
  return `
    <div class="eb-i6-deco">
      <span class="eb-i6-blob eb-i6-blob-a"></span>
      <span class="eb-i6-blob eb-i6-blob-b"></span>
      <span class="eb-i6-dots"></span>
      <span class="eb-i6-spark eb-i6-spark-a"></span>
      <span class="eb-i6-spark eb-i6-spark-b"></span>
    </div>
    ${head}
    <div class="eb-i6-app">
      <div class="eb-i6-tabbar">
        <span class="eb-i6-tab">
          <span class="eb-i6-tab-status"></span>
          <span class="eb-i6-tab-count">1</span>
          <span>zxd@bastion:22</span>
          <span class="eb-i6-tab-close">${icon(CLOSE_PATH, '')}</span>
        </span>
        <span class="eb-i6-tab-add">${icon(PLUS_PATH, '')}</span>
        <span class="eb-i6-tabbar-caret">${icon(CARET_PATH, '')}</span>
      </div>
      <div class="eb-i6-rows">
        ${MODES.map(row).join('')}
      </div>
      <div class="eb-i6-foot">
        <span class="eb-i6-led"></span>
        <span class="eb-i6-msg eb-i6-msg-ok">IPv6 ready — a bare <b>::1</b> works in every mode</span>
        <span class="eb-i6-msg eb-i6-msg-bad"><b>[::1]</b> is rejected — the brackets reach the server verbatim</span>
        <span class="eb-i6-encode">UTF-8</span>
      </div>
    </div>`
}

function mount (host) {
  if (host.getAttribute('data-eb-mounted')) return
  host.setAttribute('data-eb-mounted', '1')

  const variant = host.getAttribute('data-eb-banner') === 'card' ? 'card' : 'hero'
  const root = document.createElement('div')
  root.className = 'eb-i6'
  root.setAttribute('data-variant', variant)
  root.setAttribute('data-beat', 'ok')
  root.setAttribute('role', 'img')
  root.setAttribute('aria-label', 'electerm SSH tunnels over IPv6: local to remote, remote to local and dynamic SOCKS all accept a bare IPv6 literal, while a bracketed address fails to bind')
  root.innerHTML = markup(variant)
  host.appendChild(root)

  const el = {
    rows: root.querySelectorAll('.eb-i6-row'),
    dots: root.querySelectorAll('.eb-i6-dot'),
    foot: root.querySelector('.eb-i6-foot')
  }
  // only row 0 (L→R) has a bad state; it owns the barrier
  const badRow = 0

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
    const bad = (t % PERIOD) >= BEAT
    if (el.rows[badRow].classList.contains('is-bad') !== bad) {
      el.rows[badRow].classList.toggle('is-bad', bad)
      el.foot.classList.toggle('is-bad', bad)
      root.setAttribute('data-beat', bad ? 'bad' : 'ok')
    }

    for (const d of el.dots) {
      const [ri, di] = d.getAttribute('data-dot').split('-').map(Number)
      if (bad && ri === badRow) {
        d.style.opacity = 0
        continue
      }
      let p = ((t / SPEED) + di / 3) % 1
      if (MODES[ri].rev) p = 1 - p // R→L flows backwards
      d.style.opacity = 1
      d.style.left = (p * 100).toFixed(2) + '%'
    }
  }

  const reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    // settle on the beat that shows the point: all three modes working
    frame(SPEED * 0.5)
    return
  }

  // Pause the loop while the banner is scrolled out of view.
  const state = { raf: null }
  const start = performance.now()
  const tick = (now) => {
    frame(now - start)
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
