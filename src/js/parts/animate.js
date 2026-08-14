/**
 * Canvas animation for hero background
 * Tech-style: grid + particle network + feature phrase rain + hex nodes
 */
/* global requestAnimationFrame, cancelAnimationFrame */
export default class HeroAnimate {
  constructor (el) {
    this.el = el
    this.canvas = document.createElement('canvas')
    this.canvas.style.cssText = 'display:block;width:100%;height:100%'
    this.el.appendChild(this.canvas)
    this.ctx = this.canvas.getContext('2d')
    this.animId = null
    this.w = 0
    this.h = 0

    this.PARTICLE_COUNT = 60
    this.CONNECT_DIST = 150
    this.DROP_COUNT = 30
    this.particles = []
    this.drops = []
    this.hexNodes = []
    this.scanY = 0

    this.featurePhrases = [
      'Terminal', 'SSH', 'SFTP', 'Telnet', 'Serialport',
      'RDP', 'VNC', 'Spice', 'FTP',
      'Multi-platform', 'Multi-language', 'AI assistant',
      'MCP', 'Deep link', 'Zmodem', 'Trzsz',
      'SSH tunnel', 'Quick commands', 'Themes',
      'Sync bookmarks', 'Proxy', 'Transparent window',
      '终端', '文件管理', '多平台', '多语言',
      '快捷键', '远程编辑', '密码登录', '密匙登录',
      '隧道', '代理服务器', '快捷命令', '主题',
      '同步数据', '快速输入', 'AI助手', '深度链接',
      '透明窗口', '背景图片', '文件传输'
    ]

    this._resize = this.resize.bind(this)
    this.init()
  }

  init () {
    this.resize()
    this.animate()
    window.addEventListener('resize', this._resize)
  }

  resize () {
    const dpr = window.devicePixelRatio || 1
    this.w = this.el.offsetWidth
    this.h = this.el.offsetHeight
    this.canvas.width = this.w * dpr
    this.canvas.height = this.h * dpr
    this.canvas.style.width = this.w + 'px'
    this.canvas.style.height = this.h + 'px'
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.initParticles()
    this.initDrops()
    this.initHexNodes()
  }

  initParticles () {
    this.particles = []
    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      this.particles.push({
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        r: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.2
      })
    }
  }

  initDrops () {
    this.drops = []
    for (let i = 0; i < this.DROP_COUNT; i++) {
      this.drops.push({
        x: Math.random() * this.w,
        y: Math.random() * this.h * -1 - Math.random() * 300,
        speed: Math.random() * 0.8 + 0.3,
        phrase: this.featurePhrases[Math.floor(Math.random() * this.featurePhrases.length)],
        opacity: Math.random() * 0.1 + 0.04,
        fontSize: Math.random() * 4 + 11
      })
    }
  }

  initHexNodes () {
    this.hexNodes = []
    for (let i = 0; i < 8; i++) {
      this.hexNodes.push({
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 12 + 8,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.01,
        opacity: Math.random() * 0.08 + 0.03
      })
    }
  }

  drawGrid () {
    const ctx = this.ctx
    const gridSize = 60
    ctx.strokeStyle = 'rgba(37, 99, 235, 0.04)'
    ctx.lineWidth = 0.5
    for (let x = 0; x < this.w; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, this.h)
      ctx.stroke()
    }
    for (let y = 0; y < this.h; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(this.w, y)
      ctx.stroke()
    }
  }

  drawParticles () {
    const ctx = this.ctx
    for (const p of this.particles) {
      p.x += p.vx
      p.y += p.vy
      if (p.x < 0 || p.x > this.w) p.vx *= -1
      if (p.y < 0 || p.y > this.h) p.vy *= -1
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(37, 99, 235, ' + p.opacity + ')'
      ctx.fill()
    }
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const dx = this.particles[i].x - this.particles[j].x
        const dy = this.particles[i].y - this.particles[j].y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < this.CONNECT_DIST) {
          const alpha = (1 - dist / this.CONNECT_DIST) * 0.15
          ctx.beginPath()
          ctx.moveTo(this.particles[i].x, this.particles[i].y)
          ctx.lineTo(this.particles[j].x, this.particles[j].y)
          ctx.strokeStyle = 'rgba(37, 99, 235, ' + alpha + ')'
          ctx.lineWidth = 0.8
          ctx.stroke()
        }
      }
    }
  }

  drawMatrixRain () {
    const ctx = this.ctx
    ctx.textBaseline = 'top'
    for (const drop of this.drops) {
      ctx.font = '500 ' + drop.fontSize + 'px "SF Mono", "Fira Code", monospace'
      ctx.fillStyle = 'rgba(37, 99, 235, ' + drop.opacity + ')'
      ctx.fillText(drop.phrase, drop.x, drop.y)
      drop.y += drop.speed
      if (drop.y > this.h + 20) {
        drop.y = Math.random() * -300 - 50
        drop.x = Math.random() * this.w
        drop.phrase = this.featurePhrases[Math.floor(Math.random() * this.featurePhrases.length)]
      }
    }
  }

  drawHex (x, y, size, rotation, opacity) {
    const ctx = this.ctx
    ctx.beginPath()
    for (let i = 0; i < 6; i++) {
      const angle = rotation + (Math.PI / 3) * i
      const px = x + size * Math.cos(angle)
      const py = y + size * Math.sin(angle)
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.strokeStyle = 'rgba(37, 99, 235, ' + opacity + ')'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  drawHexNodes () {
    for (const node of this.hexNodes) {
      node.x += node.vx
      node.y += node.vy
      node.rotation += node.rotSpeed
      if (node.x < -50 || node.x > this.w + 50) node.vx *= -1
      if (node.y < -50 || node.y > this.h + 50) node.vy *= -1
      this.drawHex(node.x, node.y, node.size, node.rotation, node.opacity)
    }
  }

  drawScanLine () {
    this.scanY += 0.5
    if (this.scanY > this.h) this.scanY = 0
    const grad = this.ctx.createLinearGradient(0, this.scanY - 30, 0, this.scanY + 30)
    grad.addColorStop(0, 'rgba(37, 99, 235, 0)')
    grad.addColorStop(0.5, 'rgba(37, 99, 235, 0.03)')
    grad.addColorStop(1, 'rgba(37, 99, 235, 0)')
    this.ctx.fillStyle = grad
    this.ctx.fillRect(0, this.scanY - 30, this.w, 60)
  }

  animate () {
    this.ctx.clearRect(0, 0, this.w, this.h)
    this.drawGrid()
    this.drawScanLine()
    this.drawMatrixRain()
    this.drawHexNodes()
    this.drawParticles()
    this.animId = requestAnimationFrame(() => this.animate())
  }

  destroy () {
    cancelAnimationFrame(this.animId)
    window.removeEventListener('resize', this._resize)
    this.canvas.remove()
  }
}
