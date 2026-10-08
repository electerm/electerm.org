// Sponsors rendered by src/views/parts/sponsors.pug.
// Injected as `sponsors` (see bin/data.js), one entry per tier.
//
// A tier is its own row and never mixes with another one. Every sponsor in a
// tier shows its mark at the same *visible* height (TIER_HEIGHT below), because
// the logo files carry wildly different padding: atlas-cloud.png spends 79% of
// its height on empty space, apimart.jpg only 16%. Giving them one box size
// would make the marks look like different sizes.
//
// So each logo records two measured pixel boxes from its own file:
//   logo — the file's full size
//   ink  — bounding box of the artwork (non-transparent, or non-background
//          pixels for the opaque ones)
// `badge()` turns those into a box the size of the mark, plus the background
// scale/offset that crops the padding away. Adding a sponsor = measure those
// two boxes and add an entry; nothing else to tune.
const TIER_HEIGHT = { 1: 40, 2: 34, 3: 24 }

const pct = v => +(v * 100).toFixed(3)

function badge (tier, sponsor) {
  const { logo, ink } = sponsor
  const height = TIER_HEIGHT[tier]
  const scale = height / ink.h
  return {
    ...sponsor,
    // the box is the mark itself, so no stray padding shows
    width: Math.round(ink.w * scale),
    height,
    // blow the file up until its padding falls outside the box...
    bgSizeW: pct(logo.w / ink.w),
    bgSizeH: pct(logo.h / ink.h),
    // ...then line the ink box up with the box edges
    bgPosX: pct(logo.w > ink.w ? ink.x / (logo.w - ink.w) : 0),
    bgPosY: pct(logo.h > ink.h ? ink.y / (logo.h - ink.h) : 0)
  }
}

const tiers = [
  {
    tier: 1,
    sponsors: [
      {
        name: 'Atlas Cloud',
        url: 'https://www.atlascloud.ai?ref=PCAEL2&utm_source=github&utm_medium=link&utm_campaign=electerm',
        logo: {
          src: 'https://cdn.jsdelivr.net/gh/electerm/electerm-resource@master/static/images/atlas-cloud.png',
          w: 400,
          h: 259
        },
        ink: { x: 7, y: 103, w: 386, h: 53 }
      }
    ]
  },
  {
    tier: 2,
    sponsors: [
      {
        name: 'PackyCode',
        url: 'https://www.packyapi.ai/register?aff=LO2c',
        logo: {
          src: 'https://cdn.jsdelivr.net/gh/electerm/electerm-resource@master/static/images/packy-api.png',
          w: 400,
          h: 160
        },
        ink: { x: 50, y: 48, w: 302, h: 69 }
      },
      {
        name: 'FluxionAI',
        url: 'https://fluxionai.world/register?source=github&campaign=electerm-20260923&promo=ELECTERM&aff=7H7DERHU3GFF&utm_source=github&utm_medium=link&utm_campaign=electerm',
        logo: {
          src: 'https://cdn.jsdelivr.net/gh/electerm/electerm-resource@master/static/images/fluxionai.png',
          w: 389,
          h: 197
        },
        ink: { x: 17, y: 74, w: 357, h: 92 }
      },
      {
        name: 'ApiSmart',
        url: 'https://www.apismart.ai',
        logo: {
          src: 'https://cdn.jsdelivr.net/gh/electerm/electerm-resource@master/static/images/apismart400x400.png',
          w: 400,
          h: 400
        },
        ink: { x: 15, y: 162, w: 370, h: 80 }
      },
      {
        name: 'ApiMart',
        url: 'https://go.apimart.ai/gh-electerm',
        logo: {
          src: 'https://cdn.jsdelivr.net/gh/electerm/electerm-resource@master/static/images/apimart.jpg',
          w: 2172,
          h: 724
        },
        ink: { x: 120, y: 36, w: 2024, h: 609 }
      }
    ]
  },
  {
    tier: 3,
    sponsors: [
      {
        name: 'DigitalOcean',
        url: 'https://www.digitalocean.com/?refcode=c10bcb28b846&utm_campaign=Referral_Invite&utm_medium=Referral_Program&utm_source=badge',
        logo: {
          src: 'https://web-platforms.sfo2.cdn.digitaloceanspaces.com/WWW/Badge%202.svg',
          w: 200,
          h: 65
        },
        // the SVG is a white card; ink is the artwork inside it
        ink: { x: 23, y: 16, w: 155, h: 34 }
      },
      {
        name: 'Vercel OSS Program',
        url: 'https://oss-directory.vercel.app',
        logo: {
          src: 'https://cdn.jsdelivr.net/gh/electerm/electerm-resource@master/static/images/vercel-oss-2005.png',
          w: 240,
          h: 24
        },
        ink: { x: 0, y: 0, w: 240, h: 24 }
      }
    ]
  }
]

export default tiers.map(t => ({
  tier: t.tier,
  sponsors: t.sponsors.map(s => badge(t.tier, s))
}))
