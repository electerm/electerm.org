/**
 * Animated banner for the "Connection hopping (jump hosts)" blog post.
 *
 * Everything you see is generated here — no image, no GIF, no canvas: the
 * background, the headline, the mock electerm window (tab bar + hop list +
 * chain lane + path line + footer) and the travelling packets are plain
 * DOM + CSS driven by one requestAnimationFrame timeline.
 *
 * One loop tells the article's story in three phases:
 *
 *   1. DIAL — laptop SSHes to hop 1 (bastion). First pipe lights up.
 *   2. HOP  — bastion forwardOut()s to the target. Second pipe lights up,
 *      both hop rows highlighted: the chain is being built inside the
 *      previous connection.
 *   3. SHELL — the shell opens on the target only. Target row stays
 *      highlighted with a ready badge; SFTP + tunnels would ride here.
 *
 * Modelled on the real electerm UI / code:
 *   hop list ....... src/client/components/bookmark-form/common/connection-hopping.jsx
 *                    (connectionHoppings array, drag handle, table rows like
 *                     user:*****@host:port, renderPaths "👤 -> hops -> host")
 *   hop form ....... src/client/components/bookmark-form/common/connection-hopping-form.jsx
 *                    (host + port 22 + username + authType, choose-from-bookmarks)
 *   tab ............ src/client/components/bookmark-form/config/common-fields.js
 *                    (connectionHoppingTab) wired into config/ssh.js (+ vnc/rdp)
 *   engine ......... src/app/server/session-ssh.js
 *                    (adjustConnectionOrder since v1.50.65: first row dialed
 *                     first, bookmark host appended last; hopping() loop with
 *                     conn.forwardOut per hop, one ssh2 Client per hop,
 *                     conns torn down together in endConns/kill)
 *   desktop hops ... src/app/server/session-hop.js
 *                    (createHopProxy: dynamicForward SOCKS for VNC/RDP)
 *   UI theme ....... src/client/css/includes/theme.styl with the shipped dark
 *                    theme (src/client/common/theme-defaults.js, #121214)
 *   terminal theme . src/client/common/theme-defaults.js (bg #20111b)
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

const STYLE_ID = 'eb-hop-style'

// One full pass of the story (dial -> hop -> shell), in ms.
const PERIOD = 9000
const MODE_DUR = PERIOD / 3

const T = {
  fadeFrom: 8300,
  fadeTo: 8850
}

const HOPS = [
  {
    no: '1',
    tag: 'HOP 1',
    cli: 'jumper@bastion:22',
    caption: 'dial first'
  },
  {
    no: '2',
    tag: 'TARGET',
    cli: 'dbadmin@10.0.0.5:22',
    caption: 'shell lands here'
  }
]

const CLOSE_PATH = 'M563.8 512l262.5-312.9c4.4-5.2.7-13.1-6.1-13.1h-79.8c-4.7 0-9.2 2.1-12.3 5.7L511.6 449.8 295.1 191.7c-3-3.6-7.5-5.7-12.3-5.7H203c-6.8 0-10.5 7.9-6.1 13.1L459.4 512 196.9 824.9A7.95 7.95 0 0 0 203 838h79.8c4.7 0 9.2-2.1 12.3-5.7l216.5-258.1 216.5 258.1c3 3.6 7.5 5.7 12.3 5.7h79.8c6.8 0 10.5-7.9 6.1-13.1L563.8 512z'
const PLUS_PATH = 'M482 152h60q8 0 8 8v704q0 8-8 8h-60q-8 0-8-8V160q0-8 8-8z M176 474h672q8 0 8 8v60q0 8-8 8H176q-8 0-8-8v-60q0-8 8-8z'
const CARET_PATH = 'M884 256h-75c-5.1 0-9.9 2.5-12.9 6.6L512 654.2 227.9 262.6c-3-4.1-7.8-6.6-12.9-6.6h-75c-6.5 0-10.3 7.4-6.5 12.7l352.6 486.1c12.8 17.6 39 17.6 51.7 0l352.6-486.1c3.9-5.3.1-12.7-6.4-12.7z'

const icon = (path, cls, viewBox = '64 64 896 896') =>
  `<svg class="${cls}" viewBox="${viewBox}" aria-hidden="true"><path d="${path}"/></svg>`

const CSS = `
.eb-hop {
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
.eb-hop-deco { position: absolute; inset: 0; pointer-events: none; }
.eb-hop-dots {
  position: absolute;
  inset: -6em;
  background-image: radial-gradient(rgba(37, 99, 235, 0.2) 0.18em, transparent 0.18em);
  background-size: 4.2em 4.2em;
  animation: eb-hop-drift 34s linear infinite;
}
@keyframes eb-hop-drift { to { transform: translate3d(4.2em, 4.2em, 0); } }
.eb-hop-blob { position: absolute; border-radius: 50%; background: rgba(255, 255, 255, 0.62); }
.eb-hop-blob-a { width: 32em; height: 32em; right: -10em; top: -12em; }
.eb-hop-blob-b { width: 26em; height: 26em; left: -9em; bottom: -11em; }
.eb-hop-spark {
  position: absolute;
  width: 1.7em; height: 1.7em; background: #f59e0b;
  clip-path: polygon(50% 0, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0 50%, 39% 39%);
  animation: eb-hop-twinkle 3.6s ease-in-out infinite;
}
.eb-hop-spark-a { right: 7.5em; top: 4.6em; }
.eb-hop-spark-b { right: 14.5em; top: 12em; width: 1.05em; height: 1.05em; background: #14b8a6; animation-delay: 0.9s; }
@keyframes eb-hop-twinkle { 0%,100% { transform: scale(0.72) rotate(0deg); opacity: 0.5; } 50% { transform: scale(1.16) rotate(35deg); opacity: 1; } }
.eb-hop-head { position: absolute; left: 5em; right: 5em; top: 3.2em; }
.eb-hop-brand { display: inline-flex; align-items: center; gap: 0.45em; font-size: 1.4em; font-weight: 800; color: #2563eb; }
.eb-hop-brand::before { content: ''; width: 1.05em; height: 1.05em; border-radius: 50%; background: #2563eb; box-shadow: inset 0 0 0 0.32em #fff; }
.eb-hop-h1 { margin: 0.24em 0 0; font-size: 3.2em; font-weight: 800; line-height: 1.05; letter-spacing: -0.025em; color: #0f172a; }
.eb-hop-h1 em { font-style: normal; background: linear-gradient(96deg, #2563eb, #7c3aed 52%, #ec4899); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.eb-hop-sub { margin: 0.5em 0 0; max-width: 64em; font-size: 1.55em; line-height: 1.4; color: #475569; }
.eb-hop-sub b { color: #0f172a; }
.eb-hop-sub code { font-family: Menlo, Monaco, monospace; font-size: 0.85em; background: rgba(37,99,235,0.1); border-radius: 0.3em; padding: 0.05em 0.35em; color: #1d4ed8; }
.eb-hop-app {
  position: absolute; left: 50%; bottom: 5.4%; transform: translateX(-50%);
  width: 92em; background: var(--eb-term-bg); border-radius: 0.8em; overflow: hidden; text-align: left;
  box-shadow: 0 1.3em 2.6em rgba(15,23,42,0.32), 0 0 2.2em rgba(37,99,235,0.2);
  animation: eb-hop-glow 4.4s ease-in-out infinite;
}
@keyframes eb-hop-glow { 0%,100% { box-shadow: 0 1.3em 2.6em rgba(15,23,42,0.32), 0 0 2.2em rgba(37,99,235,0.18); } 50% { box-shadow: 0 1.3em 2.6em rgba(15,23,42,0.34), 0 0 3.4em rgba(124,58,237,0.4); } }
.eb-hop-tabbar { display: flex; align-items: stretch; height: 2.6em; padding: 0 0.5em; background: var(--eb-main-dark); font-size: 1.3em; line-height: 1; }
.eb-hop-tab { position: relative; display: flex; align-items: center; gap: 0.42em; height: 100%; padding: 0 1em; border-radius: 0.21em 0.21em 0 0; background: var(--eb-main); color: var(--eb-text); font-weight: 700; white-space: nowrap; }
.eb-hop-tab-status { position: absolute; left: 0.14em; top: 0.14em; width: 0.4em; height: 0.4em; border-radius: 50%; background: var(--eb-success); }
.eb-hop-tab-count { flex: none; height: 1.43em; padding: 0 0.3em; border-radius: 0.72em 0.14em 0.14em 0.72em; background: var(--eb-primary); color: #fff; line-height: 1.43em; }
.eb-hop-tab-close { display: inline-flex; align-items: center; justify-content: center; width: 1.15em; height: 1.15em; border-radius: 50%; background: var(--eb-main-dark); color: var(--eb-text); }
.eb-hop-tab-close svg { width: 0.6em; height: 0.6em; fill: currentColor; }
.eb-hop-tab-add, .eb-hop-tabbar-caret { display: inline-flex; align-items: center; align-self: center; height: 1.6em; color: var(--eb-text); }
.eb-hop-tab-add { width: 1.5em; margin-left: 0.3em; } .eb-hop-tab-add svg { width: 0.95em; height: 0.95em; fill: currentColor; }
.eb-hop-tabbar-caret { width: 1.4em; margin-left: auto; color: var(--eb-text-dark); } .eb-hop-tabbar-caret svg { width: 0.85em; height: 0.85em; fill: currentColor; }
.eb-hop-rows { display: flex; flex-direction: column; gap: 0.9em; padding: 1.2em 1.4em 0.6em; background: var(--eb-term-bg); }
.eb-hop-row {
  position: relative;
  display: flex; align-items: center; gap: 0.7em;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 0.7em;
  background: rgba(255,255,255,0.045);
  padding: 0.8em 1em;
  opacity: 0.42;
  transition: opacity 0.3s, border-color 0.3s, background 0.3s;
}
.eb-hop-row.is-active { opacity: 1; border-color: rgba(25,249,216,0.55); background: rgba(25,249,216,0.06); }
.eb-hop-row.is-done { opacity: 0.85; border-color: rgba(25,249,216,0.3); }
.eb-hop-no { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 1.7em; height: 1.7em; border-radius: 50%; background: rgba(255,255,255,0.12); color: var(--eb-term-fg); font-size: 1.2em; font-weight: 800; }
.eb-hop-row.is-active .eb-hop-no { background: var(--eb-term-green); color: #0f172a; }
.eb-hop-chip { flex: none; font-size: 1.25em; font-weight: 800; letter-spacing: 0.02em; color: #0f172a; background: #94a3b8; border-radius: 999px; padding: 0.18em 0.7em; }
.eb-hop-row.is-active .eb-hop-chip { background: var(--eb-term-green); }
.eb-hop-cli { font-family: Menlo, Monaco, monospace; font-size: 1.3em; color: var(--eb-term-fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.eb-hop-row.is-active .eb-hop-cli { color: #fff; }
.eb-hop-cap { margin-left: auto; font-size: 1.2em; color: #8a8a92; white-space: nowrap; }
.eb-hop-row.is-active .eb-hop-cap { color: var(--eb-term-blue); }
.eb-hop-ready { display: none; font-size: 1.2em; font-weight: 800; color: var(--eb-term-green); white-space: nowrap; }
.eb-hop-row.is-ready .eb-hop-ready { display: inline; }
.eb-hop-row.is-ready .eb-hop-cap { display: none; }
.eb-hop-lane { position: relative; display: flex; align-items: center; gap: 0.6em; padding: 0.7em 1.4em 0.2em; background: var(--eb-term-bg); }
.eb-hop-node { flex: none; font-size: 1.2em; font-weight: 700; color: var(--eb-term-fg); background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.14); border-radius: 0.45em; padding: 0.3em 0.6em; white-space: nowrap; }
.eb-hop-node.lit { color: #fff; border-color: rgba(25,249,216,0.55); }
.eb-hop-node.srv { color: var(--eb-term-green); border-color: rgba(25,249,216,0.4); }
.eb-hop-node.target { color: var(--eb-term-green); }
.eb-hop-node.target.lit { color: #0f172a; background: var(--eb-term-green); border-color: var(--eb-term-green); }
.eb-hop-pipe { position: relative; flex: 1; height: 0.32em; min-width: 4em; border-radius: 999px; background: rgba(255,255,255,0.14); overflow: visible; }
.eb-hop-pipe.ssh { background: repeating-linear-gradient(90deg, rgba(25,249,216,0.55) 0 0.9em, rgba(255,255,255,0.14) 0.9em 1.5em); }
.eb-hop-pipe.dim { opacity: 0.35; }
.eb-hop-dot { position: absolute; top: 50%; left: 0; width: 0.85em; height: 0.85em; margin: -0.425em 0 0 -0.425em; border-radius: 50%; background: var(--eb-term-green); box-shadow: 0 0 0.5em rgba(25,249,216,0.9); opacity: 0; }
.eb-hop-path { padding: 0.5em 1.4em 0.4em; background: var(--eb-term-bg); font-family: Menlo, Monaco, monospace; font-size: 1.25em; color: var(--eb-term-blue); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.eb-hop-foot { display: flex; align-items: center; height: 2.6em; padding: 0 0.8em; background: var(--eb-main); font-size: 1.3em; color: var(--eb-text-dark); }
.eb-hop-foot b { color: var(--eb-term-green); font-weight: 700; }
.eb-hop-foot .eb-hop-mode { margin-left: 0.5em; color: var(--eb-text); }
.eb-hop-foot-encode { margin-left: auto; }
.eb-hop[data-variant='card'] .eb-hop-app { bottom: auto; top: 50%; transform: translate(-50%,-50%); }
.eb-hop[data-variant='card'] .eb-hop-rows { gap: 0.7em; padding: 1em 1.2em 0.4em; }
.eb-hop[data-variant='card'] .eb-hop-cap { display: none; }
.eb-hop[data-variant='card'] .eb-hop-cli { font-size: 1.15em; }
.eb-hop[data-variant='card'] .eb-hop-path { padding-bottom: 0.8em; }
.eb-hop[data-variant='card'] .eb-hop-lane { padding-bottom: 0; }
@media (prefers-reduced-motion: reduce) { .eb-hop-dots, .eb-hop-spark, .eb-hop-app { animation: none !important; } }
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

function row (hop, index) {
  const dots = ''
  return `
    <div class="eb-hop-row" data-row="${index}">
      <span class="eb-hop-no">${hop.no}</span>
      <span class="eb-hop-chip">${hop.tag}</span>
      <span class="eb-hop-cli">${hop.cli}</span>
      <span class="eb-hop-cap">${hop.caption}</span>
      <span class="eb-hop-ready">● shell ready</span>
    </div>${dots}`
}

function markup (variant) {
  const head = variant === 'card'
    ? ''
    : `
      <div class="eb-hop-head">
        <span class="eb-hop-brand">electerm</span>
        <h2 class="eb-hop-h1">Jump hosts, <em>minus the dance</em></h2>
        <p class="eb-hop-sub"><b>hop 1 → target</b> in listed order · <b>forwardOut</b> chain · shell only at the end — <code>ssh -J</code> in GUI form.</p>
      </div>`
  const dots0 = [0, 1, 2].map((i) => `<span class="eb-hop-dot" data-dot="0-${i}"></span>`).join('')
  const dots1 = [0, 1, 2].map((i) => `<span class="eb-hop-dot" data-dot="1-${i}"></span>`).join('')
  return `
    <div class="eb-hop-deco">
      <span class="eb-hop-blob eb-hop-blob-a"></span>
      <span class="eb-hop-blob eb-hop-blob-b"></span>
      <span class="eb-hop-dots"></span>
      <span class="eb-hop-spark eb-hop-spark-a"></span>
      <span class="eb-hop-spark eb-hop-spark-b"></span>
    </div>
    ${head}
    <div class="eb-hop-app">
      <div class="eb-hop-tabbar">
        <span class="eb-hop-tab">
          <span class="eb-hop-tab-status"></span>
          <span class="eb-hop-tab-count">1</span>
          <span>dbadmin@10.0.0.5:22</span>
          <span class="eb-hop-tab-close">${icon(CLOSE_PATH, '')}</span>
        </span>
        <span class="eb-hop-tab-add">${icon(PLUS_PATH, '')}</span>
        <span class="eb-hop-tabbar-caret">${icon(CARET_PATH, '')}</span>
      </div>
      <div class="eb-hop-rows">
        ${HOPS.map(row).join('')}
      </div>
      <div class="eb-hop-lane">
        <span class="eb-hop-node" data-node="0">laptop</span>
        <span class="eb-hop-pipe ssh" data-pipe="0">${dots0}</span>
        <span class="eb-hop-node srv" data-node="1">bastion :22</span>
        <span class="eb-hop-pipe" data-pipe="1">${dots1}</span>
        <span class="eb-hop-node target" data-node="2">10.0.0.5 :22</span>
      </div>
      <div class="eb-hop-path">👤 -&gt; bastion -&gt; 10.0.0.5</div>
      <div class="eb-hop-foot">
        <span>◉ <b class="eb-hop-mode-label">① dial bastion</b><span class="eb-hop-mode"> — hops connect in listed order</span></span>
        <span class="eb-hop-foot-encode">UTF-8</span>
      </div>
    </div>`
}

function mount (host) {
  if (host.getAttribute('data-eb-mounted')) return
  host.setAttribute('data-eb-mounted', '1')

  const variant = host.getAttribute('data-eb-banner') === 'card' ? 'card' : 'hero'
  const root = document.createElement('div')
  root.className = 'eb-hop'
  root.setAttribute('data-variant', variant)
  root.setAttribute('role', 'img')
  root.setAttribute('aria-label', 'electerm connection hopping: laptop dials the bastion, tunnels through it with forwardOut, and opens the shell on the private target')
  root.innerHTML = markup(variant)
  host.appendChild(root)

  const el = {
    rows: root.querySelectorAll('.eb-hop-row'),
    dots: root.querySelectorAll('.eb-hop-dot'),
    pipes: root.querySelectorAll('.eb-hop-pipe'),
    nodes: root.querySelectorAll('.eb-hop-node'),
    modeLabel: root.querySelector('.eb-hop-mode-label')
  }

  const labels = ['① dial bastion', '② forwardOut to target', '③ shell on target']

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
    // rows: phase 0 -> hop row; phase 1 -> both (chain building); phase 2 -> target ready
    for (let i = 0; i < el.rows.length; i++) {
      const r = el.rows[i]
      r.classList.toggle('is-active', (active === 0 && i === 0) || (active === 1) || (active === 2 && i === 1))
      r.classList.toggle('is-done', active === 2 && i === 0)
      r.classList.toggle('is-ready', active === 2 && i === 1)
    }
    // pipes + nodes light up as the chain extends
    for (let i = 0; i < el.pipes.length; i++) {
      const on = (i === 0 && active >= 0) || (i === 1 && active >= 1)
      el.pipes[i].classList.toggle('ssh', on)
      el.pipes[i].classList.toggle('dim', !on)
    }
    for (let i = 0; i < el.nodes.length; i++) {
      el.nodes[i].classList.toggle('lit', (i === 0) || (i === 1 && active >= 0) || (i === 2 && active >= 2))
    }
    if (el.modeLabel) el.modeLabel.textContent = labels[active]

    // packets: three dots per pipe, staggered; pipe 1 only flows from phase 1.
    for (const d of el.dots) {
      const [pi, di] = d.getAttribute('data-dot').split('-').map(Number)
      const pipeOn = (pi === 0 && active >= 0) || (pi === 1 && active >= 1)
      if (!pipeOn) {
        d.style.opacity = 0
        continue
      }
      const local = (t - (pi === 0 ? 0 : MODE_DUR)) / (PERIOD - (pi === 0 ? 0 : MODE_DUR))
      const p = (((local % 1) + 1) % 1 + di / 3) % 1
      d.style.opacity = vis.toFixed(3)
      d.style.left = (p * 100).toFixed(2) + '%'
    }
  }

  const reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    frame(MODE_DUR * 2 + MODE_DUR * 0.5)
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
