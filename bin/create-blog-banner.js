#!/usr/bin/env node
/**
 * Generates the cartoon banner for the "batch & mirror input" blog post.
 *
 *   node bin/create-blog-banner.js
 *   -> src/static/blogs/batch-and-mirror-input/banner.png   (1200x675)
 *
 * The illustration: a 2x2 grid of terminal windows. You type in the
 * top-left one, and the exact same input lands in all four.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createCanvas, loadImage } from 'canvas'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.join(__dirname, '..')

const OUT_DIR = path.join(root, 'src/static/blogs/batch-and-mirror-input')
const OUT_FILE = path.join(OUT_DIR, 'banner.png')
const LOGO_FILE = path.join(root, 'src/static/electerm.png')

const W = 1200
const H = 675

const C = {
  ink: '#16233a',
  bgTop: '#e8f1ff',
  bgBottom: '#f7ecff',
  dot: 'rgba(37,99,235,0.16)',
  blob: 'rgba(255,255,255,0.55)',
  primary: '#2563eb',
  amber: '#f59e0b',
  pink: '#ec4899',
  teal: '#14b8a6',
  title: '#0f172a',
  sub: '#475569',
  termBody: '#0f1a2c',
  termBar: '#1d2b45',
  termEdge: '#3d5375',
  termText: '#e6edf3',
  prompt: '#5eead4',
  host: '#93a9c9'
}

const MONO = 'Menlo, "DejaVu Sans Mono", "Courier New", monospace'
const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif'

function roundRect (ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function star (ctx, cx, cy, r, points = 4) {
  ctx.beginPath()
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? r : r * 0.34
    const a = (Math.PI / points) * i - Math.PI / 2
    const px = cx + Math.cos(a) * rad
    const py = cy + Math.sin(a) * rad
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fill()
}

// classic cartoon mouse pointer
function cursorArrow (ctx, x, y, s = 1.15) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(0, 30)
  ctx.lineTo(7.5, 22)
  ctx.lineTo(13, 33)
  ctx.lineTo(19, 30)
  ctx.lineTo(13.5, 19.5)
  ctx.lineTo(23, 18)
  ctx.closePath()
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = C.ink
  ctx.lineWidth = 3
  ctx.lineJoin = 'round'
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

function arrowHead (ctx, x, y, angle, size = 15) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(-size, -size * 0.62)
  ctx.lineTo(-size * 0.66, 0)
  ctx.lineTo(-size, size * 0.62)
  ctx.closePath()
  ctx.fillStyle = C.amber
  ctx.strokeStyle = C.ink
  ctx.lineWidth = 3.5
  ctx.lineJoin = 'round'
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

function dashedArrow (ctx, x1, y1, x2, y2) {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  ctx.save()
  ctx.setLineDash([15, 11])
  ctx.lineWidth = 5.5
  ctx.lineCap = 'round'
  ctx.strokeStyle = C.amber
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  ctx.restore()
  arrowHead(ctx, x2, y2, angle)
}

function terminal (ctx, x, y, w, h, opts) {
  const { host, active } = opts
  const barH = 36

  // soft drop shadow
  ctx.save()
  ctx.shadowColor = 'rgba(15,23,42,0.28)'
  ctx.shadowBlur = 18
  ctx.shadowOffsetY = 7
  roundRect(ctx, x, y, w, h, 18)
  ctx.fillStyle = C.termBody
  ctx.fill()
  ctx.restore()

  // glow for the terminal you are typing in
  if (active) {
    ctx.save()
    ctx.shadowColor = 'rgba(37,99,235,0.55)'
    ctx.shadowBlur = 26
    roundRect(ctx, x, y, w, h, 18)
    ctx.strokeStyle = C.primary
    ctx.lineWidth = 6
    ctx.stroke()
    ctx.restore()
  }

  // body
  roundRect(ctx, x, y, w, h, 18)
  ctx.fillStyle = C.termBody
  ctx.fill()

  // title bar (clipped to the rounded top)
  ctx.save()
  roundRect(ctx, x, y, w, h, 18)
  ctx.clip()
  ctx.fillStyle = C.termBar
  ctx.fillRect(x, y, w, barH)
  ctx.strokeStyle = C.termEdge
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x, y + barH)
  ctx.lineTo(x + w, y + barH)
  ctx.stroke()
  ctx.restore()

  // traffic lights
  const lights = ['#ff5f57', '#febc2e', '#28c840']
  lights.forEach((col, i) => {
    ctx.beginPath()
    ctx.arc(x + 24 + i * 19, y + barH / 2, 6.5, 0, Math.PI * 2)
    ctx.fillStyle = col
    ctx.fill()
    ctx.strokeStyle = 'rgba(15,23,42,0.35)'
    ctx.lineWidth = 1.5
    ctx.stroke()
  })

  // hostname, centred in the title bar
  ctx.font = `bold 17px ${MONO}`
  ctx.fillStyle = C.host
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(host, x + w / 2, y + barH / 2 + 1)

  // outer outline
  roundRect(ctx, x, y, w, h, 18)
  ctx.strokeStyle = active ? C.primary : C.ink
  ctx.lineWidth = active ? 6 : 5
  ctx.stroke()

  // command line + cursor block
  const lineY = y + barH + (h - barH) / 2 + 2
  const cmd = 'sudo systemctl restart nginx'
  const padX = 26
  ctx.font = `20px ${MONO}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  const promptW = ctx.measureText('$ ').width
  ctx.fillStyle = C.prompt
  ctx.fillText('$', x + padX, lineY)
  ctx.fillStyle = C.termText
  ctx.fillText(cmd, x + padX + promptW, lineY)

  const cursorX = x + padX + promptW + ctx.measureText(cmd).width + 5
  ctx.fillStyle = active ? '#7dd3fc' : 'rgba(226,232,240,0.75)'
  ctx.fillRect(cursorX, lineY - 13, 12, 26)

  return { cursorX: cursorX + 12, cursorY: lineY + 14, midY: y + h / 2 }
}

function label (ctx, text, cx, cy, opts = {}) {
  const { size = 19, fill = '#ffffff', stroke = C.ink, padX = 16, h = 34 } = opts
  ctx.font = `bold ${size}px ${SANS}`
  const w = ctx.measureText(text).width + padX * 2
  roundRect(ctx, cx - w / 2, cy - h / 2, w, h, h / 2)
  ctx.fillStyle = fill
  ctx.fill()
  ctx.strokeStyle = stroke
  ctx.lineWidth = 4
  ctx.stroke()
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, cx, cy + 1)
  return w
}

async function main () {
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext('2d')

  // ---- background -------------------------------------------------------
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, C.bgTop)
  bg.addColorStop(1, C.bgBottom)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // soft cartoon blobs
  ctx.fillStyle = C.blob
  ctx.beginPath()
  ctx.arc(1085, 60, 150, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(70, 640, 130, 0, Math.PI * 2)
  ctx.fill()

  // polka dots
  ctx.fillStyle = C.dot
  for (let gy = 34; gy < H; gy += 44) {
    for (let gx = 34; gx < W; gx += 44) {
      ctx.beginPath()
      ctx.arc(gx, gy, 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // ---- brand + headline -------------------------------------------------
  if (fs.existsSync(LOGO_FILE)) {
    const logo = await loadImage(LOGO_FILE)
    const lh = 40
    const lw = (logo.width / logo.height) * lh
    ctx.drawImage(logo, 72, 40, lw, lh)
  }

  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.font = `bold 58px ${SANS}`
  ctx.fillStyle = C.title
  ctx.fillText('Batch & Mirror Input', 72, 152)

  ctx.font = `26px ${SANS}`
  ctx.fillStyle = C.sub
  ctx.fillText('Type once in one terminal — every terminal gets it.', 74, 196)

  // sparkles in the clear space to the right of the headline
  ctx.fillStyle = C.amber
  star(ctx, 862, 82, 15)
  ctx.fillStyle = C.pink
  star(ctx, 916, 120, 10)
  ctx.fillStyle = C.teal
  star(ctx, 792, 134, 8)

  // ---- 2x2 terminal grid ------------------------------------------------
  const gx = 72
  const gy = 240
  const gw = W - gx * 2
  const gh = 366
  const gap = 52
  const cw = (gw - gap) / 2
  const ch = (gh - gap) / 2

  const at = (col, row) => ({ x: gx + col * (cw + gap), y: gy + row * (ch + gap) })

  const p1 = at(0, 0)
  const p2 = at(1, 0)
  const p3 = at(0, 1)
  const p4 = at(1, 1)

  const t1 = terminal(ctx, p1.x, p1.y, cw, ch, { host: 'web-01', active: true })
  const t2 = terminal(ctx, p2.x, p2.y, cw, ch, { host: 'web-02' })
  terminal(ctx, p3.x, p3.y, cw, ch, { host: 'web-03' })
  terminal(ctx, p4.x, p4.y, cw, ch, { host: 'web-04' })

  // mirror beams: one input -> three other sessions
  dashedArrow(ctx, p1.x + cw + 6, t1.midY, p2.x - 6, t2.midY)
  dashedArrow(ctx, p1.x + cw / 2, p1.y + ch + 6, p3.x + cw / 2, p3.y - 6)
  dashedArrow(ctx, p1.x + cw + 4, p1.y + ch + 4, p4.x - 16, p4.y - 16)

  // "TYPING" badge on the active terminal
  label(ctx, 'TYPING', p1.x + cw - 68, p1.y - 6, { size: 18, fill: C.primary })

  // cartoon pointer at the caret
  cursorArrow(ctx, t1.cursorX + 4, t1.cursorY - 12, 1.15)

  // ---- footer note ------------------------------------------------------
  ctx.font = `bold 20px ${SANS}`
  const note = 'one keystroke  →  every session in sync'
  const nw = ctx.measureText(note).width
  roundRect(ctx, W / 2 - nw / 2 - 26, H - 52, nw + 52, 38, 19)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.strokeStyle = C.ink
  ctx.lineWidth = 4
  ctx.stroke()
  ctx.fillStyle = C.ink
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(note, W / 2, H - 32)

  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(OUT_FILE, canvas.toBuffer('image/png'))
  console.log('✅ banner written to', path.relative(root, OUT_FILE))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
