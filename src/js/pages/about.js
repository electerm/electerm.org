// About page.
import '../parts/site.js'
import '../parts/header.js'
import { copyText } from '../parts/copy.js'

document.addEventListener('DOMContentLoaded', function () {
  const copyBtn = document.querySelector('.about-copy-btn')
  const copyStatus = document.getElementById('copy-status')
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      const address = document.getElementById('trn20-address').textContent.trim()
      copyText(address)
      showCopySuccess()
    })
  }
  function showCopySuccess () {
    if (copyStatus) {
      copyStatus.classList.add('show')
      if (copyBtn) copyBtn.classList.add('success')
      setTimeout(function () {
        copyStatus.classList.remove('show')
        if (copyBtn) copyBtn.classList.remove('success')
      }, 2000)
    }
  }
})
