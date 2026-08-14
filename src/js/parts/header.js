// Lang dropdown: close when clicking outside of it.
document.addEventListener('click', function (e) {
  var dd = document.querySelector('.lang-dropdown')
  if (dd && !dd.contains(e.target)) dd.classList.remove('open')
})
