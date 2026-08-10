/**
 * 3D electerm logo for the hero section.
 *
 * Lazily loads three.js (via the importmap declared in the footer), loads
 * /electerm.glb and overlays an animated, mouse-reactive WebGL canvas on top of
 * the existing PNG logo. The PNG stays in the DOM for SEO/no-JS, drives the layout
 * box, and is restored instantly if anything fails.
 */
/* global requestAnimationFrame, cancelAnimationFrame, ResizeObserver, IntersectionObserver */
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

const easeOutCubic = t => 1 - Math.pow(1 - t, 3)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export default class Hero3DLogo {
  constructor (img, opts = {}) {
    this.img = img
    this.modelUrl = opts.modelUrl || img.dataset.glb || '/electerm.glb'
    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    this.mouse = { x: 0, y: 0 }
    this.entry = 0
    this.clock = new THREE.Clock()
    this._inView = true
    this._paused = false
    this.destroyed = false
    this.start()
  }

  async start () {
    try {
      this._buildWrapper()
      this._initThree()
      this._setupLights()
      await this._loadModel()
      this._fit()
      this._bind()
      this._loop()
    } catch (err) {
      console.warn('[hero-3d-logo] disabled, keeping PNG logo:', err)
      this.destroy()
    }
  }

  // Wrap the <img> in a relative box; the canvas overlays it exactly.
  _buildWrapper () {
    const img = this.img
    const wrap = document.createElement('div')
    wrap.className = 'hero-logo-wrap'
    wrap.style.cssText = 'position:relative;display:inline-block;line-height:0'
    img.parentNode.insertBefore(wrap, img)
    wrap.appendChild(img)
    this.wrap = wrap

    const canvas = document.createElement('canvas')
    canvas.className = 'hero-logo-3d'
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;transition:none'
    wrap.appendChild(canvas)
    this.canvas = canvas
  }

  _initThree () {
    const renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    this.renderer = renderer

    const scene = new THREE.Scene()
    this.scene = scene

    // Soft studio reflections — this is what makes a pure-black surface readable.
    const pmrem = new THREE.PMREMGenerator(renderer)
    this.envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = this.envMap
    this.pmrem = pmrem

    this.camera = new THREE.PerspectiveCamera(24, 1, 0.1, 100)
    this.camera.position.set(0, 0, 10)

    this.group = new THREE.Group()
    scene.add(this.group)
  }

  _setupLights () {
    const scene = this.scene
    const key = new THREE.DirectionalLight(0xffffff, 2.4)
    key.position.set(3, 4, 6)
    scene.add(key)
    const rim = new THREE.DirectionalLight(0x99bbff, 2.0)
    rim.position.set(-5, -1, -5)
    scene.add(rim)
    const fill = new THREE.DirectionalLight(0xffffff, 0.5)
    fill.position.set(-3, 2, 4)
    scene.add(fill)
    scene.add(new THREE.AmbientLight(0xffffff, 0.15))
  }

  async _loadModel () {
    const gltf = await new GLTFLoader().loadAsync(this.modelUrl)
    const model = gltf.scene

    const box = new THREE.Box3().setFromObject(model)
    this.size = box.getSize(new THREE.Vector3())
    model.position.sub(box.getCenter(new THREE.Vector3()))

    // The baked material is pure black; lean on reflections so edges/bevels catch light.
    model.traverse(o => {
      if (o.isMesh && o.material) {
        const m = o.material
        m.envMapIntensity = 1.7
        m.needsUpdate = true
      }
    })

    this.model = model
    this.group.add(model)

    // Entry pose
    this.group.scale.setScalar(0.7)
    this.group.rotation.set(0, -1.1, 0)
    if (this.reduceMotion) this.entry = 1
  }

  // Frame the (very wide) wordmark to fit the logo box.
  _fit () {
    const w = this.wrap.clientWidth || this.img.clientWidth || 1
    const h = this.wrap.clientHeight || this.img.clientHeight || 1
    this.renderer.setSize(w, h, false)
    const aspect = w / h
    this.camera.aspect = aspect
    const size = this.size
    const fov = this.camera.fov * Math.PI / 180
    const hFov = 2 * Math.atan(Math.tan(fov / 2) * aspect)
    const distW = (size.x / 2) / Math.tan(hFov / 2)
    const distH = (size.y / 2) / Math.tan(fov / 2)
    const dist = Math.max(distW, distH) * 1.1
    this.camera.position.set(0, 0, dist)
    this.camera.updateProjectionMatrix()

    if (this.entry >= 1) this._renderOnce()
  }

  _bind () {
    this._onMove = e => {
      const hero = this.img.closest('.hero') || this.wrap
      const r = hero.getBoundingClientRect()
      const nx = (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)
      const ny = (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2)
      this.mouse.x = clamp(nx, -1, 1)
      this.mouse.y = clamp(ny, -1, 1)
    }
    window.addEventListener('pointermove', this._onMove, { passive: true })

    this._onResize = () => this._fit()
    if (window.ResizeObserver) {
      this._ro = new ResizeObserver(this._onResize)
      this._ro.observe(this.wrap)
    } else {
      window.addEventListener('resize', this._onResize)
    }

    this._onVis = () => { this._paused = document.hidden }
    document.addEventListener('visibilitychange', this._onVis)

    if (window.IntersectionObserver) {
      this._io = new IntersectionObserver(entries => {
        this._inView = entries[0].isIntersecting
      }, { threshold: 0.05 })
      this._io.observe(this.wrap)
    }
  }

  _loop () {
    if (this.destroyed) return
    this._raf = requestAnimationFrame(() => this._loop())
    if (this._paused || !this._inView) return

    const dt = Math.min(this.clock.getDelta(), 0.05)
    const t = this.clock.elapsedTime

    // Entry: fade canvas in, fade PNG out, scale + unroll.
    if (this.entry < 1) {
      this.entry = Math.min(1, this.entry + dt / 1.15)
      const e = easeOutCubic(this.entry)
      this.group.scale.setScalar(0.7 + 0.3 * e)
      this.group.rotation.y = -1.1 * (1 - e)
      this.canvas.style.opacity = String(e)
      this.img.style.transition = 'opacity .6s ease'
      this.img.style.opacity = String(1 - e)
    }

    const reduce = this.reduceMotion
    // Mouse-driven target orientation.
    const yawT = this.mouse.x * (reduce ? 0.18 : 0.5)
    const pitchT = -this.mouse.y * (reduce ? 0.1 : 0.32)
    const rollT = this.mouse.x * 0.06
    // Gentle idle motion blended in when the pointer is idle.
    const idleY = reduce ? 0 : Math.sin(t * 0.3) * 0.1
    const idleP = reduce ? 0 : Math.sin(t * 0.45 + 1.2) * 0.04

    const k = 0.08
    if (this.entry >= 1) {
      this.group.rotation.y += ((yawT + idleY) - this.group.rotation.y) * k
      this.group.rotation.x += ((pitchT + idleP) - this.group.rotation.x) * k
      this.group.rotation.z += (rollT - this.group.rotation.z) * k
      if (!reduce) {
        this.group.position.y = Math.sin(t * 0.9) * 0.04
        this.group.position.x = -this.mouse.x * 0.12
      }
    }

    this.renderer.render(this.scene, this.camera)
  }

  _renderOnce () {
    this.renderer.render(this.scene, this.camera)
  }

  destroy () {
    this.destroyed = true
    if (this._raf) cancelAnimationFrame(this._raf)
    window.removeEventListener('pointermove', this._onMove)
    document.removeEventListener('visibilitychange', this._onVis)
    window.removeEventListener('resize', this._onResize)
    if (this._ro) this._ro.disconnect()
    if (this._io) this._io.disconnect()
    try {
      if (this.pmrem) this.pmrem.dispose()
      if (this.envMap) this.envMap.dispose()
      if (this.model) {
        this.model.traverse(o => {
          if (o.geometry) o.geometry.dispose()
          if (o.material) o.material.dispose()
        })
      }
      if (this.renderer) this.renderer.dispose()
    } catch (e) { /* noop */ }

    // Restore the PNG.
    if (this.canvas) this.canvas.remove()
    if (this.wrap && this.wrap.parentNode) {
      while (this.wrap.firstChild) this.wrap.parentNode.insertBefore(this.wrap.firstChild, this.wrap)
      this.wrap.remove()
    }
    if (this.img) {
      this.img.style.opacity = ''
      this.img.style.transition = ''
    }
  }
}
