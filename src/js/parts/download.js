// Download section behavior: OS auto-detect + tab switching, architecture
// switching, Android QR modal, and "copy install command" buttons.
// Localized strings are read from data-* attributes set in the Pug template
// (so this module stays free of server-side templating).
function detectOS () {
  const p = navigator.platform.toLowerCase()
  const u = navigator.userAgent.toLowerCase()
  if (p.includes('mac') || u.includes('mac')) return 'mac'
  if (p.includes('win') || u.includes('windows')) return 'windows'
  if (p.includes('linux') || u.includes('linux')) return 'linux'
  if (p.includes('android') || u.includes('android')) return 'android'
  return 'windows'
}

function switchTab (os) {
  document.querySelectorAll('.download-tab-btn').forEach(function (b) {
    b.classList.toggle('active', b.getAttribute('data-tab') === os)
  })
  document.querySelectorAll('.download-panel').forEach(function (p) {
    p.classList.toggle('active', p.getAttribute('data-tab') === os)
  })
}

function switchArch (btn, arch) {
  const container = btn.closest('.arch-bar').parentElement
  container.querySelectorAll('.arch-btn').forEach(function (b) {
    b.classList.toggle('active', b.getAttribute('data-arch') === arch)
  })
  container.querySelectorAll('.arch-panel').forEach(function (p) {
    p.classList.toggle('active', p.getAttribute('data-arch') === arch)
  })
}

function isAndroidDevice () {
  const u = navigator.userAgent.toLowerCase()
  const p = (navigator.platform || '').toLowerCase()
  return p.includes('android') || u.includes('android')
}

let qrLibLoaded = false
function loadQrLib (cb) {
  if (qrLibLoaded) { cb(); return }
  if (window.qrcode) { qrLibLoaded = true; cb(); return }
  const s = document.createElement('script')
  s.src = '/js/qrcode-generator.min.js'
  s.onload = function () { qrLibLoaded = true; cb() }
  s.onerror = function () { cb(new Error('Failed to load QR library')) }
  document.head.appendChild(s)
}

function showQrModal (url, source) {
  const modal = document.getElementById('androidQrModal')
  const codeEl = document.getElementById('androidQrCode')
  const urlEl = document.getElementById('androidQrUrl')
  const dlEl = document.getElementById('androidQrDownload')
  const srcEl = document.getElementById('androidQrSource')
  if (!modal) return
  urlEl.textContent = url
  dlEl.href = url
  if (srcEl && source) srcEl.textContent = source
  codeEl.innerHTML = '<div class="android-qr-loading">Generating QR code…</div>'
  modal.classList.add('active')
  modal.setAttribute('aria-hidden', 'false')
  loadQrLib(function (err) {
    if (err) {
      codeEl.innerHTML = '<div class="android-qr-error">Failed to generate QR code</div>'
      return
    }
    try {
      const qr = window.qrcode(0, 'M')
      qr.addData(url)
      qr.make()
      codeEl.innerHTML = qr.createSvgTag({
        cellSize: 4,
        margin: 4,
        scalable: true,
        alt: 'QR code for ' + url
      })
    } catch (e) {
      codeEl.innerHTML = '<div class="android-qr-error">Failed to generate QR code</div>'
    }
  })
}

function hideQrModal () {
  const modal = document.getElementById('androidQrModal')
  if (modal) {
    modal.classList.remove('active')
    modal.setAttribute('aria-hidden', 'true')
  }
}

function copyAltCmd (btn) {
  const item = btn.closest('.alt-install-item')
  const code = item && item.querySelector('.alt-install-code code')
  if (!code) return
  const text = code.textContent
  const done = function () {
    const old = btn.textContent
    btn.textContent = btn.dataset.copied
    setTimeout(function () { btn.textContent = old }, 1500)
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done() })
  } else {
    fallbackCopy(text)
    done()
  }
}

function fallbackCopy (text) {
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  try { document.execCommand('copy') } catch (e) {}
  document.body.removeChild(ta)
}

function firstPresentTab () {
  const b = document.querySelector('.download-tab-btn')
  return b ? b.getAttribute('data-tab') : 'windows'
}

document.addEventListener('DOMContentLoaded', function () {
  // Start on the visitor's OS, but fall back to the first available tab if
  // this page (e.g. an older release) doesn't ship that OS.
  const detected = detectOS()
  const detectedPanel = document.querySelector('.download-panel[data-tab="' + detected + '"]')
  switchTab(detectedPanel ? detected : firstPresentTab())
  document.querySelectorAll('.download-tab-btn').forEach(function (b) {
    b.addEventListener('click', function () { switchTab(this.getAttribute('data-tab')) })
  })
  document.querySelectorAll('.arch-bar').forEach(function (bar) {
    bar.querySelectorAll('.arch-btn').forEach(function (b) {
      b.addEventListener('click', function () { switchArch(this, this.getAttribute('data-arch')) })
    })
  })
  document.querySelectorAll('.alt-copy').forEach(function (b) {
    b.addEventListener('click', function () { copyAltCmd(this) })
  })
  // Android QR modal — desktop only, and only when the modal markup exists
  // (release pages that don't render it should let the links navigate).
  if (!isAndroidDevice()) {
    const qrModal = document.getElementById('androidQrModal')
    if (qrModal) {
      const androidPanel = document.querySelector('.download-panel[data-tab="android"]')
      if (androidPanel) {
        androidPanel.querySelectorAll('.download-card-link').forEach(function (link) {
          link.addEventListener('click', function (e) {
            e.preventDefault()
            showQrModal(this.href, this.textContent.trim())
          })
        })
      }
      const closeBtn = document.getElementById('androidQrClose')
      if (closeBtn) closeBtn.addEventListener('click', hideQrModal)
      const overlay = document.querySelector('.android-qr-overlay')
      if (overlay) overlay.addEventListener('click', hideQrModal)
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') hideQrModal()
      })
    }
  }
})
