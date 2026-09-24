/**
 * Animated banner for the "Session keepalive / heartbeat icon" blog post.
 *
 * Everything you see is generated here — no image, no GIF, no canvas: the
 * background, the electerm window (tab bar + session control bar with the
 * real heartbeat icon + terminal), the idle meter, the TMOUT bar, the
 * flying Enter packet, the cartoon pointer and the sync flashes are all
 * plain DOM + CSS driven by one requestAnimationFrame timeline.
 *
 * Story, matching the article:
 *   1. IDLE — SSH transport keepalive is on (chip in the corner), yet the
 *      TMOUT bar keeps draining and the idle counter climbs. Packets do not
 *      reset the shell.
 *   2. OPT-IN — the pointer clicks the grey heartbeat icon in the session
 *      control bar. It turns warn-orange (.sess-icon.active -> --warn) and
 *      starts pulsing.
 *   3. HEARTBEAT LOOP — every 3 s of true idle the heart beats, an Enter
 *      packet flies into the terminal, the server writes \n to the PTY, the
 *      idle counter snaps to 0 and the TMOUT bar refills. Typing would pause
 *      it (not shown — the banner stays idle so the loop is visible).
 *
 * Modelled on the real electerm UI:
 *   tab bar / tabs ..... src/client/components/tabs/tabs.styl
 *   UI theme ........... src/client/css/includes/theme.styl (--main, ...)
 *                        with defaultThemeDark (#121214) over it
 *   terminal theme ..... src/client/common/theme-defaults.js
 *                        (defaultThemeDarkTerminal, bg #20111b)
 *   session control bar  src/client/components/terminal/terminal.styl
 *                        (.terminal-control: --main, 32px) rendered by
 *                        src/client/components/session/session-control.jsx
 *   heartbeat toggle ... session-control.jsx renderKeepaliveIcon():
 *                        HeartbeatIcon, .keepalive-icon, .active -> --warn
 *   heartbeat glyph .... src/client/components/icons/heartbeat.jsx
 *                        (heart path + EKG polyline, reused below)
 *   engine ............. src/client/components/terminal/attach-addon-custom.js
 *                        (_keepaliveInterval = 3000, idle input+output check,
 *                         { action: 'keepalive' }, 500 ms echo suppression)
 *                        -> src/app/server/session-server.js
 *                        (term.write('\n\r\x1b[K'), NUL would not wake read())
 *
 * One deliberate liberty: the beam, the flying "↵" packet and the flashes
 * visualise "a keepalive just fired" — the app itself only shows the heart
 * staying highlighted plus a quiet prompt redraw.
 *
 * Mount points: any element carrying [data-eb-banner]:
 *   data-eb-banner="hero"  -> headline + full window (blog post page)
 *   data-eb-banner="card"  -> window only         (blog index thumbnail)
 * A mount also has to match data-eb-banner-src, otherwise the first banner
 * script on the index would claim every card.
 *
 * Layout is in `em`, root font-size is 1% of banner width.
 */

const STYLE_ID = 'eb-ka-style'

// One full pass of the story, in ms.
const PERIOD = 10800

const T = {
  clickFrom: 1300, // pointer glides toward the grey heart
  clickTo: 2000,
  clickAt: 2100, // ... and clicks it on
  tipFrom: 700, // tooltip naming the icon
  tipTo: 1100,
  tipOutFrom: 2500,
  tipOutTo: 2900,
  beat1At: 3300, // first heartbeat: idle hits 3 s
  beat2At: 6300, // second heartbeat: idle hits 3 s again
  beat3At: 9300, // third (loop tail, completes the rhythm)
  packetLen: 900, // flight time of the Enter packet
  flashLen: 500,
  badgeLen: 1400,
  idleResetLen: 450,
  fadeFrom: 9900,
  fadeTo: 10400
}

const HEART_PATH = 'M923 283.6a260.1 260.1 0 00-56.9-82.8 264.4 264.4 0 00-84-55.5A265.3 265.3 0 00679.7 128c-38.1 0-75.4 7.5-109.8 22.3a274.5 274.5 0 00-87.7 60.8l-12.1 12.5-12.1-12.5a260.5 260.5 0 00-87.7-60.8c-34.4-14.8-71.7-22.3-109.8-22.3-38.2 0-75.5 7.5-109.9 22.3-33.4 14.3-63.3 34.9-88.9 61-25.6 26.1-45.7 56.4-59.9 90.5A278.3 278.3 0 000 416.5c0 39.6 7.7 77.2 22.9 111.6 12.8 29.6 31.5 57 55.5 81.5l356.2 358.5c12.2 12.3 29.7 19.4 47.8 19.4 18.1 0 35.6-7.1 47.7-19.4L886 609.6c24-24.5 42.7-51.9 55.5-81.5C956.3 493.7 964 456.1 964 416.5c0-37.9-7.4-74.7-22-109zM880 497.9c-10.4 24.1-26 46-46.5 65.2L480 920.7 193.5 563.1C173 543.9 157.4 522 147 497.9c-12.1-27.9-18.2-57.8-18.2-88.6 0-30 5.8-59 17.3-86.3 11.1-26.5 27.2-50.3 47.8-70.8 20.6-20.4 44.6-36.5 71.4-47.8 27.7-11.7 57.2-17.7 87.8-17.7 32.3 0 63.7 6.5 93.2 19.3 29 12.5 55 30.9 77.2 54.4l73.9 76.5 73.9-76.5c22.2-23.5 48.2-41.9 77.2-54.4 29.5-12.8 60.9-19.3 93.2-19.3 30.6 0 60.1 6 87.8 17.7 26.8 11.3 50.8 27.4 71.4 47.8 20.6 20.5 36.7 44.3 47.8 70.8 11.5 27.3 17.3 56.3 17.3 86.3 0 30.8-6.1 60.7-18.2 88.6z'
const EKG_POINTS = '160,512 310,512 370,310 450,714 530,512 594,512 654,360 714,664 774,512 864,512'
const CLOSE_PATH = 'M563.8 512l262.5-312.9c4.4-5.2.7-13.1-6.1-13.1h-79.8c-4.7 0-9.2 2.1-12.3 5.7L511.6 449.8 295.1 191.7c-3-3.6-7.5-5.7-12.3-5.7H203c-6.8 0-10.5 7.9-6.1 13.1L459.4 512 196.9 824.9A7.95 7.95 0 0 0 203 838h79.8c4.7 0 9.2-2.1 12.3-5.7l216.5-258.1 216.5 258.1c3 3.6 7.5 5.7 12.3 5.7h79.8c6.8 0 10.5-7.9 6.1-13.1L563.8 512z'
const PLUS_PATH = 'M482 152h60q8 0 8 8v704q0 8-8 8h-60q-8 0-8-8V160q0-8 8-8z M176 474h672q8 0 8 8v60q0 8-8 8H176q-8 0-8-8v-60q0-8 8-8z'
const CARET_PATH = 'M884 256h-75c-5.1 0-9.9 2.5-12.9 6.6L512 654.2 227.9 262.6c-3-4.1-7.8-6.6-12.9-6.6h-75c-6.5 0-10.3 7.4-6.5 12.7l352.6 486.1c12.8 17.6 39 17.6 51.7 0l352.6-486.1c3.9-5.3.1-12.7-6.4-12.7z'
const CHECK_PATH = 'M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm193.5 301.7l-210.6 292a31.8 31.8 0 01-51.7 0L318.5 484.9c-3.8-5.3 0-12.7 6.5-12.7h46.9c10.2 0 19.9 4.9 25.9 13.3l71.2 98.8 157.2-218c6-8.3 15.6-13.3 25.9-13.3H699c6.5 0 10.3 7.4 6.5 12.7z'

const CURSOR_PATH = 'M0 0 L0 30 L7.5 22 L13 33 L19 30 L13.5 19.5 L23 18 Z'

const icon = (path, cls, viewBox = '64 64 896 896') =>
  `<svg class="${cls}" viewBox="${viewBox}" aria-hidden="true"><path d="${path}"/></svg>`

const heartbeatSVG = (cls) =>
  `<svg class="${cls}" viewBox="0 0 1024 1024" aria-hidden="true"><path d="${HEART_PATH}"/><polyline points="${EKG_POINTS}" fill="none" stroke="currentColor" stroke-width="60" stroke-linecap="round" stroke-linejoin="round"/></svg>`

const CSS = `
.eb-ka {
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
  --eb-split: #121214;
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
.eb-ka-deco { position: absolute; inset: 0; pointer-events: none; }
.eb-ka-dots {
  position: absolute;
  inset: -6em;
  background-image: radial-gradient(rgba(37, 99, 235, 0.2) 0.18em, transparent 0.18em);
  background-size: 4.2em 4.2em;
  animation: eb-ka-drift 34s linear infinite;
}
@keyframes eb-ka-drift { to { transform: translate3d(4.2em, 4.2em, 0); } }
.eb-ka-blob { position: absolute; border-radius: 50%; background: rgba(255,255,255,0.62); }
.eb-ka-blob-a { width: 32em; height: 32em; right: -10em; top: -12em; }
.eb-ka-blob-b { width: 26em; height: 26em; left: -9em; bottom: -11em; }
.eb-ka-spark {
  position: absolute;
  width: 1.7em; height: 1.7em; background: #f59e0b;
  clip-path: polygon(50% 0, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0 50%, 39% 39%);
  animation: eb-ka-twinkle 3.6s ease-in-out infinite;
}
.eb-ka-spark-a { right: 7.5em; top: 4.6em; }
.eb-ka-spark-b { right: 14.5em; top: 12em; width: 1.05em; height: 1.05em; background: #ec4899; animation-delay: 0.7s; }
@keyframes eb-ka-twinkle { 0%,100% { transform: scale(0.72) rotate(0deg); opacity: 0.5; } 50% { transform: scale(1.16) rotate(35deg); opacity: 1; } }
.eb-ka-head { position: absolute; left: 5em; right: 5em; top: 3em; }
.eb-ka-brand { display: inline-flex; align-items: center; gap: 0.45em; font-size: 1.4em; font-weight: 800; color: #2563eb; }
.eb-ka-brand::before { content: ''; width: 1.05em; height: 1.05em; border-radius: 50%; background: #2563eb; box-shadow: inset 0 0 0 0.32em #fff; }
.eb-ka-h1 { margin: 0.24em 0 0; font-size: 3.2em; font-weight: 800; line-height: 1.05; letter-spacing: -0.025em; color: #0f172a; }
.eb-ka-h1 em { font-style: normal; background: linear-gradient(96deg, #2563eb, #7c3aed 52%, #ec4899); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.eb-ka-sub { margin: 0.5em 0 0; max-width: 62em; font-size: 1.55em; line-height: 1.4; color: #475569; }
.eb-ka-sub b { color: #0f172a; }
.eb-ka-app {
  position: absolute; left: 50%; bottom: 5.4%; transform: translateX(-50%);
  width: 92em; background: var(--eb-term-bg); border-radius: 0.8em; overflow: hidden; text-align: left;
  box-shadow: 0 1.3em 2.6em rgba(15,23,42,0.32), 0 0 2.2em rgba(37,99,235,0.2);
  animation: eb-ka-glow 4.4s ease-in-out infinite;
}
@keyframes eb-ka-glow { 0%,100% { box-shadow: 0 1.3em 2.6em rgba(15,23,42,0.32), 0 0 2.2em rgba(37,99,235,0.18); } 50% { box-shadow: 0 1.3em 2.6em rgba(15,23,42,0.34), 0 0 3.4em rgba(229,89,52,0.42); } }
.eb-ka-tabbar { display: flex; align-items: stretch; height: 2.6em; padding: 0 0.5em; background: var(--eb-main-dark); font-size: 1.3em; line-height: 1; }
.eb-ka-tab { position: relative; display: flex; align-items: center; gap: 0.42em; height: 100%; padding: 0 1em; border-radius: 0.21em 0.21em 0 0; background: var(--eb-main); color: var(--eb-text); font-weight: 700; white-space: nowrap; }
.eb-ka-tab-status { position: absolute; left: 0.14em; top: 0.14em; width: 0.4em; height: 0.4em; border-radius: 50%; background: var(--eb-success); }
.eb-ka-tab-count { flex: none; height: 1.43em; padding: 0 0.3em; border-radius: 0.72em 0.14em 0.14em 0.72em; background: var(--eb-primary); color: #fff; line-height: 1.43em; }
.eb-ka-tab-close { display: inline-flex; align-items: center; justify-content: center; width: 1.15em; height: 1.15em; border-radius: 50%; background: var(--eb-main-dark); color: var(--eb-text); }
.eb-ka-tab-close svg { width: 0.6em; height: 0.6em; fill: currentColor; }
.eb-ka-tab-add, .eb-ka-tabbar-caret { display: inline-flex; align-items: center; align-self: center; height: 1.6em; color: var(--eb-text); }
.eb-ka-tab-add { width: 1.5em; margin-left: 0.3em; } .eb-ka-tab-add svg { width: 0.95em; height: 0.95em; fill: currentColor; }
.eb-ka-tabbar-caret { width: 1.4em; margin-left: auto; color: var(--eb-text-dark); } .eb-ka-tabbar-caret svg { width: 0.85em; height: 0.85em; fill: currentColor; }
.eb-ka-ctl { position: relative; display: flex; align-items: center; height: 3em; padding: 0 0.94em; background: var(--eb-main); color: var(--eb-text); white-space: nowrap; z-index: 4; }
.eb-ka-type-tab { display: inline-flex; align-items: center; height: 100%; padding-right: 1.43em; font-size: 1.17em; color: var(--eb-text-light); }
.eb-ka-sess-icon { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 1.5em; height: 1.5em; margin-right: 0.7em; border-radius: 0.3em; color: var(--eb-text); transition: color 0.22s, background 0.22s, box-shadow 0.22s; }
.eb-ka-sess-icon svg { width: 1.25em; height: 1.25em; fill: currentColor; }
.eb-ka-sess-icon svg polyline { fill: none; }
.eb-ka-heart { color: var(--eb-text-dark); }
.eb-ka-heart.is-on { color: var(--eb-warn); background: rgba(229,89,52,0.16); }
.eb-ka-heart.beat { box-shadow: 0 0 0 0.3em rgba(229,89,52,0.55); transform: scale(1.18); }
.eb-ka-tip { position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 0.95em; padding: 0.5em 0.67em; border-radius: 0.5em; background: rgba(0,0,0,0.85); color: #fff; font-size: 1em; white-space: nowrap; opacity: 0; pointer-events: none; z-index: 9; }
.eb-ka-tip::before { content: ''; position: absolute; bottom: -0.24em; left: 50%; width: 0.48em; height: 0.48em; margin-left: -0.24em; background: rgba(0,0,0,0.85); transform: rotate(45deg); }
.eb-ka-term { position: relative; padding: 1em 1em 1.1em; background: var(--eb-term-bg); font-size: 1.9em; font-family: Menlo, Monaco, 'DejaVu Sans Mono', 'Courier New', monospace; line-height: 1.45; color: var(--eb-term-fg); min-height: 11.5em; overflow: hidden; }
.eb-ka-line { white-space: nowrap; }
.eb-ka-ps1 { color: var(--eb-term-green); } .eb-ka-path { color: var(--eb-term-blue); }
.eb-ka-dim { color: #8a8a92; } .eb-ka-warn-txt { color: #fbbf24; }
.eb-ka-meters { display: flex; gap: 1.2em; margin-top: 0.7em; font-size: 0.72em; }
.eb-ka-meter { flex: 1; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 0.5em; padding: 0.55em 0.7em; }
.eb-ka-meter-label { display: flex; justify-content: space-between; color: #c9c9d1; margin-bottom: 0.35em; }
.eb-ka-meter-label b { color: #fff; }
.eb-ka-bar { height: 0.55em; border-radius: 999px; background: rgba(255,255,255,0.12); overflow: hidden; }
.eb-ka-bar-fill { display: block; height: 100%; border-radius: 999px; }
.eb-ka-idle-fill { background: var(--eb-term-blue); }
.eb-ka-tmout-fill { background: var(--eb-success); }
.eb-ka-tmout-fill.danger { background: #ef4444; }
.eb-ka-chip { display: inline-flex; align-items: center; gap: 0.4em; margin-top: 0.7em; font-size: 0.68em; color: #c9c9d1; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 999px; padding: 0.3em 0.8em; }
.eb-ka-chip svg { width: 1em; height: 1em; fill: var(--eb-success); }
.eb-ka-packet { position: absolute; font-size: 1.5em; font-family: Menlo, monospace; background: rgba(0,0,0,0.88); border: 1px solid rgba(229,89,52,0.8); color: #fff; border-radius: 0.5em; padding: 0.2em 0.55em; opacity: 0; z-index: 6; pointer-events: none; white-space: nowrap; }
.eb-ka-badge { position: absolute; left: 50%; top: 44%; transform: translate(-50%,-50%); display: inline-flex; align-items: center; gap: 0.4em; padding: 0.4em 0.8em; border-radius: 999px; background: rgba(0,0,0,0.85); border: 1px solid rgba(229,89,52,0.7); color: #fff; font-size: 1.25em; opacity: 0; z-index: 6; pointer-events: none; white-space: nowrap; }
.eb-ka-badge svg { width: 1em; height: 1em; fill: var(--eb-success); }
.eb-ka-flash { position: absolute; inset: 0; pointer-events: none; opacity: 0; box-shadow: inset 0 0 0 0.18em var(--eb-warn); }
.eb-ka-pointer { position: absolute; width: 1.15em; height: 1.55em; opacity: 0; filter: drop-shadow(0 0.08em 0.16em rgba(0,0,0,0.42)); z-index: 7; pointer-events: none; }
.eb-ka-ripple { position: absolute; width: 0.9em; height: 0.9em; border: 0.14em solid var(--eb-term-blue); border-radius: 50%; opacity: 0; z-index: 8; pointer-events: none; }
.eb-ka[data-variant='card'] .eb-ka-app { bottom: auto; top: 50%; transform: translate(-50%,-50%); }
.eb-ka[data-variant='card'] .eb-ka-term { font-size: 2.2em; min-height: 10.5em; }
@media (prefers-reduced-motion: reduce) { .eb-ka-dots, .eb-ka-spark, .eb-ka-app { animation: none !important; } }
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

function pulse (p) {
  return Math.sin(Math.PI * clamp(p, 0, 1))
}

function markup (variant) {
  const head = variant === 'card'
    ? ''
    : `
      <div class="eb-ka-head">
        <span class="eb-ka-brand">electerm</span>
        <h2 class="eb-ka-h1">A heartbeat that <em>keeps the shell awake</em></h2>
        <p class="eb-ka-sub">Idle 3 s → <b>Enter</b> flies into the PTY → <b>TMOUT</b> resets. Packets keep the wire; this keeps the login.</p>
      </div>`
  return `
    <div class="eb-ka-deco">
      <span class="eb-ka-blob eb-ka-blob-a"></span>
      <span class="eb-ka-blob eb-ka-blob-b"></span>
      <span class="eb-ka-dots"></span>
      <span class="eb-ka-spark eb-ka-spark-a"></span>
      <span class="eb-ka-spark eb-ka-spark-b"></span>
    </div>
    ${head}
    <div class="eb-ka-app">
      <div class="eb-ka-tabbar">
        <span class="eb-ka-tab">
          <span class="eb-ka-tab-status"></span>
          <span class="eb-ka-tab-count">2</span>
          <span>zxd@prod-01:22</span>
          <span class="eb-ka-tab-close">${icon(CLOSE_PATH, '')}</span>
        </span>
        <span class="eb-ka-tab-add">${icon(PLUS_PATH, '')}</span>
        <span class="eb-ka-tabbar-caret">${icon(CARET_PATH, '')}</span>
      </div>
      <div class="eb-ka-ctl">
        <span class="eb-ka-type-tab">SSH</span>
        <span class="eb-ka-type-tab">SFTP</span>
        <span class="eb-ka-sess-icon eb-ka-heart">${heartbeatSVG('')}<span class="eb-ka-tip">keepalive</span></span>
      </div>
      <div class="eb-ka-term">
        <div class="eb-ka-line"><span class="eb-ka-ps1">zxd@prod-01</span>:<span class="eb-ka-path">~</span>$ export TMOUT=60 <span class="eb-ka-dim"># auto-logout in 60 s</span></div>
        <div class="eb-ka-line"><span class="eb-ka-ps1">zxd@prod-01</span>:<span class="eb-ka-path">~</span>$ <span class="eb-ka-caret">▊</span> <span class="eb-ka-echo"></span></div>
        <div class="eb-ka-line eb-ka-note"><span class="eb-ka-dim"># idle… SSH keepalive (10 s) holds the socket, TMOUT still drains</span></div>
        <div class="eb-ka-meters">
          <div class="eb-ka-meter">
            <div class="eb-ka-meter-label"><span>idle</span><b class="eb-ka-idle-txt">0.0 s / 3 s</b></div>
            <div class="eb-ka-bar"><span class="eb-ka-bar-fill eb-ka-idle-fill"></span></div>
          </div>
          <div class="eb-ka-meter">
            <div class="eb-ka-meter-label"><span>TMOUT</span><b class="eb-ka-tmout-txt">60 s</b></div>
            <div class="eb-ka-bar"><span class="eb-ka-bar-fill eb-ka-tmout-fill"></span></div>
          </div>
        </div>
        <div class="eb-ka-chip">${icon(CHECK_PATH, '')}<span>SSH keepalive on (10 s) · guards the wire only</span></div>
        <span class="eb-ka-flash"></span>
        <span class="eb-ka-packet">↵ \\n → PTY</span>
        <span class="eb-ka-badge">${icon(CHECK_PATH, '')}<span class="eb-ka-badge-txt">TMOUT reset</span></span>
        <span class="eb-ka-pointer"><svg viewBox="-3 -3 29 39" width="100%" height="100%"><path d="${CURSOR_PATH}" fill="#fff" stroke="#1b1b1f" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/></svg></span>
        <span class="eb-ka-ripple"></span>
      </div>
    </div>`
}

function mount (host) {
  if (host.getAttribute('data-eb-mounted')) return
  host.setAttribute('data-eb-mounted', '1')

  const variant = host.getAttribute('data-eb-banner') === 'card' ? 'card' : 'hero'
  const root = document.createElement('div')
  root.className = 'eb-ka'
  root.setAttribute('data-variant', variant)
  root.setAttribute('role', 'img')
  root.setAttribute('aria-label', 'electerm session toolbar: clicking the heartbeat icon sends Enter every few idle seconds and resets the TMOUT countdown')
  root.innerHTML = markup(variant)
  host.appendChild(root)

  const el = {
    heart: root.querySelector('.eb-ka-heart'),
    tip: root.querySelector('.eb-ka-tip'),
    idleTxt: root.querySelector('.eb-ka-idle-txt'),
    idleFill: root.querySelector('.eb-ka-idle-fill'),
    tmoutTxt: root.querySelector('.eb-ka-tmout-txt'),
    tmoutFill: root.querySelector('.eb-ka-tmout-fill'),
    note: root.querySelector('.eb-ka-note'),
    echo: root.querySelector('.eb-ka-echo'),
    caret: root.querySelector('.eb-ka-caret'),
    packet: root.querySelector('.eb-ka-packet'),
    badge: root.querySelector('.eb-ka-badge'),
    flash: root.querySelector('.eb-ka-flash'),
    pointer: root.querySelector('.eb-ka-pointer'),
    ripple: root.querySelector('.eb-ka-ripple'),
    term: root.querySelector('.eb-ka-term'),
    ctl: root.querySelector('.eb-ka-ctl')
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

  function geom () {
    try {
      const ctl = el.ctl.getBoundingClientRect()
      const heart = el.heart.getBoundingClientRect()
      const term = el.term.getBoundingClientRect()
      const app = root.querySelector('.eb-ka-app').getBoundingClientRect()
      if (!app.width) throw new Error('no layout')
      const px = (r) => ((r.left + r.width / 2 - app.left) / app.width) * 100
      return {
        x0: 88,
        y0: 30,
        x1: px(heart),
        y1: ((heart.top + heart.height / 2 - app.top) / app.height) * 100,
        ctlH: ctl.height,
        termTop: ((term.top - app.top) / app.height) * 100
      }
    } catch {
      return { x0: 88, y0: 30, x1: 30, y1: 22, termTop: 40 }
    }
  }
  let g = geom()
  window.addEventListener('resize', () => { g = geom() })
  setTimeout(() => { g = geom() }, 300)

  // Idle model for the banner: compresses the real 3 s cadence into the loop.
  // beatAt list drives "idle hits 3 s -> Enter fires -> idle snaps to 0".
  const beats = [T.beat1At, T.beat2At, T.beat3At]

  function idleAt (t, enabled) {
    if (!enabled) return { idle: Math.min(3, t / 1000), fired: 0 }
    // time since last beat (or since enable)
    const onAt = T.clickAt
    let last = onAt
    let fired = 0
    for (const b of beats) {
      if (t >= b) {
        last = b
        fired++
      }
    }
    const idle = t < onAt ? Math.min(3, t / 1000) : Math.min(3, (t - last) / 1000)
    // recent fire = within packet window after a beat
    let recent = -1
    for (const b of beats) {
      if (t >= b && t - b < T.packetLen + 500) recent = b
    }
    return { idle, fired, recent }
  }

  function frame (t) {
    const gone = easeInOut(seg(t, T.fadeFrom, T.fadeTo))
    const vis = 1 - gone
    const enabled = t >= T.clickAt

    el.heart.classList.toggle('is-on', enabled)
    el.heart.style.opacity = vis.toFixed(3)

    // tooltip naming the icon, shown briefly at start
    const tipP = easeOut(seg(t, T.tipFrom, T.tipTo)) * (1 - easeInOut(seg(t, T.tipOutFrom, T.tipOutTo)))
    el.tip.style.opacity = (tipP * vis).toFixed(3)

    // pointer glides to the heart and clicks
    const arrive = easeInOut(seg(t, T.clickFrom, T.clickTo))
    const px = g.x0 + (g.x1 - g.x0) * arrive
    const py = g.y0 + (g.y1 - g.y0) * arrive
    el.pointer.style.left = px.toFixed(2) + '%'
    el.pointer.style.top = py.toFixed(2) + '%'
    el.pointer.style.opacity = (seg(t, T.clickFrom, T.clickFrom + 260) * (t < T.clickAt + 1800 ? 1 : 1 - seg(t, T.clickAt + 1800, T.clickAt + 2300)) * vis).toFixed(3)
    const rip = seg(t, T.clickAt, T.clickAt + 430)
    el.ripple.style.opacity = (rip > 0 && rip < 1 ? (1 - rip) * vis : 0).toFixed(3)
    el.ripple.style.left = g.x1.toFixed(2) + '%'
    el.ripple.style.top = g.y1.toFixed(2) + '%'

    // idle + TMOUT meters
    const { idle, recent } = idleAt(t, enabled)
    const idleFrac = clamp(idle / 3, 0, 1)
    el.idleFill.style.width = (idleFrac * 100).toFixed(1) + '%'
    el.idleTxt.textContent = idle.toFixed(1) + ' s / 3 s'

    // TMOUT drains in real seconds across the loop, refills on each beat.
    // Before opt-in it just drains; after opt-in each beat snaps it back.
    let tmout = 60 - t / 1000
    if (enabled) {
      let lastBeat = T.clickAt
      for (const b of beats) if (t >= b) lastBeat = b
      const sinceBeat = (t - lastBeat) / 1000
      if (t < beats[0]) tmout = 60 - t / 1000
      else tmout = 60 - sinceBeat * 0.9
    }
    tmout = clamp(tmout, 41, 60)
    el.tmoutTxt.textContent = Math.round(tmout) + ' s'
    el.tmoutFill.style.width = ((tmout / 60) * 100).toFixed(1) + '%'
    el.tmoutFill.classList.toggle('danger', !enabled && t > 1200)

    // heart thump on each beat
    let thump = 0
    for (const b of beats) {
      if (enabled && t >= b && t - b < 550) thump = Math.max(thump, pulse((t - b) / 550))
    }
    // also a small confirmation thump on click
    if (t >= T.clickAt && t - T.clickAt < 450) thump = Math.max(thump, pulse((t - T.clickAt) / 450))
    el.heart.classList.toggle('beat', thump > 0.35)
    el.heart.style.transform = thump > 0 ? 'scale(' + (1 + 0.18 * thump).toFixed(3) + ')' : ''

    // flying Enter packet: heart -> terminal on each beat
    if (recent >= 0 && enabled) {
      const p = easeInOut(seg(t, recent, recent + T.packetLen))
      const x = g.x1 + (50 - g.x1) * p
      const y = g.y1 + (g.termTop + 18 - g.y1) * p
      el.packet.style.left = x.toFixed(2) + '%'
      el.packet.style.top = y.toFixed(2) + '%'
      el.packet.style.opacity = (Math.sin(Math.PI * clamp(p, 0, 1)) * vis).toFixed(3)
    } else {
      el.packet.style.opacity = 0
    }

    // flash + badge on each beat
    let flash = 0
    let badge = 0
    for (const b of beats) {
      if (enabled && t >= b) {
        flash = Math.max(flash, pulse(seg(t, b, b + T.flashLen)))
        const on = easeOut(seg(t, b + 250, b + 550)) * (1 - easeInOut(seg(t, b + 250 + T.badgeLen, b + 550 + T.badgeLen)))
        badge = Math.max(badge, on)
      }
    }
    el.flash.style.opacity = (flash * 0.9 * vis).toFixed(3)
    el.badge.style.opacity = (badge * vis).toFixed(3)
    el.badge.style.transform = 'translate(-50%,-50%) scale(' + (0.8 + 0.2 * badge).toFixed(3) + ')'

    // prompt echo shimmer right after a beat (suppressed echo)
    if (recent >= 0 && enabled) {
      const e = seg(t, recent + 300, recent + 900)
      el.echo.textContent = e > 0 && e < 1 ? '(prompt redrawn · echo suppressed)' : ''
      el.echo.style.opacity = e > 0 && e < 1 ? ((1 - e) * 0.9 * vis).toFixed(3) : 0
    } else {
      el.echo.textContent = ''
    }
    el.caret.style.opacity = (0.4 + 0.6 * Math.abs(Math.sin(t / 300)) * vis).toFixed(3)

    // note flips once the heart is on
    el.note.innerHTML = enabled
      ? '<span class="eb-ka-dim"># heartbeat on: idle 3 s → Enter → TMOUT resets</span>'
      : '<span class="eb-ka-dim"># idle… SSH keepalive (10 s) holds the socket, TMOUT still drains</span>'
  }

  const reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    frame(T.beat2At + 700)
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
