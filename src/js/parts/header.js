// Header behavior: the language dropdown, the colour theme switch, and the
// shared language setting (./lang.js) that the Blog nav links follow.
import './lang.js'
import { initTheme } from './theme.js'

initTheme()

// Lang dropdown: close when clicking outside of it.
document.addEventListener('click', function (e) {
  const dd = document.querySelector('.lang-dropdown')
  if (dd && !dd.contains(e.target)) dd.classList.remove('open')
})
