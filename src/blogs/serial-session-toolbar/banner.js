/**
 * Animated banner for the serial session toolbar post.
 *
 * DOM + CSS only, no image, no canvas. One electerm window with a serial tab:
 *   1. received data in ASCII in the terminal;
 *   2. the sliders icon is clicked and the toolbar panel opens beside it;
 *   3. DTR is toggled, the CTS / DSR lights follow, the view switches to HEX,
 *      break pulses, and a raw HEX send arrives as a new line of bytes.
 *
 * The app palette comes from electerm's shipped dark defaults: main #121214,
 * terminal background #20111b, foreground #bbbbbb, cursor #b5bd68, primary
 * #08c, success #06D6A0.
 *
 * Mount points: any [data-eb-banner] whose data-eb-banner-src is this module.
 * The index loads every post's script, so the src has to be checked or the
 * first script to run would claim every card.
 */

const STYLE_ID = 'eb-ss-style'

const PERIOD = 12000

const T = {
  winFrom: 300,
  winTo: 1100,
  chip1From: 400,
  chip1To: 900,
  ptrFrom: 1300,
  sliderAt: 2050,
  openFrom: 2100,
  openTo: 2700,
  dtrAt: 2850,
  chip2From: 3900,
  chip2To: 4400,
  ptrHexFrom: 3300,
  ptrHexTo: 3800,
  hexAt: 3850,
  hexFrom: 3900,
  hexTo: 4500,
  brkPtrFrom: 4700,
  brkPtrTo: 5100,
  brkAt: 5150,
  sendPtrFrom: 5600,
  sendPtrTo: 6000,
  typeFrom: 6000,
  typeTo: 6700,
  sendAt: 6800,
  chip3From: 7000,
  chip3To: 7500,
  ptrOutFrom: 7000,
  ptrOutTo: 7500,
  fadeFrom: 11200,
  fadeTo: 11900
}

const CSS = `
.eb-ss {
  position: relative; display: block; width: 100%; aspect-ratio: 16 / 9;
  overflow: hidden; border-radius: var(--radius-lg, 12px);
  border: 1px solid var(--color-border, #d9e2f0);
  background: linear-gradient(135deg, #f2f7ff 0%, #e2edff 55%, #d3e2fb 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.3; isolation: isolate; -webkit-font-smoothing: antialiased;
}
.eb-ss-dots { position: absolute; inset: 0; pointer-events: none;
  background-image: radial-gradient(rgba(44,88,158,.22) .12em, transparent .12em);
  background-size: 4em 4em; opacity: .5; }
.eb-ss-head { position: absolute; left: 4.5em; right: 4.5em; top: 2.6em;
  pointer-events: none; z-index: 3; }
.eb-ss[data-variant="card"] .eb-ss-head { display: none; }
.eb-ss-brand { display: inline-block; font-size: 1.3em; font-weight: 800;
  color: #2c589e; letter-spacing: .04em; }
.eb-ss-h1 { margin: .25em 0 0; font-size: 3em; font-weight: 800; line-height: 1.05;
  letter-spacing: -.025em; color: #162244; }
.eb-ss-h1 em { font-style: normal; color: #2c589e; }
.eb-ss-sub { margin: .5em 0 0; max-width: 66em; font-size: 1.35em; color: #5a6b8c; }
.eb-ss-chip-slot { position: absolute; right: 2em; top: .6em; width: 34em;
  height: 3em; z-index: 4; pointer-events: none; }
.eb-ss[data-variant="card"] .eb-ss-chip-slot { display: none; }
.eb-ss-chip { position: absolute; top: 0; right: 0; white-space: nowrap;
  background: #fff; border: 1px solid #b9cdee; border-radius: 999px;
  padding: .45em 1.1em; font-size: 1.2em; font-weight: 700; color: #2c589e;
  box-shadow: 0 .4em 1.4em rgba(44,88,158,.14); }
.eb-ss-window {
  position: absolute; left: 50%; bottom: 3em; width: 84em; max-width: 92%;
  transform: translateX(-50%); background: #121214; overflow: hidden;
  border: 1px solid rgba(44,88,158,.35); border-radius: 1.1em;
  box-shadow: 0 2em 5em rgba(22,34,68,.3);
}
.eb-ss[data-variant="card"] .eb-ss-window {
  width: 92em; max-width: 94%; top: 50%; bottom: auto;
  transform: translate(-50%, -50%);
}
.eb-ss-bar { display: flex; align-items: center; gap: .9em; padding: .75em 1.2em;
  background: #1d1f26; color: #9aa3b2; }
.eb-ss-bar-dots { display: flex; gap: .5em; }
.eb-ss-bar-dots i { display: block; width: .85em; height: .85em; border-radius: 50%; }
.eb-ss-bar-title { font-size: 1.15em; }
.eb-ss-bar-title b { color: #d8deea; font-weight: 600; }
.eb-ss-bar-tag { margin-left: auto; font-size: 1.05em; color: #06D6A0; }
.eb-ss-body { display: flex; height: 34em; min-height: 34em; }
.eb-ss[data-variant="card"] .eb-ss-body { height: 41em; min-height: 41em; }
.eb-ss-term { flex: 1; min-width: 0; display: flex; flex-direction: column;
  background: #20111b; }
.eb-ss-sessbar { display: flex; align-items: center; flex: none; height: 3em;
  padding: 0 .9em; background: #18181b; color: #9aa3b2; }
.eb-ss-tab { font-size: 1.05em; color: #d8deea; }
.eb-ss-icons { display: flex; align-items: center; gap: .9em; margin-left: auto; }
.eb-ss-ic { font-size: 1.2em; }
.eb-ss-slider { position: relative; display: inline-flex; align-items: center;
  justify-content: center; width: 1.8em; height: 1.8em; border-radius: .3em;
  font-size: 1.2em; color: #9aa3b2; }
.eb-ss-ripple { position: absolute; left: 50%; top: 50%; width: 1.2em;
  height: 1.2em; margin: -.6em 0 0 -.6em; border: 2px solid rgba(6,214,160,.85);
  border-radius: 50%; transform: scale(0); opacity: 0; }
.eb-ss-screen { position: relative; flex: 1; overflow: hidden; }
.eb-ss-screen-inner { position: absolute; inset: 0; padding: 1.2em 1.4em;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 1.14em; line-height: 1.75; white-space: pre; color: #bbbbbb; }
.eb-ss-dim { color: #77707a; }
.eb-ss-g { color: #06D6A0; }
.eb-ss-blue { color: #6fc1ff; }
.eb-ss-caret { color: #b5bd68; }
.eb-ss-mark { background: #857f83; color: #fff; }
.eb-ss-reply { position: absolute; left: 1.4em; top: 7.4em; display: none;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 1.14em; line-height: 1.75; white-space: pre; color: #bbbbbb; }
.eb-ss-panel { width: 30em; flex: none; background: #1b1d24; color: #ddd;
  border-left: 1px solid #30333d; padding: 1.1em 1.15em; overflow: hidden; }
.eb-ss-ptitle { font-size: 1.2em; font-weight: 700; color: #f2f4f8; }
.eb-ss-ptitle span { font-size: .8em; font-weight: 500; color: #9aa3b2; }
.eb-ss-row { display: flex; flex-wrap: nowrap; gap: .5em; margin-top: .7em; }
.eb-ss-btn, .eb-ss-mode { flex: 1; text-align: center; white-space: nowrap;
  font-size: 1.02em; padding: .32em .1em; border: 1px solid #3a3d47;
  border-radius: .35em; background: #262932; color: #9aa3b2; }
.eb-ss-leds { display: flex; gap: 1em; margin-top: .75em; font-size: 1.02em;
  color: #9aa3b2; }
.eb-ss-hr { height: 1px; background: #30333d; margin: .8em 0; }
.eb-ss-label { font-size: 1em; color: #9aa3b2; }
.eb-ss-check { margin-top: .55em; font-size: 1em; color: #c8ccd5; }
.eb-ss-check b { color: #e6e9f0; background: #262932; border-radius: .25em;
  padding: 0 .35em; font-weight: 600; }
.eb-ss-send { display: flex; align-items: center; gap: .4em; }
.eb-ss-select { font-size: .98em; padding: .32em .4em; white-space: nowrap;
  background: #262932; border: 1px solid #3a3d47; border-radius: .3em;
  color: #c8ccd5; }
.eb-ss-input { flex: 1; min-width: 0; overflow: hidden; white-space: nowrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: .98em; padding: .32em .5em; background: #121214;
  border: 1px solid #3a3d47; border-radius: .3em; color: #e6e9f0; }
.eb-ss-sendbtn { font-size: .98em; padding: .34em .7em; white-space: nowrap;
  background: #08c; color: #fff; border-radius: .3em; }
.eb-ss-cursor { display: none; margin-top: .6em; font-size: .95em; color: #9aa3b2; }
.eb-ss-hint { margin-top: .6em; font-size: .9em; line-height: 1.4; color: #777c8a; }
.eb-ss-pointer { position: absolute; width: 1.7em; height: 2.4em; z-index: 6;
  background: #fff; pointer-events: none;
  clip-path: polygon(0 0, 0 100%, 28% 72%, 52% 100%, 70% 88%, 46% 62%, 100% 62%);
  filter: drop-shadow(0 .15em .25em rgba(0,0,0,.6)); }
`

function injectStyle () {
  if (document.getElementById(STYLE_ID)) return
  const el = document.createElement('style')
  el.id = STYLE_ID
  el.textContent = CSS
  document.head.appendChild(el)
}

function markup (variant) {
  const head = variant === 'hero'
    ? `<div class="eb-ss-head">
        <span class="eb-ss-brand">electerm 5.11.8 · serial session</span>
        <h2 class="eb-ss-h1">Serial, <em>under control</em></h2>
        <p class="eb-ss-sub">Control lines, byte views and raw send — all in one panel.</p>
      </div>`
    : ''
  return `
    <div class="eb-ss-dots"></div>
    ${head}
    <div class="eb-ss-chip-slot">
      <div class="eb-ss-chip" data-chip="a">plain text</div>
      <div class="eb-ss-chip" data-chip="b">control lines</div>
      <div class="eb-ss-chip" data-chip="c">bytes in, bytes out</div>
    </div>
    <div class="eb-ss-window">
      <div class="eb-ss-bar">
        <span class="eb-ss-bar-dots"><i style="background:#f87171"></i><i style="background:#fbbf24"></i><i style="background:#34d399"></i></span>
        <span class="eb-ss-bar-title">electerm <b>› serial · /dev/ttyUSB0</b></span>
        <span class="eb-ss-bar-tag">9600 8N1</span>
      </div>
      <div class="eb-ss-body">
        <div class="eb-ss-term">
          <div class="eb-ss-sessbar">
            <span class="eb-ss-tab">serial · /dev/ttyUSB0</span>
            <span class="eb-ss-icons">
              <span class="eb-ss-ic">⌁</span>
              <span class="eb-ss-ic">⤢</span>
              <span class="eb-ss-slider" data-el="slider">≡<span class="eb-ss-ripple" data-el="ripple"></span></span>
            </span>
          </div>
          <div class="eb-ss-screen">
            <div class="eb-ss-screen-inner" data-el="ascii"><span class="eb-ss-dim">$</span> serial /dev/ttyUSB0
<span class="eb-ss-g">OK</span>  device ready
SENSOR 23.5C  48%RH
<span class="eb-ss-g">ACK</span> 012A
<span class="eb-ss-dim">-- bytes arriving --</span>
<span class="eb-ss-g">➜</span> <span class="eb-ss-caret">▊</span></div>
            <div class="eb-ss-screen-inner" data-el="hex"><span class="eb-ss-mark">4F</span> 4B 0D 53 45 4E 53 4F 52 20 32 33 2E  <span class="eb-ss-blue">|OK.SENSOR 23.</span>
35 43 20 34 38 25 52 48 0D 41 43 4B 20  <span class="eb-ss-blue">|5C 48%RH.ACK </span>
30 31 32 41 0D 48 65 6C 6C 6F 0D       <span class="eb-ss-blue">|012A.Hello...</span></div>
            <div class="eb-ss-reply" data-el="reply">4F 4B 0D                                <span class="eb-ss-blue">|OK.</span></div>
          </div>
        </div>
        <div class="eb-ss-panel" data-el="panel">
          <div class="eb-ss-ptitle">Serial <span>toolbar</span></div>
          <div class="eb-ss-row">
            <span class="eb-ss-btn" data-el="dtr">DTR</span>
            <span class="eb-ss-btn" data-el="rts">RTS</span>
            <span class="eb-ss-btn" data-el="brk">⚡ Break</span>
          </div>
          <div class="eb-ss-leds">
            <span data-el="cts">● CTS</span>
            <span data-el="dsr">● DSR</span>
            <span data-el="dcd">● DCD</span>
          </div>
          <div class="eb-ss-hr"></div>
          <div class="eb-ss-label">Received data as</div>
          <div class="eb-ss-row">
            <span class="eb-ss-mode" data-mode="ascii">ASCII</span>
            <span class="eb-ss-mode" data-mode="hex" data-el="hexbtn">HEX</span>
            <span class="eb-ss-mode" data-mode="dec">DEC</span>
            <span class="eb-ss-mode" data-mode="bin">BIN</span>
          </div>
          <div class="eb-ss-check">☑ ASCII column</div>
          <div class="eb-ss-check">☐ Frame start <b>10</b></div>
          <div class="eb-ss-hr"></div>
          <div class="eb-ss-send">
            <span class="eb-ss-select">HEX ▾</span>
            <span class="eb-ss-input" data-el="input">1B 41 0D</span>
            <span class="eb-ss-sendbtn" data-el="send">Send</span>
          </div>
          <div class="eb-ss-cursor" data-el="cursor">Byte at the cursor: #12 0x4F 79 01001111 'O'</div>
          <div class="eb-ss-hint">Frame bytes start a new line · arrows move the byte cursor</div>
        </div>
      </div>
      <div class="eb-ss-pointer" data-el="pointer"></div>
    </div>`
}

function seg (t, from, to) {
  if (t <= from) return 0
  if (t >= to) return 1
  return (t - from) / (to - from)
}

function easeOut (p) { return 1 - Math.pow(1 - p, 3) }
function easeInOut (p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2 }

function mount (host) {
  if (host.getAttribute('data-eb-mounted')) return
  host.setAttribute('data-eb-mounted', '1')

  const variant = host.getAttribute('data-eb-banner') === 'card' ? 'card' : 'hero'
  const root = document.createElement('div')
  root.className = 'eb-ss'
  root.setAttribute('data-variant', variant)
  root.setAttribute('role', 'img')
  root.setAttribute('aria-label', 'electerm serial session toolbar with control lines, hex view and raw send')
  root.innerHTML = markup(variant)
  host.appendChild(root)

  const q = (sel) => root.querySelector(sel)
  const el = {
    window: q('.eb-ss-window'),
    panel: q('[data-el="panel"]'),
    ascii: q('[data-el="ascii"]'),
    hex: q('[data-el="hex"]'),
    reply: q('[data-el="reply"]'),
    slider: q('[data-el="slider"]'),
    ripple: q('[data-el="ripple"]'),
    dtr: q('[data-el="dtr"]'),
    rts: q('[data-el="rts"]'),
    brk: q('[data-el="brk"]'),
    cts: q('[data-el="cts"]'),
    dsr: q('[data-el="dsr"]'),
    dcd: q('[data-el="dcd"]'),
    hexbtn: q('[data-el="hexbtn"]'),
    input: q('[data-el="input"]'),
    send: q('[data-el="send"]'),
    cursor: q('[data-el="cursor"]'),
    pointer: q('[data-el="pointer"]'),
    chips: [q('[data-chip="a"]'), q('[data-chip="b"]'), q('[data-chip="c"]')],
    modes: root.querySelectorAll('[data-mode]'),
    caret: q('.eb-ss-caret'),
    mark: q('.eb-ss-mark')
  }

  const targets = {}
  const typed = '48 65 6C 6C 6F 0D'
  let currentT = 0
  const baseTransform = variant === 'card'
    ? 'translate(-50%, -50%)'
    : 'translateX(-50%)'
  const center = (node, win) => {
    const r = node.getBoundingClientRect()
    return {
      x: ((r.left + r.width / 2 - win.left) / win.width) * 100,
      y: ((r.top + r.height / 2 - win.top) / win.height) * 100
    }
  }
  const panelWidth = (open) => {
    el.panel.style.width = (30 * open).toFixed(3) + 'em'
    el.panel.style.paddingLeft = (1.15 * open).toFixed(3) + 'em'
    el.panel.style.paddingRight = (1.15 * open).toFixed(3) + 'em'
    el.panel.style.borderLeftWidth = (open > 0 ? 1 : 0) + 'px'
  }
  const fit = () => {
    const w = root.clientWidth
    if (w) root.style.fontSize = (w / 100) + 'px'
    targets.home = { x: 90, y: 86 }
    // The slider is at the right edge of a full-width terminal before the
    // panel opens; the panel controls are 30em further left once it does.
    panelWidth(0)
    let win = el.window.getBoundingClientRect()
    if (!win.width) return
    targets.slider = center(el.slider, win)
    panelWidth(1)
    win = el.window.getBoundingClientRect()
    targets.sliderAfter = center(el.slider, win)
    for (const name of ['hexbtn', 'brk', 'send']) {
      targets[name] = center(el[name], win)
    }
    frame(currentT)
  }
  fit()
  if (window.ResizeObserver) {
    new window.ResizeObserver(fit).observe(root)
  } else {
    window.addEventListener('resize', fit)
  }

  function place (fromKey, toKey, from, to, t) {
    // a later segment must not pull the pointer back to its own start key
    // while that segment is still in the future
    if (t <= from) return
    const p = easeInOut(seg(t, from, to))
    const a = targets[fromKey] || targets.home
    const b = targets[toKey] || a
    // the arrow's tip is at its bottom-left, so lift it by its own height
    const tip = (el.pointer.getBoundingClientRect().height /
      el.window.getBoundingClientRect().height) * 100
    el.pointer.style.left = (a.x + (b.x - a.x) * p).toFixed(2) + '%'
    el.pointer.style.top = (a.y + (b.y - a.y) * p - tip).toFixed(2) + '%'
  }

  function setOn (node, on) {
    node.style.background = on ? '#08c' : '#262932'
    node.style.borderColor = on ? '#08c' : '#3a3d47'
    node.style.color = on ? '#fff' : '#9aa3b2'
  }

  function setMode (mode) {
    for (const node of el.modes) {
      const on = node.getAttribute('data-mode') === mode
      setOn(node, on)
    }
  }

  function frame (t) {
    currentT = t
    const winP = easeOut(seg(t, T.winFrom, T.winTo))
    el.window.style.opacity = winP.toFixed(3)
    el.window.style.transform = baseTransform + ' translateY(' +
      ((1 - winP) * 3).toFixed(3) + 'em)'

    const gone = easeInOut(seg(t, T.fadeFrom, T.fadeTo))
    root.style.opacity = (1 - gone).toFixed(3)

    panelWidth(easeOut(seg(t, T.openFrom, T.openTo)))

    const c1 = easeOut(seg(t, T.chip1From, T.chip1To)) *
      (1 - easeInOut(seg(t, T.ptrFrom, T.sliderAt)))
    const c2 = easeOut(seg(t, T.chip2From, T.chip2To)) *
      (1 - easeInOut(seg(t, T.brkPtrFrom, T.brkAt)))
    const c3 = easeOut(seg(t, T.chip3From, T.chip3To)) * (1 - gone)
    el.chips[0].style.opacity = c1.toFixed(3)
    el.chips[1].style.opacity = c2.toFixed(3)
    el.chips[2].style.opacity = c3.toFixed(3)

    const dtrOn = t >= T.dtrAt
    setOn(el.dtr, dtrOn)
    setOn(el.rts, true)
    el.cts.style.color = dtrOn ? '#06D6A0' : '#9aa3b2'
    el.dsr.style.color = dtrOn ? '#06D6A0' : '#9aa3b2'
    el.dcd.style.color = '#06D6A0'

    const hexP = easeInOut(seg(t, T.hexFrom, T.hexTo))
    el.ascii.style.opacity = (1 - hexP).toFixed(3)
    el.hex.style.opacity = hexP.toFixed(3)
    setMode(hexP >= 0.5 ? 'hex' : 'ascii')
    el.mark.style.visibility = hexP >= 0.5 ? 'visible' : 'hidden'

    const bp = seg(t, T.brkAt, T.brkAt + 300)
    const flashing = bp > 0 && bp < 1
    el.brk.style.background = flashing ? '#06D6A0' : '#262932'
    el.brk.style.color = flashing ? '#04121f' : '#9aa3b2'

    const n = Math.floor(seg(t, T.typeFrom, T.typeTo) * typed.length)
    el.input.textContent = n > 0 ? typed.slice(0, n) : '1B 41 0D'

    const sent = t >= T.sendAt
    el.reply.style.display = sent ? 'block' : 'none'
    el.cursor.style.display = sent ? 'block' : 'none'

    const greenIcon = hexP >= 0.5 || flashing
    el.slider.style.color = greenIcon ? '#06D6A0' : '#9aa3b2'

    place('home', 'slider', T.ptrFrom, T.sliderAt, t)
    place('slider', 'hexbtn', T.ptrHexFrom, T.ptrHexTo, t)
    place('hexbtn', 'brk', T.brkPtrFrom, T.brkPtrTo, t)
    place('brk', 'send', T.sendPtrFrom, T.sendPtrTo, t)
    // the panel pushes the sliders icon left while it opens; keep the arrow
    // on it until the pointer starts moving towards the HEX button
    if (t >= T.openFrom && t < T.ptrHexFrom && targets.sliderAfter) {
      const shift = easeOut(seg(t, T.openFrom, T.openTo))
      el.pointer.style.left = (targets.slider.x +
        (targets.sliderAfter.x - targets.slider.x) * shift).toFixed(2) + '%'
    }
    el.pointer.style.opacity = (seg(t, T.ptrFrom, T.ptrFrom + 400) *
      (1 - easeInOut(seg(t, T.ptrOutFrom, T.ptrOutTo)))).toFixed(3)

    const rp = seg(t, T.sliderAt, T.sliderAt + 700)
    el.ripple.style.transform = 'scale(' + (rp > 0 && rp < 1 ? (rp * 6).toFixed(3) : 0) + ')'
    el.ripple.style.opacity = (rp > 0 && rp < 1 ? 1 - rp : 0).toFixed(3)

    el.caret.style.opacity = Math.floor(t / 500) % 2 === 0 ? '1' : '0.15'
  }

  const state = { raf: null }
  const offset = variant === 'card' ? 7600 : 0
  if (offset) frame(offset)
  const start = performance.now()
  const tick = (now) => {
    frame((now - start + offset) % PERIOD)
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

  const reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    frame(7600)
  } else if (window.IntersectionObserver) {
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
