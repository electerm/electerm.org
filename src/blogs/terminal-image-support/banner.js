/**
 * Animated banner for the "terminal image support" blog post.
 *
 * Plain DOM + CSS driven by one requestAnimationFrame timeline — no image,
 * no GIF, no canvas. The terminal window types `imgcat`, then a picture
 * (sun + mountain gradients, standing in for a decoded SIXEL/IIP/Kitty
 * image) renders line by line inside the terminal, exactly where inline
 * image output lands in electerm.
 *
 * Mount points: any element carrying [data-eb-banner]:
 *   data-eb-banner="hero"  -> headline + terminal window (blog post page)
 *   data-eb-banner="card"  -> window only                (blog index thumbnail)
 * A mount also has to match data-eb-banner-src (the module the template
 * loaded for that post) — otherwise the first script to run would claim
 * every card on the blog index.
 */

const STYLE_ID = 'eb-bn-terminal-image-style'

// One full pass of the story, in ms.
const T = {
  typeFrom: 400,
  typeTo: 1400,
  imgFrom: 1600, // picture starts rendering
  imgTo: 3200,
  badgeFrom: 3000, // protocol chips pop in
  badgeTo: 3600,
  outFrom: 3700, // follow-up shell line
  outTo: 4100,
  fadeFrom: 6800,
  fadeTo: 7300
}

const PERIOD = 7800
const CMD = 'imgcat hero-final-v2-REALLY.png'
const OUT = 'hero-final-v2-REALLY.png  2400 x 1350  png'

const CSS = `
.eb-bn-img {
  --eb-ink: #16233a;
  --eb-main-dark: #000;
  --eb-main: #121214;
  --eb-text: #ddd;
  --eb-text-dark: #888;
  --eb-primary: #08c;
  --eb-success: #06d6a0;
  --eb-term-bg: #20111b;
  --eb-term-fg: #bbbbbb;
  --eb-term-green: #19f9d8;
  --eb-term-blue: #6fc1ff;
  --eb-term-cursor: #b5bd68;
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: var(--radius-lg, 12px);
  border: 1px solid var(--color-border, #d9e2f0);
  background: linear-gradient(135deg, #e8f1ff 0%, #f2ecff 52%, #fdeef5 100%);
  color: var(--eb-ink);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.3;
  isolation: isolate;
  -webkit-font-smoothing: antialiased;
}
.eb-bn-img-deco { position: absolute; inset: 0; pointer-events: none; }
.eb-bn-img-dots {
  position: absolute;
  inset: -6em;
  background-image: radial-gradient(rgba(37, 99, 235, 0.2) 0.18em, transparent 0.18em);
  background-size: 4.2em 4.2em;
  animation: eb-bn-img-drift 34s linear infinite;
}
@keyframes eb-bn-img-drift { to { transform: translate3d(4.2em, 4.2em, 0); } }
.eb-bn-img-blob { position: absolute; border-radius: 50%; background: rgba(255, 255, 255, 0.62); }
.eb-bn-img-blob-a { width: 32em; height: 32em; right: -10em; top: -12em; }
.eb-bn-img-blob-b { width: 26em; height: 26em; left: -9em; bottom: -11em; }
.eb-bn-img-head { position: absolute; left: 5em; right: 5em; top: 3.4em; }
.eb-bn-img-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.45em;
  font-size: 1.4em;
  font-weight: 800;
  letter-spacing: 0.01em;
  color: #2563eb;
}
.eb-bn-img-brand::before {
  content: '';
  width: 1.05em;
  height: 1.05em;
  border-radius: 50%;
  background: #2563eb;
  box-shadow: inset 0 0 0 0.32em #fff;
}
.eb-bn-img-h1 {
  margin: 0.26em 0 0;
  font-size: 3.4em;
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.025em;
  color: #0f172a;
}
.eb-bn-img-h1 em {
  font-style: normal;
  background: linear-gradient(96deg, #2563eb, #7c3aed 52%, #ec4899);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.eb-bn-img-sub {
  margin: 0.55em 0 0;
  max-width: 58em;
  font-size: 1.6em;
  line-height: 1.4;
  color: #475569;
}
.eb-bn-img-app {
  position: absolute;
  left: 50%;
  bottom: 5.4%;
  transform: translateX(-50%);
  width: 66em;
  background: var(--eb-term-bg);
  border-radius: 0.8em;
  box-shadow: 0 1.3em 2.6em rgba(15, 23, 42, 0.32), 0 0 2.2em rgba(37, 99, 235, 0.2);
  overflow: hidden;
  text-align: left;
  animation: eb-bn-img-glow 4.4s ease-in-out infinite;
}
@keyframes eb-bn-img-glow {
  0%, 100% { box-shadow: 0 1.3em 2.6em rgba(15, 23, 42, 0.32), 0 0 2.2em rgba(37, 99, 235, 0.18); }
  50% { box-shadow: 0 1.3em 2.6em rgba(15, 23, 42, 0.34), 0 0 3.4em rgba(124, 58, 237, 0.4); }
}
.eb-bn-img-tabbar {
  display: flex;
  align-items: stretch;
  height: 2.6em;
  padding: 0 0.5em;
  background: var(--eb-main-dark);
  font-size: 1.3em;
  line-height: 1;
}
.eb-bn-img-tab {
  display: flex;
  align-items: center;
  gap: 0.42em;
  height: 100%;
  padding: 0 1em;
  border-radius: 0.21em 0.21em 0 0;
  background: var(--eb-main);
  color: var(--eb-text);
  font-weight: 700;
  white-space: nowrap;
}
.eb-bn-img-dot { width: 0.4em; height: 0.4em; border-radius: 50%; background: var(--eb-success); }
.eb-bn-img-term {
  position: relative;
  padding: 1.2em 1.4em 1.3em;
  font-size: 2.5em;
  font-family: Menlo, Monaco, 'DejaVu Sans Mono', 'Courier New', monospace;
  line-height: 1.45;
  color: var(--eb-term-fg);
  white-space: nowrap;
}
.eb-bn-img-ps1 { color: var(--eb-term-green); }
.eb-bn-img-path { color: var(--eb-term-blue); }
.eb-bn-img-caret {
  display: inline-block;
  width: 0.6em;
  height: 1.15em;
  margin-left: 0.06em;
  vertical-align: -0.24em;
  background: var(--eb-term-cursor);
}
/* the "decoded image": sun + ridges + lake, clipped by a reveal mask so it
   paints top-to-bottom like a real SIXEL stream arriving in chunks */
.eb-bn-img-picwrap { position: relative; height: 0; overflow: hidden; }
.eb-bn-img-pic {
  position: relative;
  width: 34em;
  height: 15em;
  margin: 0.5em 0 0.3em;
  border-radius: 0.3em;
  overflow: hidden;
  background: linear-gradient(180deg, #2b3a67 0%, #7c5cbf 34%, #ef6f9c 55%, #f7b267 72%, #1d3557 72.5%, #12263f 100%);
}
.eb-bn-img-sun {
  position: absolute;
  left: 50%;
  top: 3.4em;
  width: 4.6em;
  height: 4.6em;
  border-radius: 50%;
  transform: translateX(-50%);
  background: radial-gradient(circle, #fff8e1 0%, #ffdf8e 45%, #ff9d5c 100%);
  box-shadow: 0 0 2.4em 0.9em rgba(255, 200, 120, 0.55);
}
.eb-bn-img-ridge {
  position: absolute;
  bottom: 4.1em;
  width: 120%;
  height: 6em;
  background: #2a2356;
}
.eb-bn-img-ridge-a { left: -10%; transform: rotate(-7deg); border-radius: 50% 50% 0 0; }
.eb-bn-img-ridge-b { left: -10%; bottom: 3.4em; background: #1a1740; transform: rotate(5deg); border-radius: 50% 50% 0 0; }
.eb-bn-img-lake {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 4.1em;
  background: linear-gradient(180deg, rgba(247, 178, 103, 0.75) 0%, rgba(29, 53, 87, 0.9) 45%, #0d1b2e 100%);
}
.eb-bn-img-scan {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 0.35em;
  background: rgba(255, 255, 255, 0.75);
  box-shadow: 0 0 1em rgba(255, 255, 255, 0.8);
}
.eb-bn-img-meta { color: var(--eb-text-dark); font-size: 0.85em; opacity: 0; }
.eb-bn-img-badges { display: flex; gap: 0.5em; margin-top: 0.5em; opacity: 0; }
.eb-bn-img-badge {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 1.05em;
  font-weight: 700;
  padding: 0.28em 0.8em;
  border-radius: 2em;
  color: #fff;
  transform: scale(0.7);
}
.eb-bn-img-badge-sixel { background: #2563eb; }
.eb-bn-img-badge-iip { background: #7c3aed; }
.eb-bn-img-badge-kitty { background: #ec4899; }
.eb-bn-img-next { opacity: 0; }
.eb-bn-img[data-variant='card'] .eb-bn-img-app {
  bottom: auto;
  top: 50%;
  width: 88em;
  transform: translate(-50%, -50%);
}
.eb-bn-img[data-variant='card'] .eb-bn-img-term { font-size: 3em; }
@media (prefers-reduced-motion: reduce) {
  .eb-bn-img-dots, .eb-bn-img-app { animation: none !important; }
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

function markup (variant) {
  const head = variant === 'card'
    ? ''
    : `
      <div class="eb-bn-img-head">
        <span class="eb-bn-img-brand">electerm</span>
        <h2 class="eb-bn-img-h1">Pictures, rendered <em>in the terminal</em></h2>
        <p class="eb-bn-img-sub">Flip on “support terminal image” and imgcat just works — SIXEL, iTerm and Kitty.</p>
      </div>`
  return `
    <div class="eb-bn-img-deco">
      <span class="eb-bn-img-blob eb-bn-img-blob-a"></span>
      <span class="eb-bn-img-blob eb-bn-img-blob-b"></span>
      <span class="eb-bn-img-dots"></span>
    </div>
    ${head}
    <div class="eb-bn-img-app">
      <div class="eb-bn-img-tabbar">
        <span class="eb-bn-img-tab"><span class="eb-bn-img-dot"></span><span>zxd@web-01:22</span></span>
      </div>
      <div class="eb-bn-img-term">
        <div><span class="eb-bn-img-ps1">zxd@web-01</span>:<span class="eb-bn-img-path">~/shots</span>$&nbsp;<span class="eb-bn-img-cmd"></span><span class="eb-bn-img-caret"></span></div>
        <div class="eb-bn-img-picwrap">
          <div class="eb-bn-img-pic">
            <span class="eb-bn-img-sun"></span>
            <span class="eb-bn-img-ridge eb-bn-img-ridge-a"></span>
            <span class="eb-bn-img-ridge eb-bn-img-ridge-b"></span>
            <span class="eb-bn-img-lake"></span>
            <span class="eb-bn-img-scan"></span>
          </div>
        </div>
        <div class="eb-bn-img-meta">${OUT}</div>
        <div class="eb-bn-img-badges">
          <span class="eb-bn-img-badge eb-bn-img-badge-sixel">SIXEL</span>
          <span class="eb-bn-img-badge eb-bn-img-badge-iip">iTerm IIP</span>
          <span class="eb-bn-img-badge eb-bn-img-badge-kitty">Kitty</span>
        </div>
        <div class="eb-bn-img-next"><span class="eb-bn-img-ps1">zxd@web-01</span>:<span class="eb-bn-img-path">~/shots</span>$&nbsp;</div>
      </div>
    </div>`
}

function mount (host) {
  if (host.getAttribute('data-eb-mounted')) return
  host.setAttribute('data-eb-mounted', '1')

  const variant = host.getAttribute('data-eb-banner') === 'card' ? 'card' : 'hero'
  const root = document.createElement('div')
  root.className = 'eb-bn-img'
  root.setAttribute('data-variant', variant)
  root.setAttribute('role', 'img')
  root.setAttribute('aria-label', 'electerm: running imgcat renders a sunset picture inline in the terminal')
  root.innerHTML = markup(variant)
  host.appendChild(root)

  const el = {
    cmd: root.querySelector('.eb-bn-img-cmd'),
    caret: root.querySelector('.eb-bn-img-caret'),
    picwrap: root.querySelector('.eb-bn-img-picwrap'),
    scan: root.querySelector('.eb-bn-img-scan'),
    meta: root.querySelector('.eb-bn-img-meta'),
    badges: root.querySelector('.eb-bn-img-badges'),
    badgeEls: Array.from(root.querySelectorAll('.eb-bn-img-badge')),
    next: root.querySelector('.eb-bn-img-next')
  }
  // Natural picture height: 15em at the terminal font size + vertical margins.
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

  const PIC_H_EM = 15 + 0.8 // pic height + margins, in terminal em

  function frame (t) {
    const typed = Math.round(easeOut(seg(t, T.typeFrom, T.typeTo)) * CMD.length)
    el.cmd.textContent = CMD.slice(0, typed)
    const doneTyping = t >= T.typeTo
    el.caret.style.visibility = (doneTyping && t < T.imgFrom) || t >= T.outFrom ? 'hidden' : 'visible'

    // picture reveal: wrapper grows, scanline sweeps down
    const p = easeInOut(seg(t, T.imgFrom, T.imgTo))
    el.picwrap.style.height = (p * PIC_H_EM).toFixed(3) + 'em'
    el.picwrap.style.opacity = p > 0 ? '1' : '0'
    el.scan.style.top = (p * 100).toFixed(2) + '%'
    el.scan.style.opacity = p > 0 && p < 1 ? '1' : '0'

    // meta line + badges
    const metaP = easeOut(seg(t, T.imgTo - 200, T.imgTo + 300))
    el.meta.style.opacity = metaP.toFixed(3)
    const bP = easeOut(seg(t, T.badgeFrom, T.badgeTo))
    el.badges.style.opacity = bP.toFixed(3)
    el.badgeEls.forEach((b, i) => {
      const q = easeOut(seg(t, T.badgeFrom + i * 150, T.badgeFrom + 300 + i * 150))
      b.style.transform = 'scale(' + (0.7 + 0.3 * q).toFixed(3) + ')'
      b.style.opacity = q.toFixed(3)
    })

    // next prompt
    const nP = easeOut(seg(t, T.outFrom, T.outTo))
    el.next.style.opacity = nP.toFixed(3)

    // end-of-loop fade
    const gone = easeInOut(seg(t, T.fadeFrom, T.fadeTo))
    root.style.opacity = ''
    el.cmd.style.opacity = (1 - gone).toFixed(3)
  }

  const reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    frame(T.outTo + 100)
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
