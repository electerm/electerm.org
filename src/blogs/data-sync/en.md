---
title: 'Data Sync in Electerm: One Setup, Every Machine in Sync'
description: Electerm syncs bookmarks, themes, quick commands and settings to a secret gist, your own server, electerm cloud or any WebDAV drive — with per-type encryption, upload/download preview, auto sync and file export. How the five backends work and how to pick one.
date: 2026-09-25
tags: [sync, backup, bookmarks, github-gist, webdav, productivity]
bannerScript: banner.js
---

# Data Sync in Electerm: One Setup, Every Machine in Sync

New laptop, same fifty bookmarks. Re-creating connections by hand is not setup — it is déjà vu with extra steps.

Electerm has a dedicated panel for exactly this: **Settings → Sync**. It uploads your data to one of five backends and downloads it on the next machine — bookmarks, bookmark groups, terminal themes, quick commands, profiles, address bookmarks, workspaces, triggers, plus a slice of app settings. Same hosts on the laptop and the desktop, no copy-paste.

> **Read this first**: sync is full-replace, not merge. A download overwrites the local data sets it covers (`store.setItems(n, arr)` per type in `src/client/store/sync.js`). The preview section below shows how to look before you leap.

## 1. The five backends, side by side

The tab strip in `src/client/components/setting-sync/setting-sync.jsx` renders one tab per entry of `syncTypes` (`src/client/common/constants.js`). Your build may hide some via `allowedSyncTypes()`, but stock electerm ships all five:

| | github | gitee | custom | cloud | webdav |
|---|---|---|---|---|---|
| **Stores in** | Secret gist | Secret gist | Your own HTTP service | `sync.electerm.org` (beta) | Any WebDAV server |
| **Credential** | Personal access token (`gist` scope) + gist id | Same shape, gitee token + gist id | API url + JWT secret + user id | Token (login on the site) | Server url + username + password |
| **Best for** | Most users, free and reliable | China-mainland users who prefer gitee | Self-hosters, teams | Zero-setup, no gist fiddling | NAS / Nextcloud / 坚果云 owners |

Switching tabs never loses the other backends' credentials — each type keeps its own `*AccessToken`, `*GistId`, `*LastSyncTime`, `*SyncPassword` keys under `config.syncSetting`, and **Save** only writes the active tab (`setting-sync-form.jsx` → `updateSyncSetting`).

## 2. A first sync in 60 seconds (github)

1. Create a token with **gist scope only** at `github.com/settings/tokens/new` — copy it now, GitHub never shows it again ([wiki: Create personal access token](https://github.com/electerm/electerm/wiki/Create-personal-access-token)).
2. Create a **secret** gist at `gist.github.com`, copy the id from the URL (`.../your-name/xxxxxxxx` → `xxxxxxxx`).
3. In electerm open **Settings → Sync → github**, paste token + gist id, optionally set an **encrypt password** (section 5), set a **proxy** if you need one, click **Save**.
4. Click **Upload** on the old machine, **Download** on the new one. Check **lastSyncTime** and the **Check gist** link to confirm.

The same shape works for gitee — but read the warning first: the panel shows an explicit *"Gitee data sync is not recommended"* alert ([wiki: gitee data sync warning](https://github.com/electerm/electerm/wiki/gitee-data-sync-warning)). Prefer github, cloud or WebDAV for new setups.

## 3. What actually gets synced

`syncDataMaps` in `constants.js` is the whole contract:

```js
{
  settings: ['config'],                    // a curated subset, see below
  bookmarks: ['bookmarks', 'bookmarkGroups'],
  terminalThemes: ['terminalThemes'],
  quickCommands: ['quickCommands'],
  profiles: ['profiles'],
  addressBookmarks: ['addressBookmarks'],
  workspaces: ['workspaces'],
  triggers: ['triggers']
}
```

Below the form, the **data-type checkboxes** (`data-select.jsx`) write `config.dataSyncSelected` — `all` by default, or a comma list when you untick something. `getDataSyncNames()` turns that selection into `{ names, syncConfig }`, and only those `names` are uploaded (`uploadSettingAction`) or overwritten on download (`downloadSettingAction`).

Two details worth knowing:

- **Settings means a curated list**, not the whole config (`getSyncConfig()` in `sync.js`): theme, font size, scrollback, hotkey, language, terminal options, AI settings and friends — about forty keys. Server-managed keys (`tokenElecterm`, `host`, `port`, `wsHost`, …) are stripped on import (`stripServerManagedKeys`) so a synced config can never break the running server's WebSocket token.
- **Order travels too.** Each data set uploads a `<name>.order.json` companion; on download the arrays are re-sorted to that order, so bookmark/tab order survives the trip.

## 4. Per-backend setup notes

**Custom server** ([wiki](https://github.com/electerm/electerm/wiki/Custom-sync-server)) — fill API url, JWT secret, user id. The contract is tiny: `PUT` stores the JSON body (user id from `jwtData.id`), `GET` returns it, `POST` returns `ok` when the user id verifies. Ready-made servers exist for Cloudflare Workers + D1 (recommended), Vercel, Python, Rust, Go, Java and more under the `electerm/electerm-sync-server-*` repos.

**Cloud** — the `sync.electerm.org [Beta]` link in the form. No gist id field: on save electerm pins `cloudGistId = 'cloud'` and the default API url, you just paste the token from the site.

**WebDAV** ([wiki](https://github.com/electerm/electerm/wiki/WebDAV-sync)) — pick the `webdav` tab and fill server url, username, password, plus **Skip SSL verify** for self-signed setups. URL shapes: Nextcloud/ownCloud `https://server/remote.php/dav/files/username`, 坚果云 `https://dav.jianguoyun.com/dav/`, plain Apache/nginx `/dav/`. On the server electerm keeps one `/electerm/` folder with `<name>.json` files plus `userConfig.json` and `electerm-status.json` (device name, electerm version, `lastSyncTime`). Use HTTPS in production, prefer app passwords, and back up the folder.

Every backend also accepts an optional **proxy** (`socks5://127.0.0.1:1080` style, see the [proxy format wiki](https://github.com/electerm/electerm/wiki/proxy-format)).

## 5. Encryption: what the password protects

The **encrypt password** field is per backend (`<type>SyncPassword`). When set:

- Only **bookmarks and profiles** are encrypted on upload (`encryptAsync` in `uploadSettingAction`); themes, quick commands and the rest stay plaintext JSON.
- Download is **fail-closed** (`decryptSyncData`): if a password is configured but `bookmarks.json` / `profiles.json` arrive as plaintext `[…]`, the download aborts instead of importing possibly-tampered data.
- There is no recovery. Lose the password and the server copy is unreadable — the wiki says it plainly, and the code agrees: nothing decrypts without it.

Practical rule: set the password *before* the first upload, use the same password on every device, and store it in a password manager — not in a bookmark.

## 6. Upload, download, and looking first

- **Upload** (`uploadSetting`) pushes the selected data sets plus `electerm-status.json` (timestamp, version, hostname). For gist backends that is one `update` call on the gist; for WebDAV it is one `PUT` per file.
- **Download** (`downloadSetting`) fetches, decrypts, runs `fixBookmarks` / `fixThemes`, restores order, applies the curated `userConfig.json`, and stamps `<type>LastSyncTime`.
- **Preview** — the **server data status** line under the buttons plus `previewServerDataWithCompare` power the diff view (`sync-data-compare.jsx`): `remote: N <type>, local: M <type> → upload/download?` per data set, or `Data in sync` when nothing differs. Check it before a first download onto a machine that already has bookmarks.
- **Empty-target errors are explicit**: *"Seems you have a empty gist, you can try use existing gist ID or upload first"* (gist) and the WebDAV-folder equivalent mean exactly what they say — upload first, then download.

## 7. Auto sync and file export

Above the tabs, the **export / import / auto-sync row** (`data-import.jsx`) covers the hands-free paths:

- **Auto sync switch** ([wiki: Auto data Sync](https://github.com/electerm/electerm/wiki/Auto-data-Sync)) with interval (`On Change`, 5/10/15/30 min, 1/2/6/12/24 h) and direction (upload / download). Default is *on-change upload*: any data edit triggers `uploadSettingAll` across every configured backend. Interval mode is polled by `auto-sync.jsx`; download direction keeps a second device following the first.
- **Export** (`handleExportAllData`) downloads one `YYYY-MM-DD-HH-mm-ss-electerm-all-data.json` with every data set plus full config — the offline backup.
- **Import** (`importAll`) replaces the same data sets from that file in 200-item chunks with a progress bar, then applies the config (server-managed keys stripped, theme re-applied).

Bookmark **triggers travel with the bookmark through sync**, so the login flow tuned on one machine already works on the next — see [Terminal Triggers](/blogs/terminal-triggers/).

## 8. Safety rules that actually matter

1. **Secret gists only.** A public gist publishes your hostnames, usernames and (if unencrypted) passwords to the internet. Create secret, keep the id private.
2. **Token scope = gist, nothing more.** A broader token turns a leaked sync setting into a leaked GitHub account.
3. **Set the encrypt password first**, and never store it only inside electerm.
4. **Preview before the first download** onto a non-empty machine — download replaces, it does not merge.
5. **One writer at a time.** Two machines with on-change upload racing each other last-write-wins; for fleets prefer one uploader + the rest on interval download.

## Cheat-sheet

- **Find it** — Settings (gear) → Sync. Five tabs: github / gitee / custom / cloud / webdav.
- **First run** — token (+ gist id) → Save → Upload here, Download there; watch `lastSyncTime`.
- **Pick data** — checkboxes below the form (`dataSyncSelected`); settings syncs a curated ~40-key list, server keys stripped.
- **Lock it** — encrypt password covers bookmarks + profiles, fail-closed on download, unrecoverable if lost.
- **Hands-free** — auto sync (on-change or interval, upload or download) + one-file export/import for offline backup.
- **Rule of thumb**: *new machine* → preview → download; *daily driver* → on-change upload; *secret or fleet* → encrypt + private backend.

Next: [Terminal Triggers](/blogs/terminal-triggers/) for the automation rules that ride along with your synced bookmarks, or [Password Management](/blogs/password-management/) for rotating the secrets those bookmarks carry.
