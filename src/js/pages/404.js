// 404 page.
import '../parts/header.js'

// Auto-redirect to downloads section if URL hash suggests it
(function () {
  var path = window.location.pathname
  if (path.includes('download') || path.includes('release')) {
    document.querySelectorAll('.error-btn-secondary').forEach(function (btn) {
      if (btn.textContent.includes('Download')) {
        btn.href = '/#downloads'
      }
    })
  }
})()
