/**
 * Animated banner for the "terminal triggers" blog post.
 *
 * Everything you see is generated here — no image, no GIF, no canvas: the
 * background, the electerm window (tab bar + one terminal pane + footer with
 * the triggers badge), the typed command, the pager prompt, the trigger rule
 * card and the auto-sent answer are all plain DOM + CSS driven by one
 * requestAnimationFrame timeline.
 *
 * One act, in the order the article introduces the feature:
 *
 *   1. `show run` is typed into the terminal.
 *   2. The switch pages and stops at `--More--`.
 *   3. The trigger rule card lights up (match found) and a space is
 *      auto-sent — the whole point of the feature: the terminal answers
 *      itself, no keypress from you.
 *   4. The next page scrolls in and the session returns to a prompt.
 *
 * The window is modelled on the real electerm UI, and the colours and metrics
 * below are taken from the app itself:
 *   tab bar / tabs ..... src/client/components/tabs/tabs.styl
 *   session control bar  src/client/components/terminal/terminal.styl
 *                        (.terminal-control: --main, line-height 32px,
 *                         padding 0 10px)
 *   UI theme ........... src/client/css/includes/theme.styl, with the shipped
 *                        dark theme (src/client/common/theme-defaults.js,
 *                        defaultThemeDark) injected over it at runtime
 *   terminal theme ..... src/client/common/theme-defaults.js (defaultThemeDarkTerminal)
 *   cursor ............. src/client/common/default-setting.js
 *                        (cursorStyle: 'block', cursorBlink: false)
 *   footer badge ....... src/client/components/footer/footer-entry.jsx
 *                        (antd Badge on the FunctionOutlined triggers icon,
 *                         count = effective triggers for the tab)
 *   rule shape ......... src/client/store/trigger.js (normalizeTrigger) +
 *                        src/client/components/terminal/automation/trigger-engine.js
 *
 * Mount points: any element carrying [data-eb-banner]:
 *   data-eb-banner="hero"  -> headline + full window (blog post page)
 *   data-eb-banner="card"  -> window only         (blog index thumbnail)
 * Every banner script on the blog index is loaded for every card, so a mount
 * also has to match data-eb-banner-src (the module the template loaded for
 * that post) — otherwise the first script to run would claim every card.
 *
 * The whole layout is expressed in `em`, and the root font-size is kept at
 * 1% of the banner width, so a single design scales to any container.
 */

const STYLE_ID = 'eb-tr-style'

// One full pass of the story, in ms.
const PERIOD = 8600

const T = {
  typeFrom: 500, // `show run` is typed
  typeTo: 1500,
  outFrom: 1750, // config lines arrive
  outTo: 2250,
  moreFrom: 2350, // the pager stops at --More--
  moreTo: 2650,
  matchFrom: 2750, // the rule card lights up: match found
  matchTo: 3050,
  sendFrom: 3150, // a space is auto-sent (no typing — it just appears)
  sendTo: 3350,
  pageFrom: 3500, // next page scrolls in
  pageTo: 4000,
  promptFrom: 4150, // back to a prompt
  promptTo: 4400,
  badgeFrom: 2750, // footer badge pulses while the trigger fires
  badgeTo: 4000,
  fadeFrom: 7700,
  fadeTo: 8200
}

const CMD = 'show run'
const LINES = [
  'hostname core-01',
  'interface Vlan10',
  ' ip address 10.0.10.1 255.255.255.0'
]
const MORE = '--More--'
const NEXT_LINES = [
  'interface Vlan20',
  ' ip address 10.0.20.1 255.255.255.0',
  'end'
]
const LINE = 1.45
const VISIBLE_LINES = 5

const CLOSE_PATH = 'M563.8 512l262.5-312.9c4.4-5.2.7-13.1-6.1-13.1h-79.8c-4.7 0-9.2 2.1-12.3 5.7L511.6 449.8 295.1 191.7c-3-3.6-7.5-5.7-12.3-5.7H203c-6.8 0-10.5 7.9-6.1 13.1L459.4 512 196.9 824.9A7.95 7.95 0 0 0 203 838h79.8c4.7 0 9.2-2.1 12.3-5.7l216.5-258.1 216.5 258.1c3 3.6 7.5 5.7 12.3 5.7h79.8c6.8 0 10.5-7.9 6.1-13.1L563.8 512z'
const PLUS_PATH = 'M482 152h60q8 0 8 8v704q0 8-8 8h-60q-8 0-8-8V160q0-8 8-8V160q0-8 8-8z M176 474h672q8 0 8 8v60q0 8-8 8H176q-8 0-8-8v-60q0-8 8-8z'
const CARET_PATH = 'M884 256h-75c-5.1 0-9.9 2.5-12.9 6.6L512 654.2 227.9 262.6c-3-4.1-7.8-6.6-12.9-6.6h-75c-6.5 0-10.3 7.4-6.5 12.7l352.6 486.1c12.8 17.6 39 17.6 51.7 0l352.6-486.1c3.9-5.3.1-12.7-6.4-12.7z'
// antd FunctionOutlined — the footer triggers icon (footer-entry.jsx).
const FN_PATH = 'M356 368h93.7c11.1 0 20.4-8.6 21.1-19.7 8.7-136.9 105.8-245.7 224.3-260.6 11.4-1.4 19.9-11.1 19.9-22.6V48c0-13.2-11.2-23.6-24.3-22.5C526.8 39.4 387.5 178.5 372.1 345.4c-1.1 12 8.4 22.6 20.5 22.6h-36.6zM844 446.9c-1.1-12-11.4-21.3-23.4-20.4-83.7 6.1-152.7 67.8-165.4 147.7-1.6 10.2-10.4 17.8-20.8 17.8H372c-12.1 0-21.6 10.6-20.5 22.6 15.4 166.9 154.7 306 318.6 319.9 13.1 1.1 24.3-9.3 24.3-22.5v-17.1c0-11.5-8.5-21.2-19.9-22.6-118.5-14.9-215.6-123.7-224.3-260.6-.7-11.1 10-19.7 21.1-19.7H844c12.1 0 21.6-10.6 20.5-22.6-2.3-25.5-2.3-84.4 0-122.5z'

const icon = (path, cls, viewBox = '64 64 896 896') =>
  `<svg class="${cls}" viewBox="${viewBox}" aria-hidden="true"><path d="${path}"/></svg>`

const CSS = `
.eb-tr {
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
  --eb-term-cursor: #b5bd68;
  --eb-term-green: #19f9d8;
  --eb-term-blue: #6fc1ff;
  --eb-term-yellow: #ffd479;
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: var(--radius-lg, 12px);
  border: 1px solid var(--color-border, #d9e2f0);
  background: linear-gradient(135deg, #e8f1ff 0%, #f2ecff 52%, #fdeef5 100%);
  color: #16233a;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.3;
  isolation: isolate;
  -webkit-font-smoothing: antialiased;
}
.eb-tr-deco { position: absolute; inset: 0; pointer-events: none; }
.eb-tr-dots {
  position: absolute;
  inset: -6em;
  background-image: radial-gradient(rgba(37, 99, 235, 0.2) 0.18em, transparent 0.18em);
  background-size: 4.2em 4.2em;
  animation: eb-tr-drift 34s linear infinite;
}
@keyframes eb-tr-drift { to { transform: translate3d(4.2em, 4.2em, 0); } }
.eb-tr-blob { position: absolute; border-radius: 50%; background: rgba(255, 255, 255, 0.62); }
.eb-tr-blob-a { width: 32em; height: 32em; right: -10em; top: -12em; }
.eb-tr-blob-b { width: 26em; height: 26em; left: -9em; bottom: -11em; }
.eb-tr-spark {
  position: absolute;
  width: 1.7em;
  height: 1.7em;
  background: #f59e0b;
  clip-path: polygon(50% 0, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0 50%, 39% 39%);
  animation: eb-tr-twinkle 3.6s ease-in-out infinite;
}
.eb-tr-spark-a { right: 7.5em; top: 4.6em; }
.eb-tr-spark-b { right: 14.5em; top: 12em; width: 1.05em; height: 1.05em; background: #ec4899; animation-delay: 0.7s; }
@keyframes eb-tr-twinkle {
  0%, 100% { transform: scale(0.72) rotate(0deg); opacity: 0.5; }
  50% { transform: scale(1.16) rotate(35deg); opacity: 1; }
}
.eb-tr-head { position: absolute; left: 5em; right: 5em; top: 3.2em; }
.eb-tr-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.45em;
  font-size: 1.4em;
  font-weight: 800;
  letter-spacing: 0.01em;
  color: #2563eb;
}
.eb-tr-brand::before {
  content: '';
  width: 1.05em;
  height: 1.05em;
  border-radius: 50%;
  background: #2563eb;
  box-shadow: inset 0 0 0 0.32em #fff;
}
.eb-tr-h1 {
  margin: 0.24em 0 0;
  font-size: 3.2em;
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.025em;
  color: #0f172a;
}
.eb-tr-h1 em {
  font-style: normal;
  background: linear-gradient(96deg, #2563eb, #7c3aed 52%, #ec4899);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.eb-tr-sub {
  margin: 0.5em 0 0;
  max-width: 64em;
  font-size: 1.55em;
  line-height: 1.4;
  color: #475569;
}
.eb-tr-sub b { color: #0f172a; font-weight: 700; }
.eb-tr-app {
  position: absolute;
  left: 50%;
  bottom: 5.4%;
  transform: translateX(-50%);
  width: 92em;
  background: var(--eb-term-bg);
  border-radius: 0.8em;
  box-shadow: 0 1.3em 2.6em rgba(15, 23, 42, 0.32), 0 0 2.2em rgba(37, 99, 235, 0.2);
  overflow: hidden;
  text-align: left;
  animation: eb-tr-glow 4.4s ease-in-out infinite;
}
@keyframes eb-tr-glow {
  0%, 100% { box-shadow: 0 1.3em 2.6em rgba(15, 23, 42, 0.32), 0 0 2.2em rgba(37, 99, 235, 0.18); }
  50% { box-shadow: 0 1.3em 2.6em rgba(15, 23, 42, 0.34), 0 0 3.4em rgba(124, 58, 237, 0.4); }
}
.eb-tr-tabbar {
  display: flex;
  align-items: stretch;
  height: 2.6em;
  padding: 0 0.5em;
  background: var(--eb-main-dark);
  font-size: 1.3em;
  line-height: 1;
}
.eb-tr-tab {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.42em;
  height: 100%;
  min-width: 8.4em;
  max-width: 15em;
  padding: 0 1em;
  border-radius: 0.21em 0.21em 0 0;
  background: var(--eb-main-dark);
  color: var(--eb-text-dark);
  white-space: nowrap;
}
.eb-tr-tab.is-active {
  background: var(--eb-main);
  color: var(--eb-text);
  font-weight: 700;
}
.eb-tr-tab-count {
  flex: none;
  height: 1.43em;
  padding: 0 0.3em;
  border-radius: 0.72em 0.14em 0.14em 0.72em;
  background: var(--eb-primary);
  color: #fff;
  line-height: 1.43em;
  text-align: center;
}
.eb-tr-tab-close {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.15em;
  height: 1.15em;
  border-radius: 50%;
  background: var(--eb-main);
  color: var(--eb-text);
}
.eb-tr-tab-close svg { width: 0.6em; height: 0.6em; fill: currentColor; }
.eb-tr-tab-add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  width: 1.5em;
  height: 1.6em;
  margin-left: 0.3em;
  color: var(--eb-text);
}
.eb-tr-tab-add svg { width: 0.95em; height: 0.95em; fill: currentColor; }
.eb-tr-tabbar-caret {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  width: 1.4em;
  height: 1.6em;
  margin-left: auto;
  color: var(--eb-text-dark);
}
.eb-tr-tabbar-caret svg { width: 0.85em; height: 0.85em; fill: currentColor; }
.eb-tr-pane {
  position: relative;
  box-sizing: border-box;
  height: ${(VISIBLE_LINES * LINE + 2.1).toFixed(2)}em;
  padding: 1.05em 1em;
  background: var(--eb-term-bg);
  font-size: 1.9em;
  font-family: Menlo, Monaco, 'DejaVu Sans Mono', 'Courier New', monospace;
  line-height: ${LINE};
  color: var(--eb-term-fg);
  white-space: nowrap;
  overflow: hidden;
}
.eb-tr-screen { will-change: transform; }
.eb-tr-line { line-height: ${LINE}; }
.eb-tr-ps1 { color: var(--eb-term-green); }
.eb-tr-ps1-path { color: var(--eb-term-blue); }
.eb-tr-more { color: var(--eb-term-yellow); font-weight: 700; }
.eb-tr-caret {
  display: inline-block;
  width: 0.6em;
  height: 1.2em;
  margin-left: 0.04em;
  vertical-align: -0.26em;
  background: var(--eb-term-cursor);
}
.eb-tr-out, .eb-tr-moreln, .eb-tr-next, .eb-tr-prompt2 { opacity: 0; }
/* the trigger rule card: a TriggerEditor row floating over the pane */
.eb-tr-rule {
  position: absolute;
  right: 1em;
  bottom: 1em;
  min-width: 30em;
  padding: 0.7em 0.9em;
  border-radius: 0.5em;
  background: rgba(18, 18, 20, 0.94);
  border: 1px solid #3a3a3d;
  font-size: 1.55em;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: var(--eb-text);
  opacity: 0;
  z-index: 5;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.eb-tr-rule.is-hit {
  border-color: var(--eb-success);
  box-shadow: 0 0 1.2em rgba(6, 214, 160, 0.45);
}
.eb-tr-rule-name { font-weight: 700; color: #fff; }
.eb-tr-rule-flow { margin-top: 0.3em; color: var(--eb-text-dark); font-size: 0.92em; }
.eb-tr-rule-flow b { color: var(--eb-term-yellow); font-weight: 700; }
.eb-tr-rule-flow i { color: var(--eb-term-green); font-style: normal; font-weight: 700; }
.eb-tr-rule-tag {
  display: inline-block;
  margin-left: 0.6em;
  padding: 0.05em 0.5em;
  border-radius: 999px;
  background: rgba(6, 214, 160, 0.16);
  color: var(--eb-success);
  font-size: 0.8em;
  font-weight: 700;
  vertical-align: 0.1em;
}
.eb-tr-rule-tag.is-firing { background: var(--eb-success); color: #06110d; }
.eb-tr-foot {
  position: relative;
  display: flex;
  align-items: center;
  height: 2.6em;
  padding: 0 0.8em;
  background: var(--eb-main);
  font-size: 1.3em;
  color: var(--eb-text-dark);
}
.eb-tr-fx { position: relative; display: inline-flex; align-items: center; color: var(--eb-text); }
.eb-tr-fx svg { width: 1.1em; height: 1.1em; fill: currentColor; }
.eb-tr-badge {
  position: absolute;
  top: -0.7em;
  right: -0.9em;
  min-width: 1.5em;
  height: 1.5em;
  padding: 0 0.3em;
  border-radius: 999px;
  background: #ff4d4f;
  color: #fff;
  font-size: 0.78em;
  line-height: 1.5em;
  text-align: center;
  font-weight: 700;
  transition: transform 0.18s;
}
.eb-tr-badge.is-pulsing { transform: scale(1.45); }
.eb-tr-foot-encode { margin-left: auto; }
.eb-tr[data-variant='card'] .eb-tr-app {
  bottom: auto;
  top: 50%;
  transform: translate(-50%, -50%);
}
.eb-tr[data-variant='card'] .eb-tr-tabbar { font-size: 1.6em; }
.eb-tr[data-variant='card'] .eb-tr-foot { font-size: 1.8em; }
.eb-tr[data-variant='card'] .eb-tr-pane { font-size: 2.4em; }
.eb-tr[data-variant='card'] .eb-tr-rule { font-size: 2em; }
@media (prefers-reduced-motion: reduce) {
  .eb-tr-dots, .eb-tr-spark, .eb-tr-app { animation: none !important; }
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

function seg (t, from, to) {
  return clamp((t - from) / (to - from), 0, 1)
}

function easeOut (p) {
  return 1 - Math.pow(1 - p, 3)
}

function easeInOut (p) {
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2
}

function prompt () {
  return `<span class="eb-tr-ps1">netops@core-01</span>:<span class="eb-tr-ps1-path">~</span>$&nbsp;`
}

function markup (variant) {
  const head = variant === 'card'
    ? ''
    : `
      <div class="eb-tr-head">
        <span class="eb-tr-brand">electerm</span>
        <h2 class="eb-tr-h1">The terminal <em>answers itself</em></h2>
        <p class="eb-tr-sub"><b>Triggers</b> watch the output stream and reply for you — past the pager, through the confirmations.</p>
      </div>`
  const outLines = LINES.map(l => `<div class="eb-tr-line eb-tr-out">${l}</div>`).join('')
  const nextLines = NEXT_LINES.map(l => `<div class="eb-tr-line eb-tr-next">${l}</div>`).join('')
  return `
    <div class="eb-tr-deco">
      <span class="eb-tr-blob eb-tr-blob-a"></span>
      <span class="eb-tr-blob eb-tr-blob-b"></span>
      <span class="eb-tr-dots"></span>
      <span class="eb-tr-spark eb-tr-spark-a"></span>
      <span class="eb-tr-spark eb-tr-spark-b"></span>
    </div>
    ${head}
    <div class="eb-tr-app">
      <div class="eb-tr-tabbar">
        <span class="eb-tr-tab is-active">
          <span class="eb-tr-tab-count">1</span>
          <span>netops@core-01:22</span>
          <span class="eb-tr-tab-close">${icon(CLOSE_PATH, '')}</span>
        </span>
        <span class="eb-tr-tab">
          <span class="eb-tr-tab-count">2</span>
          <span>netops@edge-02:22</span>
        </span>
        <span class="eb-tr-tab-add">${icon(PLUS_PATH, '')}</span>
        <span class="eb-tr-tabbar-caret">${icon(CARET_PATH, '')}</span>
      </div>
      <div class="eb-tr-pane">
        <div class="eb-tr-screen">
          <div class="eb-tr-line">${prompt()}<span class="eb-tr-cmd"></span><span class="eb-tr-caret eb-tr-caret1"></span></div>
          ${outLines}
          <div class="eb-tr-line eb-tr-moreln"><span class="eb-tr-more">${MORE}</span></div>
          ${nextLines}
          <div class="eb-tr-line eb-tr-prompt2">${prompt()}<span class="eb-tr-caret"></span></div>
        </div>
        <div class="eb-tr-rule">
          <span class="eb-tr-rule-name">Cisco pager</span><span class="eb-tr-rule-tag">cooldown</span>
          <div class="eb-tr-rule-flow">[text] <b>--More--</b> &rarr; send <i>&lt;space&gt;</i></div>
        </div>
      </div>
      <div class="eb-tr-foot">
        <span class="eb-tr-fx">${icon(FN_PATH, '')}<span class="eb-tr-badge">3</span></span>
        <span class="eb-tr-foot-encode">UTF-8</span>
      </div>
    </div>`
}

function mount (host) {
  if (host.getAttribute('data-eb-mounted')) return
  host.setAttribute('data-eb-mounted', '1')

  const variant = host.getAttribute('data-eb-banner') === 'card' ? 'card' : 'hero'
  const root = document.createElement('div')
  root.className = 'eb-tr'
  root.setAttribute('data-variant', variant)
  root.setAttribute('role', 'img')
  root.setAttribute('aria-label',
    'electerm: a trigger rule answers the --More-- pager with a space so the output keeps flowing')
  root.innerHTML = markup(variant)
  host.appendChild(root)

  const el = {
    cmd: root.querySelector('.eb-tr-cmd'),
    caret1: root.querySelector('.eb-tr-caret1'),
    outs: root.querySelectorAll('.eb-tr-out'),
    more: root.querySelector('.eb-tr-moreln'),
    nexts: root.querySelectorAll('.eb-tr-next'),
    prompt2: root.querySelector('.eb-tr-prompt2'),
    screen: root.querySelector('.eb-tr-screen'),
    rule: root.querySelector('.eb-tr-rule'),
    tag: root.querySelector('.eb-tr-rule-tag'),
    badge: root.querySelector('.eb-tr-badge')
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

  const setOpacity = (nodes, v) => {
    const s = v.toFixed(3)
    const list = nodes.length === undefined ? [nodes] : nodes
    for (const n of list) n.style.opacity = s
  }

  function frame (t) {
    const gone = easeInOut(seg(t, T.fadeFrom, T.fadeTo))
    const vis = 1 - gone

    // `show run` typed once
    const typed = Math.round(easeOut(seg(t, T.typeFrom, T.typeTo)) * CMD.length)
    el.cmd.textContent = CMD.slice(0, typed)

    // config lines arrive
    const outP = easeOut(seg(t, T.outFrom, T.outTo))
    setOpacity(el.outs, outP * vis)
    setOpacity(el.caret1, (1 - outP) * vis)

    // the pager stops
    const moreP = easeOut(seg(t, T.moreFrom, T.moreTo))
    setOpacity(el.more, moreP * vis)

    // rule card rises + lights up on the match
    const matchP = easeOut(seg(t, T.matchFrom, T.matchTo))
    el.rule.style.opacity = (matchP * vis).toFixed(3)
    el.rule.style.transform = 'translateY(' + ((1 - matchP) * 0.6).toFixed(3) + 'em)'
    el.rule.classList.toggle('is-hit', t >= T.sendFrom && t < T.pageTo + 600)

    // the answer is auto-sent: no typing, the tag flips to "fired"
    const firing = t >= T.sendFrom && t < T.pageFrom
    el.tag.textContent = firing || t >= T.pageFrom ? 'fired ✓' : 'cooldown'
    el.tag.classList.toggle('is-firing', firing)
    el.badge.classList.toggle('is-pulsing',
      t >= T.badgeFrom && t < T.badgeTo && Math.sin(t / 130) > 0)

    // next page scrolls in, pager line scrolls away
    const pageP = easeOut(seg(t, T.pageFrom, T.pageTo))
    setOpacity(el.nexts, pageP * vis)
    el.more.style.opacity = ((1 - pageP) * moreP * vis).toFixed(3)
    el.screen.style.transform = 'translateY(' + (-pageP * LINE).toFixed(3) + 'em)'

    const p2 = easeOut(seg(t, T.promptFrom, T.promptTo))
    setOpacity(el.prompt2, p2 * vis)
  }

  const reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    frame(T.promptTo + 200)
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
