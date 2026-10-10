/**
 * Hero animation — connection packets fired at the electerm wordmark.
 *
 * The packets are the point: a comet with a fading tail leaves an emitter on the
 * wordmark baseline, curves onto a target that is *on a glyph* (targets are
 * rejection-sampled from the logo's own alpha mask, so a packet always lands on
 * ink), blooms a coloured halo out from behind the letter and docks a small
 * `NAME port` chip.
 *
 * Depth is real rather than faked: the drawing is split across two canvases
 * that straddle the logo —
 *
 *   .hero-connections-back   z-index 1   under the wordmark (impact halos)
 *   .hero-logo / -wrap       z-index 2   the wordmark itself
 *   .hero-connections-front  z-index 3   over the wordmark (trails, chips)
 *
 * — so a halo really does appear to bleed out from inside a letter.
 */
/* global requestAnimationFrame, cancelAnimationFrame, ResizeObserver, IntersectionObserver */

/**
 * Default ports are electerm's own, from `DEFAULT_PORTS` in
 * src/app/common/parse-quick-connect.js of the app repo. SFTP rides the SSH
 * connection, and serial has no port at all — it takes a device path.
 */
const PROTOCOLS = [
  { name: 'SSH', port: '22', color: '#2563eb' },
  { name: 'SFTP', port: '22', color: '#0d9488' },
  { name: 'FTP', port: '21', color: '#0891b2' },
  { name: 'RDP', port: '3389', color: '#7c3aed' },
  { name: 'VNC', port: '5900', color: '#db2777' },
  { name: 'SPICE', port: '5900', color: '#ea580c' },
  { name: 'SERIAL', port: 'ttyUSB0', color: '#4f46e5' }
]

const TAU = Math.PI * 2
const MASK_W = 200 // alpha-mask resolution used to aim the packets
const BEND_MAX = 96 // widest sideways bow a trail may curve, in px
const FONT = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const rand = (a, b) => a + Math.random() * (b - a)
const easeOut = t => 1 - (1 - t) * (1 - t)

function rgba (hex, a) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

function roundRect (ctx, x, y, w, h, r) {
  if (ctx.roundRect) {
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, r)
    return
  }
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

export default class HeroConnections {
  constructor (stage, logo) {
    this.stage = stage
    this.logo = logo
    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    this.time = 0
    this.last = 0
    this.intro = 0
    this.nextShot = 0.45
    this.ping = 0
    this.paused = false
    this.inView = true
    this.destroyed = false
    this.ready = false
    this.packets = []
    this.impacts = []
    this.mask = null
    this.glyph = null

    this.back = this._makeCanvas('hero-connections-back')
    this.front = this._makeCanvas('hero-connections-front')
    this._bind()
    this._measure()
    // The logo <img> can still be decoding on the first frame; measure again
    // once it lands, and once more after layout settles.
    if (!this.logo.complete) this.logo.addEventListener('load', () => this._measure(), { once: true })
    requestAnimationFrame(() => this._measure())
    if (!this.reduceMotion) this._loop()
  }

  // --- setup ---------------------------------------------------------------

  _makeCanvas (cls) {
    const el = document.createElement('canvas')
    el.className = 'hero-connections-canvas ' + cls
    el.setAttribute('aria-hidden', 'true')
    this.stage.appendChild(el)
    return { el, ctx: el.getContext('2d') }
  }

  _bind () {
    this.onResize = () => this._resize()
    window.addEventListener('resize', this.onResize, { passive: true })
    if (window.ResizeObserver) {
      this.ro = new ResizeObserver(this.onResize)
      this.ro.observe(this.stage)
      this.ro.observe(this.logo)
    }
    this.onVisibility = () => { this.paused = document.hidden }
    document.addEventListener('visibilitychange', this.onVisibility)
    if (window.IntersectionObserver) {
      this.io = new IntersectionObserver(entries => {
        this.inView = entries[0].isIntersecting
      }, { threshold: 0 })
      this.io.observe(this.stage)
    }
  }

  _measure () {
    if (this.destroyed) return
    if (!this.glyph) {
      this.glyph = this._contentBox(this.logo)
      this.mask = this._alphaMask(this.logo)
    }
    this._resize()
  }

  // Tight box of the non-transparent pixels, normalised to the image. Returns
  // null while the image has no intrinsic size yet.
  _contentBox (img) {
    const w = img.naturalWidth
    const h = img.naturalHeight
    if (!w || !h) return null
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const x = c.getContext('2d', { willReadFrequently: true })
    x.drawImage(img, 0, 0)
    let d
    try {
      d = x.getImageData(0, 0, w, h).data
    } catch (e) {
      return { x0: 0, y0: 0, x1: 1, y1: 1 } // tainted canvas — fall back to the full box
    }
    let x0 = w
    let y0 = h
    let x1 = -1
    let y1 = -1
    for (let p = 0; p < w * h; p++) {
      if (d[p * 4 + 3] > 24) {
        const px = p % w
        const py = (p / w) | 0
        if (px < x0) x0 = px
        if (px > x1) x1 = px
        if (py < y0) y0 = py
        if (py > y1) y1 = py
      }
    }
    if (x1 < 0) return { x0: 0, y0: 0, x1: 1, y1: 1 }
    return { x0: x0 / w, y0: y0 / h, x1: (x1 + 1) / w, y1: (y1 + 1) / h }
  }

  _alphaMask (img) {
    const w = img.naturalWidth
    const h = img.naturalHeight
    if (!w || !h) return null
    const mw = MASK_W
    const mh = Math.max(1, Math.round(mw * h / w))
    const c = document.createElement('canvas')
    c.width = mw
    c.height = mh
    const x = c.getContext('2d', { willReadFrequently: true })
    x.drawImage(img, 0, 0, mw, mh)
    try {
      const d = x.getImageData(0, 0, mw, mh).data
      const a = new Uint8Array(mw * mh)
      for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3]
      return { w: mw, h: mh, a }
    } catch (e) {
      return null
    }
  }

  // --- geometry ------------------------------------------------------------

  _resize () {
    if (this.destroyed || !this.glyph) return
    const sr = this.stage.getBoundingClientRect()
    const lr = this.logo.getBoundingClientRect()
    if (!sr.width || !lr.width) {
      this.ready = false
      return
    }

    // Logo box in stage-local coordinates (so every later number is stage-local
    // and the canvas transform can absorb the canvas offset).
    const L = { x: lr.left - sr.left, y: lr.top - sr.top, w: lr.width, h: lr.height }
    this.lbox = L

    const g = this.glyph
    const gbox = {
      x0: L.x + g.x0 * L.w,
      y0: L.y + g.y0 * L.h,
      x1: L.x + g.x1 * L.w,
      y1: L.y + g.y1 * L.h
    }
    const gw = gbox.x1 - gbox.x0
    const gh = gbox.y1 - gbox.y0
    if (gw < 40 || gh < 8) {
      this.ready = false
      return
    }
    this.gbox = gbox
    this.gw = gw

    // The emitter sits on the wordmark baseline — pushed a little below the ink
    // so the fan of trails reads as coming from *under* the letters, and clamped
    // to the image box so it never wanders into the tagline below.
    this.origin = {
      x: (gbox.x0 + gbox.x1) / 2,
      y: Math.min(gbox.y1 + gh * 0.14, L.y + L.h)
    }

    // Canvas padding: the halo grows ~80px past its target, chips lift ~26px
    // above it, and the widest trail bend is capped at BEND_MAX — so this much
    // margin on every side keeps every effect fully drawn.
    const m = clamp(gh * 1.15, 58, 140)
    const box = {
      x: gbox.x0 - m,
      y: gbox.y0 - m,
      w: gw + m * 2,
      h: (this.origin.y + m) - (gbox.y0 - m)
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.box = box
    for (const layer of [this.back, this.front]) {
      const el = layer.el
      const w = Math.round(box.w)
      const h = Math.round(box.h)
      el.width = Math.round(w * dpr)
      el.height = Math.round(h * dpr)
      el.style.width = w + 'px'
      el.style.height = h + 'px'
      el.style.left = Math.round(box.x) + 'px'
      el.style.top = Math.round(box.y) + 'px'
      // Fold the canvas offset into the transform so drawing code can use plain
      // stage-local coordinates.
      layer.ctx.setTransform(dpr, 0, 0, dpr, -box.x * dpr, -box.y * dpr)
    }
    this.ready = true
    if (this.reduceMotion) this._drawStatic()
    else this._draw()
  }

  // --- motion --------------------------------------------------------------

  _update (dt) {
    this.time += dt
    if (this.intro < 1) this.intro = Math.min(1, this.intro + dt / 0.9)
    this.ping = Math.max(0, this.ping - dt * 2.4)

    this.nextShot -= dt
    if (this.nextShot <= 0 && this.intro >= 1) {
      this._shoot(0)
      if (Math.random() < 0.3) this._shoot(0.13)
      this.nextShot = rand(0.7, 1.45)
      this.ping = 1
    }

    for (const pkt of this.packets) pkt.life += dt
    for (let i = this.packets.length - 1; i >= 0; i--) {
      const pkt = this.packets[i]
      if (pkt.life < pkt.dur) continue
      this.packets.splice(i, 1)
      this.impacts.push({
        x: pkt.to.x,
        y: pkt.to.y,
        proto: pkt.proto,
        life: 0,
        dur: 1.05
      })
    }
    for (const im of this.impacts) im.life += dt
    for (let i = this.impacts.length - 1; i >= 0; i--) {
      if (this.impacts[i].life > this.impacts[i].dur) this.impacts.splice(i, 1)
    }
  }

  _shoot (delay) {
    const proto = PROTOCOLS[(Math.random() * PROTOCOLS.length) | 0]
    const o = this.origin
    const from = { x: o.x + rand(-4, 4), y: o.y }
    const to = this._pickTarget()
    const dx = to.x - from.x
    const dy = to.y - from.y
    const dist = Math.hypot(dx, dy) || 1
    const sign = Math.random() < 0.5 ? -1 : 1
    const bend = Math.min(clamp(dist * rand(0.12, 0.24), 18, BEND_MAX), this.box.w * 0.45) * sign
    this.packets.push({
      proto,
      from,
      to,
      mid: {
        x: (from.x + to.x) / 2 + (-dy / dist) * bend,
        y: (from.y + to.y) / 2 + (dx / dist) * bend
      },
      life: -delay,
      dur: clamp(dist / 850, 0.45, 1.05)
    })
  }

  // Sample a point that is actually on a glyph, and keep successive impacts
  // apart so they spread across the wordmark.
  _pickTarget () {
    const L = this.lbox
    const m = this.mask
    const b = this.gbox
    const minGap = this.gw * 0.1
    // A chip is centred on its target and is ~90px wide, so the outermost
    // letters would push half of it off a narrow screen. Keep targets off the
    // ends by roughly half a chip.
    const inset = Math.min(this.gw * 0.09, 52)
    const x0 = b.x0 + inset
    const x1 = b.x1 - inset
    for (let i = 0; i < 40; i++) {
      let x
      let y
      if (m) {
        const mi = (Math.random() * m.w) | 0
        const mj = (Math.random() * m.h) | 0
        if (m.a[mj * m.w + mi] < 100) continue
        x = L.x + ((mi + Math.random()) / m.w) * L.w
        y = L.y + ((mj + Math.random()) / m.h) * L.h
      } else {
        x = L.x + Math.random() * L.w
        y = L.y + Math.random() * L.h
      }
      if (x < x0 || x > x1) continue
      const prev = this.lastTarget
      if (prev && Math.hypot(x - prev.x, y - prev.y) < minGap) continue
      this.lastTarget = { x, y }
      return { x, y }
    }
    return { x: (x0 + x1) / 2, y: (b.y0 + b.y1) / 2 }
  }

  // --- drawing -------------------------------------------------------------

  _bez (p, t) {
    const u = 1 - t
    return {
      x: u * u * p.from.x + 2 * u * t * p.mid.x + t * t * p.to.x,
      y: u * u * p.from.y + 2 * u * t * p.mid.y + t * t * p.to.y
    }
  }

  _draw () {
    if (!this.ready) return
    this._drawLayer(this.back, 'back')
    this._drawLayer(this.front, 'front')
  }

  _drawLayer (layer, name) {
    const ctx = layer.ctx
    const b = this.box
    ctx.clearRect(b.x, b.y, b.w, b.h)
    // Halos belong behind the letters so they bleed out of the glyphs; trails
    // and chips belong on top so they are never cut in half by the wordmark.
    if (name === 'back') {
      this._drawHalos(ctx)
      this._drawRings(ctx)
      return
    }
    this._drawTrails(ctx)
    this._drawEmitter(ctx)
    this._drawChips(ctx)
  }

  // The muzzle flash: a soft dot plus a ring that expands out of it on every
  // shot, so an idle emitter still reads as a source rather than a stray pixel.
  _drawEmitter (ctx) {
    const o = this.origin
    if (!o) return
    const a = easeOut(this.intro)
    const r = clamp(this.gbox.y1 - this.gbox.y0, 8, 160) * 0.12
    const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, r * 3.4)
    g.addColorStop(0, `rgba(37, 99, 235, ${0.26 * a})`)
    g.addColorStop(1, 'rgba(37, 99, 235, 0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(o.x, o.y, r * 3.4, 0, TAU)
    ctx.fill()

    if (this.ping > 0) {
      const t = 1 - this.ping // 0 at the shot, 1 as the ring dies
      ctx.strokeStyle = `rgba(37, 99, 235, ${0.5 * this.ping * a})`
      ctx.lineWidth = 1.6 * this.ping + 0.3
      ctx.beginPath()
      ctx.arc(o.x, o.y, r * (0.7 + t * 3.6), 0, TAU)
      ctx.stroke()
    }

    ctx.fillStyle = `rgba(37, 99, 235, ${(0.55 + 0.25 * this.ping) * a})`
    ctx.beginPath()
    ctx.arc(o.x, o.y, Math.max(1.4, r * 0.28), 0, TAU)
    ctx.fill()
  }

  _drawTrails (ctx) {
    for (const p of this.packets) {
      if (p.life < 0) continue
      const e = easeOut(clamp(p.life / p.dur, 0, 1))
      const head = this._bez(p, e)
      const back = Math.max(0, e - 0.55)
      const steps = 12
      ctx.lineCap = 'round'
      for (let i = 0; i < steps; i++) {
        const u = (i + 1) / steps
        const a0 = this._bez(p, back + (e - back) * (i / steps))
        const a1 = this._bez(p, back + (e - back) * u)
        ctx.strokeStyle = rgba(p.proto.color, 0.85 * u * u)
        ctx.lineWidth = 0.8 + 2.6 * u
        ctx.beginPath()
        ctx.moveTo(a0.x, a0.y)
        ctx.lineTo(a1.x, a1.y)
        ctx.stroke()
      }
      ctx.save()
      ctx.shadowColor = rgba(p.proto.color, 0.9)
      ctx.shadowBlur = 14
      ctx.fillStyle = p.proto.color
      ctx.beginPath()
      ctx.arc(head.x, head.y, 3.8, 0, TAU)
      ctx.fill()
      ctx.restore()
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
      ctx.beginPath()
      ctx.arc(head.x, head.y, 1.4, 0, TAU)
      ctx.fill()
    }
  }

  _drawHalos (ctx) {
    for (const im of this.impacts) {
      const t = im.life / im.dur
      const fade = t < 0.12 ? t / 0.12 : 1 - (t - 0.12) / 0.88
      if (fade <= 0) continue
      const r = 18 + t * 62
      const g = ctx.createRadialGradient(im.x, im.y, 0, im.x, im.y, r)
      g.addColorStop(0, rgba(im.proto.color, 0.5 * fade))
      g.addColorStop(0.55, rgba(im.proto.color, 0.18 * fade))
      g.addColorStop(1, rgba(im.proto.color, 0))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(im.x, im.y, r, 0, TAU)
      ctx.fill()
    }
  }

  _drawRings (ctx) {
    for (const im of this.impacts) {
      const t = im.life / im.dur
      for (let k = 0; k < 2; k++) {
        const tt = t - k * 0.22
        if (tt <= 0 || tt >= 1) continue
        ctx.strokeStyle = rgba(im.proto.color, 0.45 * (1 - tt))
        ctx.lineWidth = 0.4 + 2 * (1 - tt)
        ctx.beginPath()
        ctx.arc(im.x, im.y, 6 + tt * 52, 0, TAU)
        ctx.stroke()
      }
    }
  }

  _drawChips (ctx) {
    for (const im of this.impacts) {
      const t = im.life / im.dur
      const alpha = Math.min(clamp(t / 0.14, 0, 1), clamp((1 - t) / 0.3, 0, 1))
      if (alpha <= 0) continue
      const lift = -6 - easeOut(clamp(t / 0.5, 0, 1)) * 16
      this._chip(ctx, im.x, im.y + lift, im.proto, alpha)
    }
  }

  _chip (ctx, x, y, proto, alpha) {
    const pad = 10
    const gap = 5
    const dot = 5
    const h = 22
    ctx.save()
    ctx.font = `700 11px ${FONT}`
    const wn = ctx.measureText(proto.name).width
    ctx.font = `500 11px ${FONT}`
    const wp = ctx.measureText(proto.port).width
    const w = pad * 2 + dot + gap + wn + gap + wp
    ctx.globalAlpha = alpha
    ctx.translate(x, y)
    roundRect(ctx, -w / 2, -h / 2, w, h, h / 2)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.96)'
    ctx.fill()
    ctx.strokeStyle = rgba(proto.color, 0.5)
    ctx.lineWidth = 1
    ctx.stroke()
    const left = -w / 2 + pad
    ctx.beginPath()
    ctx.arc(left + dot / 2, 0, dot / 2, 0, TAU)
    ctx.fillStyle = proto.color
    ctx.fill()
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    ctx.font = `700 11px ${FONT}`
    ctx.fillStyle = proto.color
    ctx.fillText(proto.name, left + dot + gap, 1)
    ctx.font = `500 11px ${FONT}`
    ctx.fillStyle = 'rgba(100, 116, 139, 0.95)'
    ctx.fillText(proto.port, left + dot + gap + wn + gap, 1)
    ctx.restore()
  }

  // --- static frame for prefers-reduced-motion -----------------------------

  _drawStatic () {
    if (!this.ready) return
    this.intro = 1
    this.time = 0
    this.ping = 0
    this.packets.length = 0
    this.impacts.length = 0
    // Dock one chip per interesting corner of the wordmark so the protocol
    // names are still on screen without any motion.
    for (const proto of [PROTOCOLS[0], PROTOCOLS[3], PROTOCOLS[5]]) {
      const t = this._pickTarget()
      this.impacts.push({ x: t.x, y: t.y, proto, life: 0.42, dur: 1.05 })
    }
    this._draw()
  }

  // --- loop ----------------------------------------------------------------

  _loop (ts) {
    if (this.destroyed) return
    this.raf = requestAnimationFrame(t => this._loop(t))
    if (this.paused || !this.inView) {
      this.last = 0
      return
    }
    // The first call comes straight from the constructor and carries no
    // timestamp; a NaN dt here would poison `time` (and the shot timer) for the
    // rest of the session, so only derive dt once there is a previous frame.
    const now = typeof ts === 'number' ? ts : 0
    const dt = this.last ? clamp((now - this.last) / 1000, 0, 0.05) : 0
    this.last = now
    if (!this.ready) return
    try {
      this._update(dt)
      this._draw()
    } catch (err) {
      console.error('[hero-connections] animation frame failed', err)
      this.destroyed = true
    }
  }

  destroy () {
    this.destroyed = true
    if (this.raf) cancelAnimationFrame(this.raf)
    window.removeEventListener('resize', this.onResize)
    document.removeEventListener('visibilitychange', this.onVisibility)
    if (this.ro) this.ro.disconnect()
    if (this.io) this.io.disconnect()
    this.back.el.remove()
    this.front.el.remove()
  }
}
