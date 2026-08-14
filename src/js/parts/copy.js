// Shared clipboard helpers (used by about + sponsor pages).

export function fallbackCopy (text) {
  var ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  try { document.execCommand('copy') } catch (e) {}
  document.body.removeChild(ta)
}

export function copyText (text) {
  return new Promise(function (resolve) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(resolve)
        .catch(function () { fallbackCopy(text); resolve() })
    } else {
      fallbackCopy(text)
      resolve()
    }
  })
}
