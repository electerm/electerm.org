// Global site behavior: shared country fetch, analytics, ad networks,
// and ad-spacing logic. Extracted from react-footer.pug.
/* global ResizeObserver */
(function () {
  // === Shared single country fetch for all consumers ===
  window.__countryPromise = fetch('/api/country')
    .then(function (r) { return r.json() })
    .then(function (d) { return (d.country || '').toUpperCase() })
    .catch(function () { return null })

  // === Google Analytics ===
  const s1 = document.createElement('script')
  s1.async = true
  s1.src = 'https://www.googletagmanager.com/gtag/js?id=G-LCY5SM7M8J'
  document.head.appendChild(s1)
  window.dataLayer = window.dataLayer || []
  function gtag () { window.dataLayer.push(arguments) }
  gtag('js', new Date())
  gtag('config', 'G-LCY5SM7M8J')

  // === EthicalAds — only for non-CN visitors ===
  window.__countryPromise.then(function (cc) {
    const adWrapper = document.querySelector('.ethical-ad-wrapper')
    if (!adWrapper) return

    const adUnit = adWrapper.querySelector('.ethical-ad-unit')
    if (!adUnit) return

    const BP_MOBILE = 480
    const BP_WIDE = 1420
    let currentMode = null

    // Three ad modes:
    //  'v-image'  → >= 1420px: vertical image ad (corner card)
    //  'h-image'  → 480px-1419px: horizontal image ad (bottom bar)
    //  'text'     → < 480px: text ad (bottom bar)
    function getMode (vw) {
      if (vw < BP_MOBILE) return 'text'
      if (vw < BP_WIDE) return 'h-image'
      return 'v-image'
    }

    function updateAd () {
      const vw = window.innerWidth || document.documentElement.clientWidth
      const mode = getMode(vw)

      // Set the ad type attribute and horizontal class.
      // reload() re-reads data-ea-type so the correct ad type loads.
      const newType = (mode === 'text') ? 'text' : 'image'
      const oldType = adUnit.getAttribute('data-ea-type')

      if (mode === 'h-image') {
        adUnit.classList.add('horizontal')
      } else {
        adUnit.classList.remove('horizontal')
      }

      // Reload when mode changes (different ad type or layout).
      // EthicalAds reload() clears the element and re-fetches an ad.
      if (mode !== currentMode) {
        currentMode = mode
        if (newType !== oldType) {
          adUnit.setAttribute('data-ea-type', newType)
        }
        if (window.ethicalads && window.ethicalads.reload) {
          window.ethicalads.reload()
        }
      }
    }

    // Show the ad container and load EthicalAds script.
    adWrapper.classList.add('ethical-ad-active')
    const s = document.createElement('script')
    s.async = true
    s.src = 'https://media.ethicalads.io/media/client/ethicalads.min.js'
    document.body.appendChild(s)

    // Set initial mode before EthicalAds loads.
    // The initial data-ea-type is already "image"; if we're on mobile,
    // switch to "text" before the ad script scans the element.
    const initVw = window.innerWidth || document.documentElement.clientWidth
    const initMode = getMode(initVw)
    currentMode = initMode
    if (initMode === 'text') {
      adUnit.setAttribute('data-ea-type', 'text')
    } else if (initMode === 'h-image') {
      adUnit.classList.add('horizontal')
    }

    // Re-evaluate on resize (debounced)
    let adRt = null
    window.addEventListener('resize', function () {
      if (adRt) clearTimeout(adRt)
      adRt = setTimeout(updateAd, 150)
    })
  });

  // === Ad spacing: keep the fixed ad bar/card (EthicalAds or Carbon Ads) from covering footer content ===
  (function () {
    const wrapper = document.querySelector('.ethical-ad-wrapper, .carbon-ad-wrapper')
    const footer = document.querySelector('footer.site-footer')
    if (!wrapper) return
    const BP = 1420
    function apply () {
      const h = wrapper.offsetHeight || 0
      const vw = window.innerWidth || document.documentElement.clientWidth
      if (vw < BP) {
        // < 1420px: full-width fixed bar pinned to viewport bottom.
        // Reserve space on <body> so the bar never hides the footer.
        document.body.style.paddingBottom = h + 'px'
        if (footer) {
          footer.style.paddingBottom = ''
          footer.style.setProperty('--watermark-height', '0px')
          footer.style.setProperty('--watermark-bottom', '0px')
          footer.style.setProperty('--watermark-bg-size', '0px')
        }
      } else {
        // >= 1420px: corner card fixed 24px above the viewport bottom-right.
        // Reserve space inside the footer and show watermark in the reserved area.
        document.body.style.paddingBottom = ''
        if (footer) {
          if (h > 0) {
            const ph = (h + 32) // total extra padding
            // watermark element takes 60% of padding, centred
            const wh = Math.round(ph * 0.6)
            const wb = Math.round((ph - wh) / 2)
            // logo bg-width ~1.2x of padding height (~42% of watermark el height × 2.88 ratio)
            const bg = Math.round(ph * 1.2)
            footer.style.paddingBottom = ph + 'px'
            footer.style.setProperty('--watermark-height', wh + 'px')
            footer.style.setProperty('--watermark-bottom', wb + 'px')
            footer.style.setProperty('--watermark-bg-size', bg + 'px')
          } else {
            footer.style.paddingBottom = ''
            footer.style.setProperty('--watermark-height', '0px')
            footer.style.setProperty('--watermark-bottom', '0px')
            footer.style.setProperty('--watermark-bg-size', '0px')
          }
        }
      }
    }
    if (window.ResizeObserver) {
      new ResizeObserver(function () { apply() }).observe(wrapper)
    }
    let rt = null
    window.addEventListener('resize', function () {
      if (rt) clearTimeout(rt)
      rt = setTimeout(apply, 100)
    })
    apply()
    // ethicalads loads async; re-measure once creatives likely rendered
    setTimeout(apply, 1500)
    setTimeout(apply, 3000)
  })()

  // === Carbon Ads — only for non-CN visitors ===
  // Carbon's carbon.js is injected into the container only when the visitor
  // is outside China, mirroring the EthicalAds gating above.
  window.__countryPromise.then(function (cc) {
    const wrapper = document.querySelector('.carbon-ad-wrapper')
    if (!wrapper) return
    if (cc === 'CN') return
    wrapper.classList.add('carbon-ad-active')
    const s = document.createElement('script')
    s.async = true
    s.type = 'text/javascript'
    s.src = '//cdn.carbonads.com/carbon.js?serve=CWBDE2JL&placement=electermorg&format=responsive'
    s.id = '_carbonads_js'
    wrapper.appendChild(s)
  })
})()
