// Header behavior: the language dropdown, and the shared language setting
// (./lang.js) that the Blog nav links follow.
import './lang.js'

// Lang dropdown: close when clicking outside of it.
document.addEventListener('click', function (e) {
  const dd = document.querySelector('.lang-dropdown')
  if (dd && !dd.contains(e.target)) dd.classList.remove('open')
})
