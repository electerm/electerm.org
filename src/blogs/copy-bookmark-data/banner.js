/**
 * Animated banner for the "copy bookmark data" blog post.
 *
 * Everything is generated here — no image, no GIF, no canvas: the background,
 * the electerm window (icon rail, terminal tab bar, settings panel with its card
 * tabs, the bookmark list column, the bookmark form, the copy dropdown, the
 * pointer and its ripples, the "copied" toast and the result card) are all plain
 * DOM + CSS driven by one requestAnimationFrame timeline.
 *
 * Modelled on the real electerm UI. Colours and metrics come from the app:
 *   UI theme .......... src/client/css/includes/theme.styl, with the shipped
 *                       dark theme injected over it (src/client/common/
 *                       theme-defaults.js, defaultThemeDark) — hence --main
 *                       #121214 and --main-dark #000
 *   antd defaults ..... the app renders antd with no ConfigProvider, so primary
 *                       is #1677ff, borders #d9d9d9, ink rgba(0,0,0,.88)
 *   tab bar / tabs .... src/client/components/tabs/tabs.styl (36px bar against
 *                       a 14px font, min-width 100px, radii 3px 3px 0 0)
 *   tab status dot .... src/client/components/tabs/tab.jsx (grey off, success on)
 *   tab title ......... src/client/common/create-title.jsx (user@host:port)
 *   sidebar rail ...... src/client/components/sidebar/sidebar.styl (43px wide,
 *                       --main-dark, full height)
 *   settings panel .... setting-panel/setting-modal.jsx + setting-wrap.styl: an
 *                       antd Tabs with type='card' (setting / bookmarks /
 *                       UI Themes / quick commands / triggers Beta / profiles /
 *                       widgets Beta)
 *   two columns ....... setting-panel/col.jsx + setting-wrap.styl
 *                       (.setting-row-left 440px bookmark tree list,
 *                       .setting-row-right from 483px — the form)
 *   bookmark rows ..... tree-list.styl (.tree-item: line-height 26px, radius
 *                       3px; hover and .selected are both #000 / #eee)
 *   form header ....... bookmark-form/index.jsx render(): BookOutlined, the
 *                       "edit bookmarks" label, the bookmark title in <b>, then
 *                       the copy button (float right)
 *   type radios ....... the same render() — an antd Radio.Group of Radio.Buttons
 *                       over Object.keys(sessionConfig), with ssh relabelled
 *                       "Ssh/Sftp"; the other labels are the protocol names
 *   copy menu ......... bookmark-form/copy-bookmark.jsx: an antd Dropdown,
 *                       placement bottomRight, two items — quick connect (with
 *                       a one-line preview, disabled when the type has no string
 *                       form) and JSON. Labels truncate at 50 chars.
 *   copied toast ...... common/clipboard.js + components/common/message.styl
 *                       (a --main-lighter toast near the top of the window, with
 *                       a green CheckCircleFilled)
 *   the strings ....... common/quick-connect-string.js, run against real
 *                       bookmarks: ssh://admin@10.0.0.1:2222 keeps the port
 *                       because 2222 is not ssh's default
 *
 * The story, in order:
 *   1. the pointer arrives at the copy button in the form header and clicks it;
 *   2. the dropdown opens with the two rows — the one-line quick connect string,
 *      and the whole record as JSON — and a chip names what is on offer;
 *   3. the pointer picks the quick connect row; the row flashes, the menu closes
 *      and the app's "copied" toast appears over the window;
 *   4. a result card shows what is on the clipboard and where it can be pasted.
 *
 * Mount points: any element carrying [data-eb-banner]:
 *   data-eb-banner="hero"  -> headline + result card + the window
 *   data-eb-banner="card"  -> the window only, a compact result pill above it
 * Every banner script on the blog index is loaded for every card, so a mount
 * also has to match data-eb-banner-src (the module the template loaded for that
 * post) — otherwise the first script to run would claim every card.
 *
 * One deliberate liberty: the settings panel is drawn as a full-width panel
 * beside the icon rail, which is what the app does, but the terminal tab bar
 * stays above it so the window still reads as electerm rather than as a generic
 * settings dialog.
 *
 * The whole layout is expressed in `em`, and the root font-size is kept at 1% of
 * the banner width, so one design scales from the hero to the card. Anything
 * whose flex-basis must mean banner-em keeps font-size 1em and scales its
 * contents in an inner element instead — `flex-basis` resolves against the
 * element's OWN font size, so `flex: 0 0 32em` on a 1.4em element would be
 * 44.8em of banner.
 */

const STYLE_ID = 'eb-cb-style'

// One full pass of the story, in ms.
const PERIOD = 12000

const T = {
  ptrInFrom: 300, // the pointer arrives at the copy button
  ptrInTo: 1050,
  ptrOutFrom: 6500, // its work is done once a row is picked, so it leaves
  ptrOutTo: 7000,
  clickFrom: 1200, // ...and clicks it
  clickTo: 1380,
  dropFrom: 1330, // the dropdown opens
  dropTo: 1830,
  fmtFrom: 2000, // the chip that names what is on offer
  fmtTo: 2400,
  fmtOutFrom: 5000,
  fmtOutTo: 5350,
  ptrRowFrom: 4950, // on to the quick connect row
  ptrRowTo: 5600,
  click2From: 5750,
  click2To: 5930,
  flashFrom: 5800, // the row flashes as it is picked
  flashTo: 6400,
  dropCloseFrom: 6150, // the menu closes
  dropCloseTo: 6550,
  toastFrom: 6300, // "copied"
  toastTo: 6750,
  toastOutFrom: 8600,
  toastOutTo: 9000,
  resFrom: 6900, // the result card: what is on the clipboard now
  resTo: 7450,
  resOutFrom: 10600,
  resOutTo: 11000,
  fadeFrom: 11000,
  fadeTo: 11800
}

// antd glyphs, the same ones the app renders (via @ant-design/icons).
const COPY_PATH = 'M832 64H296c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h496v688c0 4.4 3.6 8 8 8h56c4.4 0 8-3.6 8-8V96c0-17.7-14.3-32-32-32zM704 192H192c-17.7 0-32 14.3-32 32v530.7c0 8.5 3.4 16.6 9.4 22.6l173.3 173.3c2.2 2.2 4.7 4 7.4 5.5v1.9h4.2c3.5 1.3 7.2 2 11 2H704c17.7 0 32-14.3 32-32V224c0-17.7-14.3-32-32-32zM350 856.2L263.9 770H350v86.2zM664 888H414V746c0-22.1-17.9-40-40-40H232V264h432v624z'
const BOOK_PATH = 'M832 64H192c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V96c0-17.7-14.3-32-32-32zm-260 72h96v209.9L621.5 312 572 347.4V136zm220 752H232V136h280v296.9c0 3.3 1 6.6 3 9.3a15.9 15.9 0 0022.3 3.7l83.8-59.9 81.4 59.4c2.7 2 6 3.1 9.4 3.1 8.8 0 16-7.2 16-16V136h64v752z'
const CHECK_PATH = 'M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm193.5 301.7l-210.6 292a31.8 31.8 0 01-51.7 0L318.5 484.9c-3.8-5.3 0-12.7 6.5-12.7h46.9c10.2 0 19.9 4.9 25.9 13.3l71.2 98.8 157.2-218c6-8.3 15.6-13.3 25.9-13.3H699c6.5 0 10.3 7.4 6.5 12.7z'
const SEARCH_PATH = 'M909.6 854.5L649.9 594.8C690.2 542.7 712 479 712 412c0-80.2-31.3-155.4-87.9-212.1-56.6-56.7-132-87.9-212.1-87.9s-155.5 31.3-212.1 87.9C143.2 256.5 112 331.8 112 412c0 80.1 31.3 155.5 87.9 212.1C256.5 680.8 331.8 712 412 712c67 0 130.6-21.8 182.7-62l259.7 259.6a8.2 8.2 0 0011.6 0l43.6-43.5a8.2 8.2 0 000-11.6zM570.4 570.4C528 612.7 471.8 636 412 636s-116-23.3-158.4-65.6C211.3 528 188 471.8 188 412s23.3-116.1 65.6-158.4C296 211.3 352.2 188 412 188s116.1 23.2 158.4 65.6S636 352.2 636 412s-23.3 116.1-65.6 158.4z'
const SORT_PATH = 'M839.6 433.8L749 150.5a9.24 9.24 0 00-8.9-6.5h-77.4c-4.1 0-7.6 2.6-8.9 6.5l-91.3 283.3c-.3.9-.5 1.9-.5 2.9 0 5.1 4.2 9.3 9.3 9.3h56.4c4.2 0 7.8-2.8 9-6.8l17.5-61.6h89l17.3 61.5c1.1 4 4.8 6.8 9 6.8h61.2c1 0 1.9-.1 2.8-.4 2.4-.8 4.3-2.4 5.5-4.6 1.1-2.2 1.3-4.7.6-7.1zM663.3 325.5l32.8-116.9h6.3l32.1 116.9h-71.2zm143.5 492.9H677.2v-.4l132.6-188.9c1.1-1.6 1.7-3.4 1.7-5.4v-36.4c0-5.1-4.2-9.3-9.3-9.3h-204c-5.1 0-9.3 4.2-9.3 9.3v43c0 5.1 4.2 9.3 9.3 9.3h122.6v.4L587.7 828.9a9.35 9.35 0 00-1.7 5.4v36.4c0 5.1 4.2 9.3 9.3 9.3h211.4c5.1 0 9.3-4.2 9.3-9.3v-43a9.2 9.2 0 00-9.2-9.3zM416 702h-76V172c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v530h-76c-6.7 0-10.5 7.8-6.3 13l112 141.9a8 8 0 0012.6 0l112-141.9c4.1-5.2.4-13-6.3-13z'
const CARET_DOWN_PATH = 'M884 256h-75c-5.1 0-9.9 2.5-12.9 6.6L512 654.2 227.9 262.6c-3-4.1-7.8-6.6-12.9-6.6h-75c-6.5 0-10.3 7.4-6.5 12.7l352.6 486.1c12.8 17.6 39 17.6 51.7 0l352.6-486.1c3.9-5.3.1-12.7-6.4-12.7z'
const PLUS_PATH = 'M482 152h60q8 0 8 8v704q0 8-8 8h-60q-8 0-8-8V160q0-8 8-8z M192 474h672q8 0 8 8v60q0 8-8 8H160q-8 0-8-8v-60q0-8 8-8z'
const CLOSE_PATH = 'M799.86 166.31c.02 0 .04.02.08.06l57.69 57.7c.04.03.05.05.06.08a.12.12 0 010 .06c0 .03-.02.05-.06.09L569.93 512l287.7 287.7c.04.04.05.06.06.09a.12.12 0 010 .07c0 .02-.02.04-.06.08l-57.7 57.69c-.03.04-.05.05-.07.06a.12.12 0 01-.07 0c-.03 0-.05-.02-.09-.06L512 569.93l-287.7 287.7c-.04.04-.06.05-.09.06a.12.12 0 01-.07 0c-.02 0-.04-.02-.08-.06l-57.69-57.7c-.04-.03-.05-.05-.06-.07a.12.12 0 010-.07c0-.03.02-.05.06-.09L454.07 512l-287.7-287.7c-.04-.04-.05-.06-.06-.09a.12.12 0 010-.07c0-.02.02-.04.06-.08l57.7-57.69c.03-.04.05-.05.07-.06a.12.12 0 01.07 0c.03 0 .05.02.09.06L512 454.07l287.7-287.7c.04-.04.06-.05.09-.06a.12.12 0 01.07 0z'
const PLUS_CIRCLE_PATH = 'M696 480H544V328c0-4.4-3.6-8-8-8h-48c-4.4 0-8 3.6-8 8v152H328c-4.4 0-8 3.6-8 8v48c0 4.4 3.6 8 8 8h152v152c0 4.4 3.6 8 8 8h48c4.4 0 8-3.6 8-8V544h152c4.4 0 8-3.6 8-8v-48c0-4.4-3.6-8-8-8zM512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z'
const THUNDER_PATH = 'M848 359.3H627.7L825.8 109c4.1-5.3.4-13-6.3-13H436c-2.8 0-5.5 1.5-6.9 4L170 547.5c-3.1 5.3.7 12 6.9 12h174.4l-89.4 357.6c-1.9 7.8 7.5 13.3 13.3 7.7L853.5 373c5.2-4.9 1.7-13.7-5.5-13.7zM378.2 732.5l60.3-241H281.1l189.6-327.4h224.6L487 427.4h211L378.2 732.5z'
const PICTURE_PATH = 'M928 160H96c-17.7 0-32 14.3-32 32v640c0 17.7 14.3 32 32 32h832c17.7 0 32-14.3 32-32V192c0-17.7-14.3-32-32-32zm-40 632H136v-39.9l138.5-164.3 150.1 178L658.1 489 888 761.6V792zm0-129.8L664.2 396.8c-3.2-3.8-9-3.8-12.2 0L424.6 666.4l-144-170.7c-3.2-3.8-9-3.8-12.2 0L136 652.7V232h752v430.2zM304 456a88 88 0 100-176 88 88 0 000 176zm0-116c15.5 0 28 12.5 28 28s-12.5 28-28 28-28-12.5-28-28 12.5-28 28-28z'
const SETTING_PATH = 'M924.8 625.7l-65.5-56c3.1-19 4.7-38.4 4.7-57.8s-1.6-38.8-4.7-57.8l65.5-56a32.03 32.03 0 009.3-35.2l-.9-2.6a443.74 443.74 0 00-79.7-137.9l-1.8-2.1a32.12 32.12 0 00-35.1-9.5l-81.3 28.9c-30-24.6-63.5-44-99.7-57.6l-15.7-85a32.05 32.05 0 00-25.8-25.7l-2.7-.5c-52.1-9.4-106.9-9.4-159 0l-2.7.5a32.05 32.05 0 00-25.8 25.7l-15.8 85.4a351.86 351.86 0 00-99 57.4l-81.9-29.1a32 32 0 00-35.1 9.5l-1.8 2.1a446.02 446.02 0 00-79.7 137.9l-.9 2.6c-4.5 12.5-.8 26.5 9.3 35.2l66.3 56.6c-3.1 18.8-4.6 38-4.6 57.1 0 19.2 1.5 38.4 4.6 57.1L99 625.5a32.03 32.03 0 00-9.3 35.2l.9 2.6c18.1 50.4 44.9 96.9 79.7 137.9l1.8 2.1a32.12 32.12 0 0035.1 9.5l81.9-29.1c29.8 24.5 63.1 43.9 99 57.4l15.8 85.4a32.05 32.05 0 0025.8 25.7l2.7.5a449.4 449.4 0 00159 0l2.7-.5a32.05 32.05 0 0025.8-25.7l15.7-85a350 350 0 0099.7-57.6l81.3 28.9a32 32 0 0035.1-9.5l1.8-2.1c34.8-41.1 61.6-87.5 79.7-137.9l.9-2.6c4.5-12.3.8-26.3-9.3-35zM788.3 465.9c2.5 15.1 3.8 30.6 3.8 46.1s-1.3 31-3.8 46.1l-6.6 40.1 74.7 63.9a370.03 370.03 0 01-42.6 73.6L721 702.8l-31.4 25.8c-23.9 19.6-50.5 35-79.3 45.8l-38.1 14.3-17.9 97a377.5 377.5 0 01-85 0l-17.9-97.2-37.8-14.5c-28.5-10.8-55-26.2-78.7-45.7l-31.4-25.9-93.4 33.2c-17-22.9-31.2-47.6-42.6-73.6l75.5-64.5-6.5-40c-2.4-14.9-3.7-30.3-3.7-45.5 0-15.3 1.2-30.6 3.7-45.5l6.5-40-75.5-64.5c11.3-26.1 25.6-50.7 42.6-73.6l93.4 33.2 31.4-25.9c23.7-19.5 50.2-34.9 78.7-45.7l37.9-14.3 17.9-97.2c28.1-3.2 56.8-3.2 85 0l17.9 97 38.1 14.3c28.7 10.8 55.4 26.2 79.3 45.8l31.4 25.8 92.8-32.9c17 22.9 31.2 47.6 42.6 73.6L781.8 426l6.5 39.9zM512 326c-97.2 0-176 78.8-176 176s78.8 176 176 176 176-78.8 176-176-78.8-176-176-176zm79.2 255.2A111.6 111.6 0 01512 614c-29.9 0-58-11.7-79.2-32.8A111.6 111.6 0 01400 502c0-29.9 11.7-58 32.8-79.2C454 401.6 482.1 390 512 390c29.9 0 58 11.6 79.2 32.8A111.6 111.6 0 01624 502c0 29.9-11.7 58-32.8 79.2z'
const CLOUD_SYNC_PATH = 'M811.4 368.9C765.6 248 648.9 162 512.2 162S258.8 247.9 213 368.8C126.9 391.5 63.5 470.2 64 563.6 64.6 668 145.6 752.9 247.6 762c4.7.4 8.7-3.3 8.7-8v-60.4c0-4-3-7.4-7-7.9-27-3.4-52.5-15.2-72.1-34.5-24-23.5-37.2-55.1-37.2-88.6 0-28 9.1-54.4 26.2-76.4 16.7-21.4 40.2-36.9 66.1-43.7l37.9-10 13.9-36.7c8.6-22.8 20.6-44.2 35.7-63.5 14.9-19.2 32.6-36 52.4-50 41.1-28.9 89.5-44.2 140-44.2s98.9 15.3 140 44.3c19.9 14 37.5 30.8 52.4 50 15.1 19.3 27.1 40.7 35.7 63.5l13.8 36.6 37.8 10c54.2 14.4 92.1 63.7 92.1 120 0 33.6-13.2 65.1-37.2 88.6-19.5 19.2-44.9 31.1-71.9 34.5-4 .5-6.9 3.9-6.9 7.9V754c0 4.7 4.1 8.4 8.8 8 101.7-9.2 182.5-94 183.2-198.2.6-93.4-62.7-172.1-148.6-194.9z'
const APPSTORE_PATH = 'M464 144H160c-8.8 0-16 7.2-16 16v304c0 8.8 7.2 16 16 16h304c8.8 0 16-7.2 16-16V160c0-8.8-7.2-16-16-16zm-52 268H212V212h200v200zm452-268H560c-8.8 0-16 7.2-16 16v304c0 8.8 7.2 16 16 16h304c8.8 0 16-7.2 16-16V160c0-8.8-7.2-16-16-16zm-52 268H612V212h200v200zM464 544H160c-8.8 0-16 7.2-16 16v304c0 8.8 7.2 16 16 16h304c8.8 0 16-7.2 16-16V560c0-8.8-7.2-16-16-16zm-52 268H212V612h200v200zm452-268H560c-8.8 0-16 7.2-16 16v304c0 8.8 7.2 16 16 16h304c8.8 0 16-7.2 16-16V560c0-8.8-7.2-16-16-16zm-52 268H612V612h200v200z'

// The pointer, drawn as an arrow: a banner cannot restyle the real cursor.
const CURSOR_PATH = 'M0 0 L0 30 L7.5 22 L13 33 L19 30 L13.5 19.5 L23 18 Z'

const icon = (path, cls, viewBox = '64 64 896 896') =>
  `<svg class="${cls}" viewBox="${viewBox}" aria-hidden="true"><path d="${path}"/></svg>`

// The rail icons, in the shipped order (config.leftSideBarIcons): new bookmark,
// quick connect, bookmarks, themes, settings (active), sync, widgets.
const RAIL_ICONS = [
  PLUS_CIRCLE_PATH,
  THUNDER_PATH,
  BOOK_PATH,
  PICTURE_PATH,
  SETTING_PATH,
  CLOUD_SYNC_PATH,
  APPSTORE_PATH
]

const RAIL_ACTIVE = 4

// The settings panel's card tabs, in the order setting-modal.jsx builds them.
const SETTING_TABS = [
  { key: 'setting', label: 'setting' },
  { key: 'bookmarks', label: 'bookmarks' },
  { key: 'uiThemes', label: 'UI Themes' },
  { key: 'quickCommands', label: 'quick commands' },
  { key: 'triggers', label: 'triggers', beta: true },
  { key: 'profiles', label: 'profiles' },
  { key: 'widgets', label: 'widgets', beta: true }
]

// The bookmark list column. Titles follow create-title.jsx: the bookmark title,
// then " - ", then user@host:port.
const ROWS = [
  { id: 'core', tag: '#e55934', name: 'core switch - admin@10.0.0.1:2222' },
  { id: 'prod-web', tag: '#08c', name: 'prod-web - zxd@web-01:22' },
  { id: 'prod-db', tag: '#08c', name: 'prod-db - zxd@db-01:22' },
  { id: 'staging', tag: '#08c', name: 'staging - zxd@stg-01:22' },
  { id: 'nas', tag: '#06d6a0', name: 'nas - u@nas-01:21' },
  { id: 'kvm', tag: '#bbbbbb', name: 'kvm - zxd@kvm-01:22' },
  { id: 'router', tag: '#06d6a0', name: 'router - admin@10.0.0.254:23' }
]

const ROW_ACTIVE = 'core'

// The bookmark form. Field order follows sshAuthFields: category, title, host,
// username, then the auth row, then port. The password is an antd Input.Password,
// so the field shows dots; the string on the right is the point of the post, and
// it carries that password in the clear — which is exactly what the post warns
// about.
const FIELDS = [
  { label: 'category', value: 'prod' },
  { label: 'title', value: 'core switch' },
  { label: 'host', value: '10.0.0.1' },
  { label: 'username', value: 'admin' },
  { label: 'password', value: '&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;', secret: true },
  { label: 'port', value: '2222' }
]

// The type radios. Labels come from renderTypes(): ssh is relabelled "Ssh/Sftp",
// and every other key falls back to the protocol name.
const TYPES = ['Ssh/Sftp', 'telnet', 'serial', 'local', 'vnc', 'rdp', 'ftp', 'web', 'spice']

// The two dropdown rows, with the previews the serializer actually produces for
// this bookmark — including the password, which the string carries in the clear.
const DROP_ITEMS = [
  { key: 'qc', name: 'quick connect', value: 'ssh://admin:simple@10.0.0.1:2222' },
  { key: 'json', name: 'JSON', value: '{"type":"ssh","host":"10.0.0.1","port":2222,"username":"admin"...' }
]

// The tab bar above the panel: two open sessions.
const TABS = [
  { id: 't-local', count: '1', name: 'local', connected: false },
  { id: 't-core', count: '2', name: 'core-switch:2222', connected: true }
]

const CSS = `
.eb-cb {
  /* the real electerm UI theme — src/client/css/includes/theme.styl, with the
     shipped dark theme (theme-defaults.js, defaultThemeDark) injected over it
     at runtime, which is where --main #121214 comes from */
  --eb-ink: #16233a;
  --eb-main-dark: #000;
  --eb-main: #121214;
  --eb-main-lighter: #5b5a5b;
  --eb-text: #ddd;
  --eb-text-dark: #888;
  --eb-primary: #08c;
  --eb-success: #06d6a0;
  --eb-warn: #e55934;
  /* antd 5 defaults, which is what the app renders (no ConfigProvider) */
  --eb-antd-primary: #1677ff;
  --eb-antd-border: #d9d9d9;
  --eb-antd-ink: rgba(0, 0, 0, 0.88);
  --eb-antd-soft: rgba(0, 0, 0, 0.02);
  --eb-antd-hover: #f5f5f5;
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: var(--radius-lg, 12px);
  border: 1px solid var(--color-border, #d9e2f0);
  background: linear-gradient(135deg, #e9f2ff 0%, #eef0ff 50%, #e9fbf6 100%);
  color: var(--eb-ink);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.3;
  isolation: isolate;
  -webkit-font-smoothing: antialiased;
}

/* ---------- background decoration ---------- */
.eb-cb-deco { position: absolute; inset: 0; pointer-events: none; }
.eb-cb-dots {
  position: absolute;
  inset: -6em;
  background-image: radial-gradient(rgba(37, 99, 235, 0.2) 0.18em, transparent 0.18em);
  background-size: 4.2em 4.2em;
  animation: eb-cb-drift 34s linear infinite;
}
@keyframes eb-cb-drift {
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(-4.2em, -4.2em, 0); }
}
.eb-cb-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(3.2em);
  opacity: 0.5;
}
.eb-cb-blob-a {
  width: 22em; height: 22em;
  top: -7em; left: -5em;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.55), transparent 68%);
}
.eb-cb-blob-b {
  width: 26em; height: 26em;
  bottom: -9em; right: -6em;
  background: radial-gradient(circle, rgba(45, 212, 191, 0.45), transparent 68%);
}
.eb-cb-spark {
  position: absolute;
  width: 0.7em; height: 0.7em;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 1.2em rgba(255, 255, 255, 0.9);
  opacity: 0.75;
}
.eb-cb-spark-a { top: 12%; left: 8%; animation: eb-cb-twinkle 5.2s ease-in-out infinite; }
.eb-cb-spark-b { top: 7%; left: 66%; animation: eb-cb-twinkle 6.8s ease-in-out 1.1s infinite; }
.eb-cb-spark-c { bottom: 8%; left: 4%; animation: eb-cb-twinkle 7.4s ease-in-out 2.3s infinite; }
@keyframes eb-cb-twinkle {
  0%, 100% { transform: scale(0.5); opacity: 0.24; }
  50% { transform: scale(1.15); opacity: 0.86; }
}

/* ---------- headline ----------
   The width sits on .eb-cb-head, whose font-size is the root em, rather than on
   .eb-cb-sub: a max-width in em on the sub would resolve against its own font
   size and come out wider than intended. */
.eb-cb-head { position: absolute; left: 5em; top: 2.9em; width: 40em; }
.eb-cb-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  font-size: 1.35em;
  font-weight: 600;
  color: var(--eb-primary);
}
.eb-cb-brand::before {
  content: '';
  width: 0.72em;
  height: 0.72em;
  border-radius: 0.16em;
  background: var(--eb-primary);
}
.eb-cb-h1 {
  margin: 0.5em 0 0;
  font-size: 2.5em;
  line-height: 1.14;
  font-weight: 700;
  letter-spacing: -0.015em;
}
.eb-cb-h1 em {
  font-style: normal;
  background: linear-gradient(96deg, #2563eb, #0d9488 62%, #0891b2);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.eb-cb-sub {
  margin: 0.6em 0 0;
  font-size: 1.28em;
  line-height: 1.42;
  color: #4b5563;
}

/* ---------- the result card ----------
   Sits in the banner's top-right, clear of the window, which is drawn later in
   the DOM and would otherwise cover it. The card is the payoff: what is on the
   clipboard once the menu row is picked. Only one of the chip and the card is
   ever on stage, but they occupy different slots (the card hangs below the
   chip's line), so both can stay in flow-free absolute positions. */
.eb-cb-chips { position: absolute; pointer-events: none; }
.eb-cb-chips.is-hero {
  right: 3em;
  top: 3.4em;
  width: 40em;
  height: 13em;
}
.eb-cb-chips.is-card {
  left: 3em;
  right: 3em;
  top: 1.6em;
  height: 4.4em;
}
/* the chip that names what the two rows are */
.eb-cb-chip {
  position: absolute;
  top: 0;
  right: 0;
  padding: 0.5em 0.85em;
  border-radius: 0.45em;
  font-size: 1.28em;
  font-weight: 600;
  line-height: 1.25;
  white-space: nowrap;
  opacity: 0;
  background: var(--eb-ink);
  color: #fff;
  box-shadow: 0 0.3em 0.9em rgba(15, 23, 42, 0.16);
}
.eb-cb-res {
  position: absolute;
  right: 0;
  top: 3.6em;
  width: 33em;
  padding: 0.85em 0.95em 0.9em;
  border-radius: 0.8em;
  background: #fff;
  box-shadow: 0 0.9em 2.2em rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(15, 23, 42, 0.06);
  opacity: 0;
}
.eb-cb-res-cap {
  display: flex;
  align-items: center;
  gap: 0.4em;
  font-size: 1.05em;
  font-weight: 600;
  color: #0f766e;
}
.eb-cb-res-cap svg { width: 0.95em; height: 0.95em; fill: var(--eb-success); }
.eb-cb-res-val {
  margin-top: 0.55em;
  padding: 0.5em 0.6em;
  border-radius: 0.4em;
  background: #eef4ff;
  border: 1px solid #dbe6ff;
  font-family: Menlo, Monaco, 'DejaVu Sans Mono', 'Courier New', monospace;
  font-size: 1.12em;
  line-height: 1.35;
  color: #1d4ed8;
  white-space: pre;
  overflow: hidden;
}
.eb-cb-res-note {
  margin-top: 0.5em;
  font-size: 1.02em;
  line-height: 1.4;
  color: #64748b;
}
/* on a card the result collapses to a single pill above the window */
.eb-cb[data-variant='card'] .eb-cb-res {
  top: 0;
  right: auto;
  left: 0;
  width: auto;
  padding: 0.4em 0.7em;
  border-radius: 0.45em;
}
.eb-cb[data-variant='card'] .eb-cb-res-cap,
.eb-cb[data-variant='card'] .eb-cb-res-note { display: none; }
.eb-cb[data-variant='card'] .eb-cb-res-val {
  margin-top: 0;
  padding: 0;
  border: 0;
  background: transparent;
  font-size: 1.05em;
  color: var(--eb-ink);
}
.eb-cb[data-variant='card'] .eb-cb-chip {
  right: auto;
  left: 0;
  font-size: 1.1em;
  padding: 0.42em 0.7em;
}

/* ---------- the electerm window ----------
   Icon rail, tab bar and settings panel are one piece, sized from the banner's
   em, so the whole window scales as a unit. The rail runs the full height; the
   tab bar sits above the panel, which is why the panel starts one tab-bar down. */
.eb-cb-app {
  position: absolute;
  left: 4em;
  bottom: 2.8em;
  width: 78em;
  background: var(--eb-main);
  border-radius: 0.8em;
  box-shadow: 0 1.3em 2.6em rgba(15, 23, 42, 0.32), 0 0 2.2em rgba(37, 99, 235, 0.2);
  overflow: hidden;
  text-align: left;
  animation: eb-cb-glow 4.4s ease-in-out infinite;
}
@keyframes eb-cb-glow {
  0%, 100% { box-shadow: 0 1.3em 2.6em rgba(15, 23, 42, 0.32), 0 0 2.2em rgba(37, 99, 235, 0.18); }
  50% { box-shadow: 0 1.3em 2.6em rgba(15, 23, 42, 0.34), 0 0 3.4em rgba(13, 148, 136, 0.4); }
}
.eb-cb-body { display: flex; align-items: stretch; height: 31em; }

/* the far-left icon bar: 43px against the app's 12-14px UI font */
.eb-cb-rail {
  flex: 0 0 3.5em;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.9em;
  padding: 0.7em 0;
  background: var(--eb-main-dark);
}
.eb-cb-rail-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.35em;
  height: 1.35em;
  color: var(--eb-text-dark);
}
.eb-cb-rail-btn svg { width: 100%; height: 100%; fill: currentColor; }
.eb-cb-rail-btn.is-active { color: var(--eb-text); }

.eb-cb-right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* ---------- tab bar ----------
   1em here is the tab font size, exactly as in the app's tabs.styl where the
   bar is 36px tall against a 14px font. */
.eb-cb-tabbar {
  flex: none;
  display: flex;
  align-items: stretch;
  height: 2.6em;
  padding: 0 0.4em;
  background: var(--eb-main-dark);
  font-size: 1.25em;
  line-height: 1;
  overflow: hidden;
}
.eb-cb-tab {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4em;
  height: 100%;
  min-width: 6.6em;
  max-width: 13em;
  padding: 0 0.7em;
  border-radius: 0.21em 0.21em 0 0;
  background: var(--eb-main-dark);
  color: var(--eb-text-dark);
  white-space: nowrap;
  overflow: hidden;
}
.eb-cb-tab.is-active {
  background: var(--eb-main);
  color: var(--eb-text);
  font-weight: 700;
}
.eb-cb-tab-name { overflow: hidden; text-overflow: ellipsis; }
.eb-cb-tab-status {
  position: absolute;
  left: 0.14em;
  top: 0.14em;
  width: 0.4em;
  height: 0.4em;
  border-radius: 50%;
  background: var(--eb-text-dark);
}
.eb-cb-tab-status.is-connected { background: var(--eb-success); }
.eb-cb-tab-count {
  flex: none;
  height: 1.43em;
  padding: 0 0.3em;
  border-radius: 0.72em 0.14em 0.14em 0.72em;
  background: var(--eb-primary);
  color: #fff;
  line-height: 1.43em;
  text-align: center;
}
.eb-cb-tab-close {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.15em;
  height: 1.15em;
  border-radius: 50%;
  background: var(--eb-main);
  color: var(--eb-text);
}
.eb-cb-tab-close svg { width: 0.6em; height: 0.6em; fill: currentColor; }
.eb-cb-tab:not(.is-active) .eb-cb-tab-close { display: none; }
.eb-cb-tab-add,
.eb-cb-tabbar-caret {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  color: var(--eb-text);
}
.eb-cb-tab-add { width: 1.5em; margin-left: 0.2em; }
.eb-cb-tab-add svg { width: 0.95em; height: 0.95em; fill: currentColor; }
.eb-cb-tabbar-caret { width: 1.4em; margin-left: auto; color: var(--eb-text-dark); }
.eb-cb-tabbar-caret svg { width: 0.85em; height: 0.85em; fill: currentColor; }

/* ---------- the settings panel ----------
   The panel keeps font-size 1em so everything measured off it is in banner-em;
   the columns inside carry their own font size in an inner element. */
.eb-cb-panel {
  position: relative;
  flex: 1;
  min-height: 0;
  background: var(--eb-main);
  overflow: hidden;
}

/* the settings panel's card tabs (antd type='card'). The row's own bottom
   border is what the active tab merges into, so the tab pulls up over it by a
   pixel and takes the panel's own colour. */
.eb-cb-stabs {
  display: flex;
  align-items: flex-end;
  gap: 0.14em;
  height: 3.9em;
  padding: 1.4em 0.8em 0;
  border-bottom: 1px solid #f0f0f0;
}
.eb-cb-stab {
  position: relative;
  flex: none;
  padding: 0.42em 0.75em 0.4em;
  border: 1px solid #f0f0f0;
  border-bottom-color: transparent;
  border-radius: 0.5em 0.5em 0 0;
  background: var(--eb-antd-soft);
  color: var(--eb-text-dark);
  font-size: 1.12em;
  line-height: 1.25;
  white-space: nowrap;
}
.eb-cb-stab.is-active {
  margin-bottom: -1px;
  background: var(--eb-main);
  border-bottom-color: var(--eb-main);
  color: var(--eb-antd-primary);
}
.eb-cb-stab sup { font-size: 0.7em; }

/* the two columns: bookmark list on the left, the form on the right */
.eb-cb-cols {
  position: absolute;
  left: 0;
  right: 0;
  top: 3.9em;
  bottom: 0;
  display: flex;
  align-items: stretch;
}
.eb-cb-list {
  flex: 0 0 32em;
  min-width: 0;
  border-right: 1px solid #000;
  overflow: hidden;
}
.eb-cb-list-inner {
  padding: 0.5em 0.4em;
  font-size: 1.5em;
  color: var(--eb-text);
}
.eb-cb-search {
  display: flex;
  align-items: stretch;
  margin-bottom: 0.45em;
}
.eb-cb-search-box {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.35em;
  height: 1.75em;
  padding: 0 0.45em;
  border: 1px solid var(--eb-antd-border);
  border-right: 0;
  border-radius: 0.35em 0 0 0.35em;
  background: #fff;
}
.eb-cb-search-box svg { flex: none; width: 0.8em; height: 0.8em; fill: rgba(0, 0, 0, 0.25); }
.eb-cb-sort-btn {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75em;
  border: 1px solid var(--eb-antd-border);
  border-radius: 0 0.35em 0.35em 0;
  background: #fff;
}
.eb-cb-sort-btn svg { width: 0.8em; height: 0.8em; fill: rgba(0, 0, 0, 0.55); }

/* .tree-item: line-height 26px, radius 3px, hover and .selected both #000 */
.eb-cb-row {
  display: flex;
  align-items: center;
  gap: 0.25em;
  line-height: 1.6em;
  padding: 0 0.4em 0 0.55em;
  border-radius: 0.17em;
  white-space: nowrap;
  overflow: hidden;
}
.eb-cb-row.is-active { background: #000; color: #eee; }
.eb-cb-tag { flex: none; font-size: 0.85em; }
.eb-cb-name { overflow: hidden; text-overflow: ellipsis; }

/* ---------- the bookmark form ---------- */
.eb-cb-form {
  flex: 1;
  min-width: 0;
  padding: 0.65em 0.8em 0.4em;
  font-size: 1.32em;
  color: var(--eb-text);
  overflow: hidden;
}
/* the header: book glyph, "edit bookmarks", the bookmark's colour tag + title,
   then the copy button */
.eb-cb-ftitle {
  display: flex;
  align-items: center;
  gap: 0.35em;
  line-height: 1.7em;
  font-weight: 700;
  margin-bottom: 0.4em;
}
.eb-cb-ftitle > svg { flex: none; width: 0.95em; height: 0.95em; fill: currentColor; }
.eb-cb-ftitle-text { flex: none; white-space: nowrap; }
.eb-cb-ftitle-name {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 0.3em;
  margin: 0 0.4em;
  color: var(--eb-text);
  white-space: nowrap;
}
.eb-cb-ftitle-tag {
  flex: none;
  width: 0.6em;
  height: 0.6em;
  border-radius: 0.1em;
}
/* the copy button: the app's .pointer.fright span, i.e. floated to the right */
.eb-cb-copy {
  flex: none;
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.35em;
  height: 1.35em;
  border-radius: 0.3em;
  color: var(--eb-text);
}
.eb-cb-copy svg { width: 0.95em; height: 0.95em; fill: currentColor; }
.eb-cb-copy.is-hit { background: rgba(8, 136, 204, 0.5); }

/* the type radios — an antd Radio.Group of Radio.Buttons, which wrap */
.eb-cb-ftypes {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  margin-bottom: 0.45em;
  font-size: 0.72em;
}
.eb-cb-ftype {
  flex: none;
  padding: 0.42em 0.85em;
  border: 1px solid var(--eb-antd-border);
  border-left-width: 0;
  background: #fff;
  color: var(--eb-antd-ink);
  line-height: 1.3;
  white-space: nowrap;
}
.eb-cb-ftype:first-child { border-left-width: 1px; border-radius: 0.4em 0 0 0.4em; }
.eb-cb-ftype:last-child { border-radius: 0 0.4em 0.4em 0; }
.eb-cb-ftype.is-active {
  background: var(--eb-antd-primary);
  border-color: var(--eb-antd-primary);
  color: #fff;
}

/* antd Form rows: a right-aligned label, then the control */
.eb-cb-field {
  display: flex;
  align-items: center;
  gap: 0.5em;
  margin-bottom: 0.26em;
}
.eb-cb-label {
  flex: 0 0 7.4em;
  text-align: right;
  color: var(--eb-text);
  line-height: 1.7em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.eb-cb-input {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.3em;
  height: 1.8em;
  padding: 0 0.5em;
  border: 1px solid var(--eb-antd-border);
  border-radius: 0.4em;
  background: #fff;
  color: var(--eb-antd-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.eb-cb-input.is-secret { letter-spacing: 0.06em; }
.eb-cb-eye {
  flex: none;
  margin-left: auto;
  width: 0.85em;
  height: 0.85em;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.3);
}

/* ---------- the copy dropdown ----------
   Inside .eb-cb-overlay, which keeps font-size 1em, so width/top/left here are
   banner-em and can be compared directly with the measured icon position. */
.eb-cb-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  font-size: 1em;
}
.eb-cb-drop {
  position: absolute;
  width: 30em;
  padding: 0.4em;
  border-radius: 0.6em;
  background: #fff;
  box-shadow: 0 0.6em 1.8em rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(0, 0, 0, 0.06);
  opacity: 0;
  transform-origin: 100% 0;
  z-index: 5;
}
.eb-cb-drop-item {
  display: flex;
  align-items: center;
  gap: 0.5em;
  padding: 0.5em 0.6em;
  border-radius: 0.35em;
  font-size: 1.15em;
  line-height: 1.45;
  color: var(--eb-antd-ink);
}
.eb-cb-drop-item.is-hover { background: var(--eb-antd-hover); }
.eb-cb-drop-item.is-flash { background: rgba(8, 136, 204, 0.22); }
.eb-cb-drop-name { flex: none; font-weight: 700; }
.eb-cb-drop-val {
  flex: 1;
  min-width: 0;
  font-family: Menlo, Monaco, 'DejaVu Sans Mono', 'Courier New', monospace;
  font-size: 0.86em;
  color: #555;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.eb-cb-drop-item > svg {
  flex: none;
  width: 0.78em;
  height: 0.78em;
  fill: rgba(0, 0, 0, 0.4);
}

/* ---------- the pointer and its ripples ---------- */
.eb-cb-ptr {
  position: absolute;
  top: 0;
  left: 0;
  width: 1.5em;
  height: 2em;
  opacity: 0;
  z-index: 7;
}
.eb-cb-ptr svg { width: 100%; height: 100%; }
.eb-cb-ripple {
  position: absolute;
  top: 0;
  left: 0;
  width: 1.7em;
  height: 1.7em;
  margin: -0.85em 0 0 -0.85em;
  border-radius: 50%;
  background: rgba(8, 136, 204, 0.34);
  opacity: 0;
  z-index: 6;
}
.eb-cb-ripple.is-pick { background: rgba(6, 214, 160, 0.45); }

/* ---------- the "copied" toast ----------
   common/clipboard.js raises the app's standard toast, which message.styl pins
   near the top of the window over everything else. */
.eb-cb-toast {
  position: absolute;
  left: 50%;
  top: 0.7em;
  transform: translateX(-50%);
  opacity: 0;
  z-index: 9;
}
.eb-cb-toast-inner {
  display: inline-flex;
  align-items: center;
  gap: 0.45em;
  padding: 0.45em 0.9em;
  border-radius: 0.5em;
  /* the app's toast is --main-lighter, which the dark default theme does not
     set, so #5b5a5b (theme.styl) is what ships */
  background: var(--eb-main-lighter);
  color: #fff;
  font-size: 1.5em;
  box-shadow: 0 0.8em 1.8em rgba(0, 0, 0, 0.4);
}
.eb-cb-toast-icon { width: 1em; height: 1em; fill: var(--eb-success); }

/* ---------- card variant ----------
   The card is a thumbnail: no headline, and the result collapses to a pill above
   the window. The window takes the width and the columns get a little more room. */
.eb-cb[data-variant='card'] .eb-cb-head { display: none; }
.eb-cb[data-variant='card'] .eb-cb-app { left: 3em; width: 94em; bottom: 2.6em; }
.eb-cb[data-variant='card'] .eb-cb-body { height: 35em; }
.eb-cb[data-variant='card'] .eb-cb-list { flex: 0 0 38em; }
.eb-cb[data-variant='card'] .eb-cb-list-inner { font-size: 1.62em; }
.eb-cb[data-variant='card'] .eb-cb-form { font-size: 1.5em; }
.eb-cb[data-variant='card'] .eb-cb-toast-inner { font-size: 1.7em; }

@media (prefers-reduced-motion: reduce) {
  .eb-cb-dots, .eb-cb-spark, .eb-cb-app { animation: none !important; }
}
`

function injectStyle () {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = CSS
  document.head.appendChild(style)
}

function clamp (v, min, max) {
  return Math.max(min, Math.min(max, v))
}

function seg (t, from, to) {
  return clamp((t - from) / (to - from), 0, 1)
}

function easeOut (p) {
  return 1 - Math.pow(1 - p, 3)
}

function easeInOut (p) {
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2
}

function rowMarkup (row) {
  return `<div class="eb-cb-row${row.id === ROW_ACTIVE ? ' is-active' : ''}" data-row="${row.id}">` +
    `<span class="eb-cb-tag" style="color:${row.tag}">&#9679;</span>` +
    `<span class="eb-cb-name">${row.name}</span>` +
    '</div>'
}

function fieldMarkup (f) {
  return '<div class="eb-cb-field">' +
    `<span class="eb-cb-label">${f.label}</span>` +
    `<span class="eb-cb-input${f.secret ? ' is-secret' : ''}">${f.value}` +
    (f.secret ? '<span class="eb-cb-eye"></span>' : '') +
    '</span></div>'
}

function dropMarkup (item) {
  return `<div class="eb-cb-drop-item" data-item="${item.key}">` +
    `<b class="eb-cb-drop-name">${item.name}</b>` +
    `<span class="eb-cb-drop-val">${item.value}</span>` +
    icon(COPY_PATH, '') +
    '</div>'
}

function markup (variant) {
  const head = variant === 'card'
    ? ''
    : `
      <div class="eb-cb-head">
        <span class="eb-cb-brand">electerm</span>
        <h2 class="eb-cb-h1">Copy a bookmark:<br><em>one line, or the record</em></h2>
        <p class="eb-cb-sub">The form header now copies the bookmark out as a quick connect string, or as the whole record in JSON.</p>
      </div>`
  const chips = `
    <div class="eb-cb-chips is-${variant}">
      <span class="eb-cb-chip">one line &mdash; or the whole record</span>
      <div class="eb-cb-res">
        <div class="eb-cb-res-cap">${icon(CHECK_PATH, '')}<span>copied</span></div>
        <div class="eb-cb-res-val">ssh://admin:simple@10.0.0.1:2222</div>
        <div class="eb-cb-res-note">Paste it into Quick Connect, a chat message, or a ticket.</div>
      </div>
    </div>`
  const tabs = TABS.map(t =>
    `<span class="eb-cb-tab${t.id === 't-core' ? ' is-active' : ''}" data-tab="${t.id}">` +
    `<span class="eb-cb-tab-status${t.connected ? ' is-connected' : ''}"></span>` +
    `<span class="eb-cb-tab-count">${t.count}</span>` +
    `<span class="eb-cb-tab-name">${t.name}</span>` +
    '<span class="eb-cb-tab-close">' + icon(CLOSE_PATH, '') + '</span>' +
    '</span>'
  ).join('')
  const rail = RAIL_ICONS.map((p, i) =>
    `<span class="eb-cb-rail-btn${i === RAIL_ACTIVE ? ' is-active' : ''}">${icon(p, '')}</span>`
  ).join('')
  const stabs = SETTING_TABS.map(t =>
    `<span class="eb-cb-stab${t.key === 'bookmarks' ? ' is-active' : ''}">` +
    t.label + (t.beta ? ' <sup>Beta</sup>' : '') +
    '</span>'
  ).join('')
  const types = TYPES.map((label, i) =>
    `<span class="eb-cb-ftype${i === 0 ? ' is-active' : ''}">${label}</span>`
  ).join('')
  return `
    <div class="eb-cb-deco">
      <span class="eb-cb-blob eb-cb-blob-a"></span>
      <span class="eb-cb-blob eb-cb-blob-b"></span>
      <span class="eb-cb-dots"></span>
      <span class="eb-cb-spark eb-cb-spark-a"></span>
      <span class="eb-cb-spark eb-cb-spark-b"></span>
      <span class="eb-cb-spark eb-cb-spark-c"></span>
    </div>
    ${head}
    ${chips}
    <div class="eb-cb-app">
      <div class="eb-cb-body">
        <div class="eb-cb-rail">${rail}</div>
        <div class="eb-cb-right">
          <div class="eb-cb-tabbar">
            ${tabs}
            <span class="eb-cb-tab-add">${icon(PLUS_PATH, '')}</span>
            <span class="eb-cb-tabbar-caret">${icon(CARET_DOWN_PATH, '')}</span>
          </div>
          <div class="eb-cb-panel">
            <div class="eb-cb-stabs">${stabs}</div>
            <div class="eb-cb-cols">
              <div class="eb-cb-list">
                <div class="eb-cb-list-inner">
                  <div class="eb-cb-search">
                    <span class="eb-cb-search-box">${icon(SEARCH_PATH, '')}</span>
                    <span class="eb-cb-sort-btn">${icon(SORT_PATH, '')}</span>
                  </div>
                  ${ROWS.map(rowMarkup).join('')}
                </div>
              </div>
              <div class="eb-cb-form">
                <div class="eb-cb-ftitle">
                  ${icon(BOOK_PATH, '')}
                  <span class="eb-cb-ftitle-text">edit bookmarks</span>
                  <b class="eb-cb-ftitle-name"><span class="eb-cb-ftitle-tag" style="background:#e55934"></span>core switch</b>
                  <span class="eb-cb-copy" data-copy>${icon(COPY_PATH, '')}</span>
                </div>
                <div class="eb-cb-ftypes">${types}</div>
                ${FIELDS.map(fieldMarkup).join('')}
              </div>
            </div>
            <div class="eb-cb-overlay">
              <div class="eb-cb-drop">
                ${DROP_ITEMS.map(dropMarkup).join('')}
              </div>
              <span class="eb-cb-ptr"><svg viewBox="-3 -3 29 39" width="100%" height="100%"><path d="${CURSOR_PATH}" fill="#fff" stroke="#1b1b1f" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/></svg></span>
              <span class="eb-cb-ripple" data-rip="1"></span>
              <span class="eb-cb-ripple is-pick" data-rip="2"></span>
            </div>
          </div>
        </div>
      </div>
      <div class="eb-cb-toast">
        <span class="eb-cb-toast-inner">${icon(CHECK_PATH, 'eb-cb-toast-icon')}<span>copied</span></span>
      </div>
    </div>`
}

function mount (host) {
  if (host.getAttribute('data-eb-mounted')) return
  host.setAttribute('data-eb-mounted', '1')

  const variant = host.getAttribute('data-eb-banner') === 'card' ? 'card' : 'hero'
  const root = document.createElement('div')
  root.className = 'eb-cb'
  root.setAttribute('data-variant', variant)
  root.setAttribute('role', 'img')
  root.setAttribute('aria-label',
    'electerm: the bookmark form has a copy button that copies the bookmark as a one-line quick connect string or as the whole record in JSON')
  root.innerHTML = markup(variant)
  host.appendChild(root)

  const el = {
    panel: root.querySelector('.eb-cb-panel'),
    copy: root.querySelector('[data-copy]'),
    drop: root.querySelector('.eb-cb-drop'),
    items: {
      qc: root.querySelector('[data-item="qc"]'),
      json: root.querySelector('[data-item="json"]')
    },
    ptr: root.querySelector('.eb-cb-ptr'),
    toast: root.querySelector('.eb-cb-toast'),
    chipFmt: root.querySelector('.eb-cb-chip'),
    res: root.querySelector('.eb-cb-res'),
    rips: {}
  }
  for (const rip of root.querySelectorAll('[data-rip]')) {
    el.rips[rip.getAttribute('data-rip')] = rip
  }

  // 1em === 1% of the banner width, so the whole design scales with it.
  const fit = () => {
    const w = root.clientWidth
    if (w) root.style.fontSize = (w / 100) + 'px'
  }
  fit()

  // The click targets are read off the real elements rather than hard-coded, so
  // the pointer, the ripples and the menu stay on their anchors at any scale.
  // All of it is measured in banner-em: the panel keeps font-size 1em, and the
  // overlay that holds the menu and the pointer does too.
  const pts = { copy: { x: 0, y: 0 }, row: { x: 0, y: 0 } }
  let dropPos = { left: 0, top: 0 }
  const measure = () => {
    const unit = root.clientWidth / 100
    if (!unit) return
    const base = el.panel.getBoundingClientRect()
    const rel = (r) => ({
      left: (r.left - base.left) / unit,
      top: (r.top - base.top) / unit,
      right: (r.right - base.left) / unit,
      bottom: (r.bottom - base.top) / unit
    })
    const c = rel(el.copy.getBoundingClientRect())
    pts.copy = { x: (c.left + c.right) / 2, y: (c.top + c.bottom) / 2 }
    // antd `placement: bottomRight` — the menu hangs off the right edge of the
    // trigger. 30em is .eb-cb-drop's width, and it is border-box.
    dropPos = { left: c.right - 30, top: c.bottom + 0.55 }
    // The menu is positioned by the frame loop, so put it where it belongs
    // BEFORE reading the row: at its static position it sits at the overlay's
    // top-left, and the pointer would be aimed at the panel corner.
    el.drop.style.left = dropPos.left.toFixed(3) + 'em'
    el.drop.style.top = dropPos.top.toFixed(3) + 'em'
    const r1 = rel(el.items.qc.getBoundingClientRect())
    pts.row = { x: r1.left + 1.6, y: (r1.top + r1.bottom) / 2 }
  }
  measure()
  if (window.ResizeObserver) {
    new window.ResizeObserver(() => {
      fit()
      measure()
    }).observe(root)
  } else {
    window.addEventListener('resize', () => {
      fit()
      measure()
    })
  }

  // A chip's life is in-past out-past: it fades in, holds, then fades out, so
  // no beat can leave a label stranded on the banner.
  const chip = (t, from, to, outFrom, outTo) =>
    (easeOut(seg(t, from, to)) * (1 - easeInOut(seg(t, outFrom, outTo)))).toFixed(3)

  // The pointer arrives, waits, then moves on: one helper for both stops.
  const travel = (t, from, to, prev, next) => {
    const p = easeInOut(seg(t, from, to))
    return {
      x: prev.x + (next.x - prev.x) * p,
      y: prev.y + (next.y - prev.y) * p
    }
  }

  function frame (t) {
    const gone = easeInOut(seg(t, T.fadeFrom, T.fadeTo))

    // ---- the pointer, from off-panel to the copy button, then to the menu row
    const out = { x: pts.copy.x + 10, y: pts.copy.y + 6 }
    let pos = travel(t, T.ptrInFrom, T.ptrInTo, out, pts.copy)
    if (t >= T.ptrRowFrom) pos = travel(t, T.ptrRowFrom, T.ptrRowTo, pts.copy, pts.row)
    el.ptr.style.opacity = (
      seg(t, T.ptrInFrom, T.ptrInFrom + 200) *
      (1 - easeInOut(seg(t, T.ptrOutFrom, T.ptrOutTo))) *
      (1 - gone)
    ).toFixed(3)
    el.ptr.style.left = (pos.x - 0.18).toFixed(3) + 'em'
    el.ptr.style.top = (pos.y - 0.2).toFixed(3) + 'em'

    // ---- the copy button flashes as it is pressed
    el.copy.classList.toggle('is-hit', t >= T.clickFrom && t < T.clickFrom + 260)

    // ---- the ripples: one per press
    const rip = (node, at, pt) => {
      const p = seg(t, at, at + 430)
      if (p <= 0 || p >= 1) {
        node.style.opacity = '0'
        // collapse it rather than leaving it at its final scale, or the panel
        // reports a permanent overflow for the rest of the loop
        node.style.transform = 'translate(-50%, -50%) scale(0)'
        return
      }
      node.style.opacity = ((1 - p) * 0.9 * (1 - gone)).toFixed(3)
      node.style.transform = 'translate(-50%, -50%) scale(' + (0.35 + p * 2.6).toFixed(3) + ')'
      node.style.left = pt.x.toFixed(3) + 'em'
      node.style.top = pt.y.toFixed(3) + 'em'
    }
    rip(el.rips['1'], T.clickFrom, pts.copy)
    rip(el.rips['2'], T.click2From, pts.row)

    // ---- the dropdown: opens under the copy button, closes when a row is taken
    const openP = easeInOut(seg(t, T.dropFrom, T.dropTo))
    const closeP = easeInOut(seg(t, T.dropCloseFrom, T.dropCloseTo))
    const shown = openP * (1 - closeP)
    el.drop.style.opacity = (shown * (1 - gone)).toFixed(3)
    el.drop.style.transform =
      'translateY(' + ((1 - shown) * -0.6).toFixed(3) + 'em) scale(' +
      (0.92 + shown * 0.08).toFixed(3) + ')'
    el.drop.style.left = dropPos.left.toFixed(3) + 'em'
    el.drop.style.top = dropPos.top.toFixed(3) + 'em'

    // ---- the rows. The pointer hovers the quick connect row, then picks it.
    const hoverRow = seg(t, T.ptrRowFrom, T.ptrRowTo) * (1 - seg(t, T.click2From, T.click2From + 120))
    const flashRow = seg(t, T.flashFrom, T.flashFrom + 120) *
      (1 - easeOut(seg(t, T.flashFrom + 380, T.flashFrom + 900)))
    el.items.qc.classList.toggle('is-hover', hoverRow > 0.5 && flashRow < 0.15)
    el.items.qc.classList.toggle('is-flash', flashRow > 0.15)

    // ---- the toast, raised by the clipboard helper on the click
    const toastP = seg(t, T.toastFrom, T.toastTo) *
      (1 - easeOut(seg(t, T.toastOutFrom, T.toastOutTo)))
    el.toast.style.opacity = (toastP * (1 - gone)).toFixed(3)
    el.toast.style.transform =
      'translateX(-50%) translateY(' + ((1 - toastP) * 0.5).toFixed(3) + 'em)'

    // ---- the annotation chip and the result card
    el.chipFmt.style.opacity = chip(t, T.fmtFrom, T.fmtTo, T.fmtOutFrom, T.fmtOutTo)
    el.res.style.opacity = chip(t, T.resFrom, T.resTo, T.resOutFrom, T.resOutTo)
  }

  const reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    // The most representative single frame: the menu closed, the row picked, the
    // toast up and the result card showing what is on the clipboard.
    frame(T.resTo)
    el.ptr.style.opacity = '0'
    el.chipFmt.style.opacity = '0'
    el.toast.style.opacity = '1'
    el.res.style.opacity = '1'
    return
  }

  // Pause the loop while the banner is scrolled out of view.
  const state = { raf: null }
  const start = performance.now()
  const tick = (now) => {
    frame((now - start) % PERIOD)
    state.raf = window.requestAnimationFrame(tick)
  }
  const play = () => {
    if (state.raf === null) state.raf = window.requestAnimationFrame(tick)
  }
  const pause = () => {
    if (state.raf !== null) {
      window.cancelAnimationFrame(state.raf)
      state.raf = null
    }
  }

  if (window.IntersectionObserver) {
    new window.IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) play()
      else pause()
    }, { threshold: 0 }).observe(root)
  } else {
    play()
  }
}

// The path this module was served from, e.g. /blogs/my-post/banner.js.
function selfPath () {
  try {
    return new URL(import.meta.url).pathname
  } catch (err) {
    return ''
  }
}

export function initBanners (doc = document) {
  injectStyle()
  const self = selfPath()
  const hosts = doc.querySelectorAll('[data-eb-banner]')
  for (const host of hosts) {
    // The blog index loads every post's banner module, so a mount has to be
    // the one this module was loaded for. A host with no data-eb-banner-src
    // (a test harness) is fair game for any module.
    const src = host.getAttribute('data-eb-banner-src')
    if (src && self && src !== self) continue
    mount(host)
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initBanners())
  } else {
    initBanners()
  }
}
