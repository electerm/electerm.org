// Hero section init: the canvas tech animation (#hero-anim) and the optional
// 3D logo overlay (.hero-logo). The 3D logo pulls in three.js via the importmap,
// so it is loaded as a dynamic import — if three.js fails to load, the PNG logo
// stays and the rest of the page JS is unaffected.
import HeroAnimate from './animate.js'

const heroEl = document.getElementById('hero-anim')
if (heroEl) {
  // instance kept reachable on the element (handy for teardown/debugging)
  try { heroEl.__heroAnimate = new HeroAnimate(heroEl) } catch (e) { console.warn('[hero] animate init failed', e) }
}

const logo = document.querySelector('.hero-logo')
if (logo) {
  import('./hero-3d-logo.js')
    .then(function (m) {
      const { default: Hero3DLogo } = m
      try { logo.__hero3DLogo = new Hero3DLogo(logo, { modelUrl: '/electerm.glb' }) } catch (e) { console.warn('[hero-3d-logo] init failed', e) }
    })
    .catch(function (err) { console.warn('[hero-3d-logo] init failed, keeping PNG logo', err) })
}
