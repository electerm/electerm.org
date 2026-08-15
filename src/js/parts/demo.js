// Demo section behavior: desktop/mobile mode switch.
// Desktop is the default; mobile mode shrinks the wrapper and
// gives the iframe a 9:16 phone aspect ratio.
function switchMode (mode) {
  var wrapper = document.querySelector('.demo-wrapper')
  if (!wrapper) return
  wrapper.classList.toggle('mobile', mode === 'mobile')
  document.querySelectorAll('.demo-switch-btn').forEach(function (b) {
    var active = b.getAttribute('data-mode') === mode
    b.classList.toggle('active', active)
    b.setAttribute('aria-selected', active ? 'true' : 'false')
  })
}

document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.demo-switch-btn').forEach(function (b) {
    b.addEventListener('click', function () { switchMode(this.getAttribute('data-mode')) })
  })
})
