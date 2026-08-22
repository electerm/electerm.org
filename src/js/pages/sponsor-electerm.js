// Sponsor page.
import '../parts/site.js'
import '../parts/header.js'
import { copyText } from '../parts/copy.js'

document.addEventListener('DOMContentLoaded', function () {
  const copyBtn = document.querySelector('.copy-btn')
  const copyStatus = document.getElementById('copy-status')
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      const address = document.getElementById('trn20-address').textContent.trim()
      copyText(address)
      showCopySuccess()
    })
  }
  function showCopySuccess () {
    copyBtn.classList.add('success')
    copyBtn.textContent = '✓'
    copyStatus.classList.add('show')
    setTimeout(function () {
      copyBtn.classList.remove('success')
      copyBtn.textContent = '📋'
      copyStatus.classList.remove('show')
    }, 2000)
  }
})
