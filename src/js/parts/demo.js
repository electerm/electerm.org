// Demo section behavior: desktop/mobile mode switch.
// Desktop is the default; mobile mode shrinks the wrapper and
// gives the iframe a 9:16 phone aspect ratio.
function switchMode (mode) {
  const wrapper = document.querySelector('.demo-wrapper')
  if (!wrapper) return
  wrapper.classList.toggle('mobile', mode === 'mobile')
  document.querySelectorAll('.demo-switch-btn').forEach(function (b) {
    const active = b.getAttribute('data-mode') === mode
    b.classList.toggle('active', active)
    b.setAttribute('aria-selected', active ? 'true' : 'false')
  })
}

document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.demo-switch-btn').forEach(function (b) {
    b.addEventListener('click', function () { switchMode(this.getAttribute('data-mode')) })
  })
  // Auto switch to mobile mode when viewport is narrow,
  // and back to desktop when it becomes wide again.
  // Manual clicks still work and persist until the next breakpoint crossing.
  const mq = window.matchMedia('(max-width: 767px)')
  const applyAutoMode = function () {
    switchMode(mq.matches ? 'mobile' : 'desktop')
  }
  applyAutoMode()
  if (typeof mq.addEventListener === 'function') {
    mq.addEventListener('change', applyAutoMode)
  } else if (typeof mq.addListener === 'function') {
    mq.addListener(applyAutoMode)
  }
})
