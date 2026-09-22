/**
 * Animated banner for the "Electerm MCP Server" blog post.
 *
 * Everything is generated DOM + CSS — no image, no GIF, no canvas: a light
 * dotted backdrop, an electerm window (tab bar + session control bar +
 * terminal), a docked MCP client panel, and the SSE wire between them.
 *
 * The story, in two beats:
 *   1. the client asks "list my tabs and check disk on prod-web-01", a
 *      `tools/call list_electerm_tabs` card lands, the terminal types
 *      `df -h / | tail -1` and prints its output, the tool result returns
 *      `exitCode 0`;
 *   2. the client calls `electerm_sftp_list /etc/nginx`, rows stream into
 *      the terminal/SFTP view, and the assistant summarizes.
 *
 * A pulse travels along the wire on every beat so the banner reads as alive
 * even at thumbnail size.
 *
 * Mount points: any element carrying [data-eb-banner]:
 *   data-eb-banner="hero"  -> headline + window (blog post page)
 *   data-eb-banner="card"  -> window only       (blog index thumbnail)
 * Every banner script on the blog index is loaded for every card, so a mount
 * also has to match data-eb-banner-src — otherwise the first script to run
 * would claim every card.
 *
 * Layout is expressed in `em`, root font-size is 1% of banner width, so one
 * design scales from hero to card.
 */

const STYLE_ID = 'eb-mcp-style'

// One full pass of the story, in ms.
const PERIOD = 11000

const T = {
  winFrom: 0,
  winTo: 600,
  promptFrom: 700, // client question types in
  promptTo: 2200,
  sendFrom: 2280, // ... and is sent
  tool1From: 2600, // tools/call list_electerm_tabs card
  tool1To: 3200,
  cmd1From: 3300, // terminal types df -h
  cmd1To: 4500,
  out1From: 4600, // ... and prints output
  out1To: 5100,
  res1From: 5200, // tool result exitCode 0
  res1To: 5700,
  tool2From: 5900, // tools/call electerm_sftp_list
  tool2To: 6400,
  rowsFrom: 6500, // file rows stream in
  rowsTo: 7700,
  sumFrom: 7900, // summary streams
  sumTo: 8800,
  fadeFrom: 9900,
  fadeTo: 10800
}

const PROMPT = 'list my tabs and check disk on prod-web-01'
const CMD1 = 'df -h / | tail -1'
const OUT1 = '/dev/vda1   40G   17G   21G  45% /'
const TOOL2_ARG = '{ "remotePath": "/etc/nginx" }'
const ROWS = [
  'nginx.conf        2.1 KB',
  'sites-enabled/    dir',
  'ssl/              dir'
]
const SUMMARY = '2 hosts ok · 45% used · nginx.conf unchanged'

const CSS = `
.eb-mcp {
  --m-main: #121214;
  --m-dark: #000;
  --m-text: #ddd;
  --m-dim: #888;
  --m-term-bg: #20111b;
  --m-term-fg: #bbbbbb;
  --m-green: #19f9d8;
  --m-blue: #6fc1ff;
  --m-cursor: #b5bd68;
  --m-accent: #2563eb;
  --m-violet: #7c3aed;
  --m-pink: #ec4899;
  --m-ok: #16a34a;
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: var(--radius-lg, 12px);
  border: 1px solid var(--color-border, #d9e2f0);
  background: linear-gradient(135deg, #e8f1ff 0%, #f0eaff 50%, #fdf0f6 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.3;
  isolation: isolate;
  -webkit-font-smoothing: antialiased;
}
.eb-mcp-deco { position: absolute; inset: 0; pointer-events: none; }
.eb-mcp-dots {
  position: absolute; inset: -6em;
  background-image: radial-gradient(rgba(37,99,235,.20) 0.18em, transparent 0.18em);
  background-size: 4.2em 4.2em;
  animation: eb-mcp-drift 34s linear infinite;
}
@keyframes eb-mcp-drift { to { transform: translate3d(4.2em, 4.2em, 0); } }
.eb-mcp-blob { position: absolute; border-radius: 50%; background: rgba(255,255,255,.62); }
.eb-mcp-blob-a { width: 30em; height: 30em; right: -10em; top: -12em; }
.eb-mcp-blob-b { width: 24em; height: 24em; left: -8em; bottom: -10em; }

.eb-mcp-head { position: absolute; left: 5em; right: 5em; top: 2.6em; }
.eb-mcp-badge {
  display: inline-block; font-size: 1.4em; font-weight: 800; letter-spacing: .14em;
  color: #fff; background: linear-gradient(96deg, #2563eb, #7c3aed 55%, #ec4899);
  border-radius: 999px; padding: 0.35em 1.1em;
}
.eb-mcp-h1 { margin: 0.25em 0 0; font-size: 3.4em; font-weight: 800; letter-spacing: -0.025em; color: #0f172a; line-height: 1.02; }
.eb-mcp-h1 em { font-style: normal; background: linear-gradient(96deg, #2563eb, #7c3aed 52%, #ec4899); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.eb-mcp-sub { margin: 0.45em 0 0; font-size: 1.5em; color: #475569; max-width: 66em; }
.eb-mcp-sub b { color: #0f172a; }
.eb-mcp-sub code { font-family: Menlo, Monaco, monospace; font-size: .92em; background: rgba(37,99,235,.10); border-radius: .3em; padding: .05em .35em; color: #1d4ed8; }

.eb-mcp-app {
  position: absolute; left: 50%; bottom: 4.6%; transform: translateX(-50%);
  width: 92em; border-radius: 0.9em; overflow: hidden;
  background: var(--m-term-bg);
  box-shadow: 0 1.3em 2.6em rgba(15,23,42,.32), 0 0 2.4em rgba(124,58,237,.28);
}
.eb-mcp-tabbar { display: flex; align-items: stretch; height: 2.6em; padding: 0 0.5em; background: var(--m-dark); font-size: 1.3em; }
.eb-mcp-tab { display: flex; align-items: center; gap: .45em; padding: 0 1em; color: var(--m-dim); white-space: nowrap; border-radius: .21em .21em 0 0; }
.eb-mcp-tab.is-active { background: var(--m-main); color: var(--m-text); font-weight: 700; }
.eb-mcp-dot { width: .4em; height: .4em; border-radius: 50%; background: #06d6a0; }
.eb-mcp-pill { background: #08c; color: #fff; border-radius: .72em .14em .14em .72em; height: 1.43em; line-height: 1.43em; padding: 0 .35em; }
.eb-mcp-tabname { overflow: hidden; text-overflow: ellipsis; }
.eb-mcp-live { margin-left: auto; align-self: center; font-size: .85em; color: #06d6a0; border: 1px solid rgba(6,214,160,.5); border-radius: 999px; padding: .15em .7em; white-space: nowrap; }
.eb-mcp-live i { display: inline-block; width: .55em; height: .55em; border-radius: 50%; background: #06d6a0; margin-right: .4em; animation: eb-mcp-blinkdot 1.2s ease-in-out infinite; }
@keyframes eb-mcp-blinkdot { 0%,100% { opacity: .35; } 50% { opacity: 1; } }

.eb-mcp-ctl { display: flex; align-items: center; gap: 1em; height: 2.7em; padding: 0 1em; background: var(--m-main); color: var(--m-text); font-size: 1.15em; }
.eb-mcp-ctl .on { color: #fff; box-shadow: inset 0 -1px 0 0 var(--m-dim); }
.eb-mcp-chip { border: 1px solid #33333a; border-radius: .4em; padding: .1em .6em; color: var(--m-dim); font-size: .92em; }
.eb-mcp-chip.hot { color: var(--m-green); border-color: rgba(25,249,216,.5); }

.eb-mcp-body { display: grid; grid-template-columns: 1.25fr 1fr; min-height: 0; }
.eb-mcp-term { padding: 1em 1.1em 1.1em; font-family: Menlo, Monaco, 'DejaVu Sans Mono', monospace; font-size: 1.85em; line-height: 1.45; color: var(--m-term-fg); background: var(--m-term-bg); overflow: hidden; }
.eb-mcp-line { white-space: pre-wrap; word-break: break-all; }
.eb-mcp-ps1 { color: var(--m-green); }
.eb-mcp-path { color: var(--m-blue); }
.eb-mcp-caret { display: inline-block; width: .6em; height: 1.15em; margin-left: .05em; vertical-align: -.22em; background: var(--m-cursor); }
.eb-mcp-out, .eb-mcp-row, .eb-mcp-res { opacity: 0; }
.eb-mcp-row { color: var(--m-blue); }
.eb-mcp-resline { color: #06d6a0; }

.eb-mcp-side { background: #17171b; border-left: 1px solid #000; padding: 1em; display: flex; flex-direction: column; gap: .7em; overflow: hidden; }
.eb-mcp-q { align-self: flex-end; max-width: 95%; background: #232329; border: 1px solid #33333a; color: #fff; border-radius: .6em; padding: .5em .7em; font-size: 1.35em; }
.eb-mcp-qcaret { display: inline-block; width: .07em; height: 1.05em; background: #fff; vertical-align: -.15em; animation: eb-mcp-blink 1.06s steps(1,end) infinite; }
@keyframes eb-mcp-blink { 0%,50% { opacity: 1; } 50.01%,100% { opacity: 0; } }
.eb-mcp-tool { background: #101014; border: 1px solid #33333a; border-radius: .55em; padding: .55em .65em; opacity: 0; }
.eb-mcp-toolname { font-family: Menlo, Monaco, monospace; font-size: 1.25em; color: var(--m-green); }
.eb-mcp-toolarg { font-family: Menlo, Monaco, monospace; font-size: 1.12em; color: #9aa4b2; white-space: pre-wrap; word-break: break-all; }
.eb-mcp-status { display: inline-block; font-size: 1.1em; font-weight: 700; border-radius: 999px; padding: .15em .7em; margin-top: .4em; background: #2a2a31; color: #9aa4b2; }
.eb-mcp-status.ok { background: rgba(22,163,74,.18); color: #4ade80; }
.eb-mcp-answer { font-size: 1.3em; color: #d7d7db; opacity: 0; }
.eb-mcp-answer b { color: #fff; }

.eb-mcp-wire { display: flex; align-items: center; gap: .6em; padding: .45em .9em; background: #0c0c0f; border-top: 1px solid #000; font-family: Menlo, Monaco, monospace; font-size: 1.15em; color: #8b93a3; overflow: hidden; white-space: nowrap; }
.eb-mcp-track { position: relative; flex: 1; height: .28em; border-radius: 999px; background: #26262c; overflow: hidden; }
.eb-mcp-pulse { position: absolute; top: 0; bottom: 0; width: 22%; border-radius: 999px; background: linear-gradient(90deg, #2563eb, #7c3aed, #ec4899); }
.eb-mcp-method { color: var(--m-green); }
.eb-mcp-code { color: #4ade80; }

.eb-mcp[data-variant='card'] .eb-mcp-head { display: none; }
.eb-mcp[data-variant='card'] .eb-mcp-app { bottom: auto; top: 50%; transform: translate(-50%,-50%); }
.eb-mcp[data-variant='card'] .eb-mcp-tabbar { font-size: 1.7em; }
.eb-mcp[data-variant='card'] .eb-mcp-ctl { font-size: 1.45em; }
.eb-mcp[data-variant='card'] .eb-mcp-term { font-size: 2.3em; }
.eb-mcp[data-variant='card'] .eb-mcp-q { font-size: 1.7em; }
.eb-mcp[data-variant='card'] .eb-mcp-toolname { font-size: 1.55em; }
.eb-mcp[data-variant='card'] .eb-mcp-toolarg { font-size: 1.4em; }
.eb-mcp[data-variant='card'] .eb-mcp-answer { font-size: 1.6em; }
.eb-mcp[data-variant='card'] .eb-mcp-wire { font-size: 1.45em; }

@media (prefers-reduced-motion: reduce) {
  .eb-mcp-dots, .eb-mcp-live i, .eb-mcp-qcaret { animation: none !important; }
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

function prompt (host) {
  return '<span class="eb-mcp-ps1">zxd@' + host + '</span>:<span class="eb-mcp-path">~</span>$&nbsp;'
}

function markup (variant) {
  const head = variant === 'card'
    ? ''
    : '<div class="eb-mcp-head">' +
      '<span class="eb-mcp-badge">MCP</span>' +
      '<h2 class="eb-mcp-h1">Your terminal, <em>as an API</em></h2>' +
      '<p class="eb-mcp-sub">The <b>MCP Server widget</b> exposes tabs, commands &amp; SFTP at <code>http://127.0.0.1:30837/mcp</code> — any assistant can <b>run</b>, not just chat.</p>' +
      '</div>'
  const rows = ROWS.map((r, i) => '<div class="eb-mcp-line eb-mcp-row" data-row="' + i + '">' + r + '</div>').join('')
  return (
    '<div class="eb-mcp-deco"><span class="eb-mcp-blob eb-mcp-blob-a"></span>' +
    '<span class="eb-mcp-blob eb-mcp-blob-b"></span><span class="eb-mcp-dots"></span></div>' +
    head +
    '<div class="eb-mcp-app">' +
    '<div class="eb-mcp-tabbar">' +
    '<span class="eb-mcp-tab is-active"><span class="eb-mcp-dot"></span><span class="eb-mcp-pill">1</span><span class="eb-mcp-tabname">zxd@prod-web-01:22</span></span>' +
    '<span class="eb-mcp-tab"><span class="eb-mcp-dot"></span><span class="eb-mcp-pill">2</span><span class="eb-mcp-tabname">zxd@db-01:22</span></span>' +
    '<span class="eb-mcp-live"><i></i>MCP :30837</span>' +
    '</div>' +
    '<div class="eb-mcp-ctl"><span class="on">SSH</span><span>SFTP</span>' +
    '<span class="eb-mcp-chip" data-chip="exec">exec: exitCode</span>' +
    '<span class="eb-mcp-chip" data-chip="sftp">sftp: list</span></div>' +
    '<div class="eb-mcp-body">' +
    '<div class="eb-mcp-term">' +
    '<div class="eb-mcp-line">' + prompt('prod-web-01') + '<span class="eb-mcp-cmd"></span><span class="eb-mcp-caret" data-caret="cmd"></span></div>' +
    '<div class="eb-mcp-line eb-mcp-out">' + OUT1 + '</div>' +
    rows +
    '<div class="eb-mcp-line eb-mcp-res"><span class="eb-mcp-resline">✓ exit 0 · 212ms · mode=exec</span><span class="eb-mcp-caret" data-caret="end"></span></div>' +
    '</div>' +
    '<div class="eb-mcp-side">' +
    '<div class="eb-mcp-q"><span class="eb-mcp-qtext"></span><span class="eb-mcp-qcaret"></span></div>' +
    '<div class="eb-mcp-tool" data-tool="t1"><div class="eb-mcp-toolname">tools/call list_electerm_tabs</div>' +
    '<div class="eb-mcp-toolarg">→ 2 tabs · prod-web-01 active</div>' +
    '<span class="eb-mcp-status" data-status="s1">working…</span></div>' +
    '<div class="eb-mcp-tool" data-tool="t2"><div class="eb-mcp-toolname">tools/call electerm_sftp_list</div>' +
    '<div class="eb-mcp-toolarg">' + TOOL2_ARG.replace(/</g, '&lt;') + '</div>' +
    '<span class="eb-mcp-status" data-status="s2">working…</span></div>' +
    '<div class="eb-mcp-answer"><b>Assistant:</b> <span class="eb-mcp-sum"></span></div>' +
    '</div>' +
    '</div>' +
    '<div class="eb-mcp-wire"><span class="eb-mcp-method">POST /mcp</span><span class="eb-mcp-track"><span class="eb-mcp-pulse"></span></span><span class="eb-mcp-code" data-wire="code">200 · SSE</span></div>' +
    '</div>'
  )
}

function mount (host) {
  if (host.getAttribute('data-eb-mounted')) return
  host.setAttribute('data-eb-mounted', '1')

  const variant = host.getAttribute('data-eb-banner') === 'card' ? 'card' : 'hero'
  const root = document.createElement('div')
  root.className = 'eb-mcp'
  root.setAttribute('data-variant', variant)
  root.setAttribute('role', 'img')
  root.setAttribute('aria-label', 'electerm MCP Server: an AI client calls list tabs, runs df in the terminal, lists /etc/nginx over SFTP, and summarizes')
  root.innerHTML = markup(variant)
  host.appendChild(root)

  const el = {
    app: root.querySelector('.eb-mcp-app'),
    qtext: root.querySelector('.eb-mcp-qtext'),
    qcaret: root.querySelector('.eb-mcp-qcaret'),
    t1: root.querySelector('[data-tool="t1"]'),
    t2: root.querySelector('[data-tool="t2"]'),
    s1: root.querySelector('[data-status="s1"]'),
    s2: root.querySelector('[data-status="s2"]'),
    cmd: root.querySelector('.eb-mcp-cmd'),
    caretCmd: root.querySelector('[data-caret="cmd"]'),
    caretEnd: root.querySelector('[data-caret="end"]'),
    out: root.querySelector('.eb-mcp-out'),
    rows: Array.prototype.slice.call(root.querySelectorAll('.eb-mcp-row')),
    res: root.querySelector('.eb-mcp-res'),
    answer: root.querySelector('.eb-mcp-answer'),
    sum: root.querySelector('.eb-mcp-sum'),
    pulse: root.querySelector('.eb-mcp-pulse'),
    wireCode: root.querySelector('[data-wire="code"]'),
    chipExec: root.querySelector('[data-chip="exec"]'),
    chipSftp: root.querySelector('[data-chip="sftp"]')
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

  const setOp = (node, v) => {
    if (node) node.style.opacity = v.toFixed(3)
  }

  function frame (t) {
    const gone = 1 - easeInOut(seg(t, T.fadeFrom, T.fadeTo))
    const blink = Math.floor(t / 460) % 2 === 0

    const winP = easeOut(seg(t, T.winFrom, T.winTo))
    el.app.style.opacity = (winP * gone).toFixed(3)
    el.app.style.transform = 'translateX(-50%) translateY(' + ((1 - winP) * 1.8).toFixed(3) + 'em)'

    // client question types in, caret blinks until sent
    const typed = Math.round(easeOut(seg(t, T.promptFrom, T.promptTo)) * PROMPT.length)
    if (el.qtext && el.qtext.textContent !== PROMPT.slice(0, typed)) el.qtext.textContent = PROMPT.slice(0, typed)
    const sent = seg(t, T.sendFrom, T.sendFrom + 200) > 0
    if (el.qcaret) el.qcaret.style.opacity = (!sent && t >= T.promptFrom && blink) ? '1' : '0'

    // tool card 1
    const t1p = easeOut(seg(t, T.tool1From, T.tool1To))
    setOp(el.t1, t1p * gone)
    const res1 = seg(t, T.res1From, T.res1To) > 0.5
    if (el.s1) {
      el.s1.textContent = res1 ? '✓ done' : 'working…'
      el.s1.classList.toggle('ok', res1)
    }

    // terminal types df, output + result appear
    const c1 = Math.round(easeOut(seg(t, T.cmd1From, T.cmd1To)) * CMD1.length)
    if (el.cmd && el.cmd.textContent !== CMD1.slice(0, c1)) el.cmd.textContent = CMD1.slice(0, c1)
    const outP = easeOut(seg(t, T.out1From, T.out1To))
    setOp(el.out, outP * gone)
    const cmdDone = seg(t, T.cmd1To, T.cmd1To + 150) > 0
    if (el.caretCmd) el.caretCmd.style.opacity = (!cmdDone && t >= T.cmd1From && blink ? 1 : (cmdDone ? 0 : 1)) * gone
    setOp(el.res, easeOut(seg(t, T.res1From, T.res1To)) * gone)
    if (el.caretEnd) el.caretEnd.style.opacity = (res1 && blink ? 1 : 0) * gone
    if (el.chipExec) el.chipExec.classList.toggle('hot', t >= T.cmd1From && t < T.tool2From)

    // tool card 2 + sftp rows stream
    const t2p = easeOut(seg(t, T.tool2From, T.tool2To))
    setOp(el.t2, t2p * gone)
    const rowsDone = seg(t, T.rowsTo, T.rowsTo + 150) > 0.5
    if (el.s2) {
      el.s2.textContent = rowsDone ? '✓ 3 entries' : 'working…'
      el.s2.classList.toggle('ok', rowsDone)
    }
    el.rows.forEach((row, i) => {
      const from = T.rowsFrom + i * ((T.rowsTo - T.rowsFrom) / el.rows.length)
      setOp(row, easeOut(seg(t, from, from + 350)) * gone)
    })
    if (el.chipSftp) el.chipSftp.classList.toggle('hot', t >= T.tool2From && t < T.sumTo)

    // summary streams
    const sump = Math.round(easeOut(seg(t, T.sumFrom, T.sumTo)) * SUMMARY.length)
    if (el.sum && el.sum.textContent !== SUMMARY.slice(0, sump)) el.sum.textContent = SUMMARY.slice(0, sump)
    setOp(el.answer, easeOut(seg(t, T.sumFrom, T.sumFrom + 300)) * gone)

    // wire pulse: travels left→right, faster during tool beats
    const hot = (t >= T.tool1From && t <= T.res1To) || (t >= T.tool2From && t <= T.rowsTo)
    const speed = hot ? 1400 : 2600
    const pp = ((t % speed) / speed)
    if (el.pulse) el.pulse.style.left = (pp * 100 - 22).toFixed(2) + '%'
    if (el.wireCode) el.wireCode.textContent = hot ? '200 · event: message' : '200 · SSE'
  }

  const reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    frame(T.sumTo + 200)
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
