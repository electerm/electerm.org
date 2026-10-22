---
title: User Widgets - Write Your Own Panel Without Forking electerm
description: electerm user widgets are folders with a package.json that the app loads at runtime. Import one and you get a generated form or your own sandboxed HTML panel, with full Node privileges in the main process, no rebuild and no fork. Covers the manifest, config mode, instance widgets, the window.electerm bridge, real examples and the security model.
date: 2026-10-22
tags: [widgets, extensibility, automation, passbolt, docker, security]
bannerScript: banner.js
---

# User Widgets: your own panel, without touching the app

Every terminal app eventually meets the same request: "can it also do X with *my* infrastructure?"
An internal credential vault, a container dashboard that only makes sense on our boxes, a rename rule
that follows our naming convention. Forking electerm for that is absurd — you would inherit an entire
Electron app to add one panel.

**User widgets** are the way out. A widget is an ordinary folder with a `package.json`; electerm loads
it from its data directory at runtime. Import it and it sits in the same list as the built-in widgets,
with the same panel, the same instance log and the same start/stop behaviour. Delete the folder and it
is gone.

Full reference: [User widget guide](https://github.com/electerm/electerm/wiki/User-widget-guide).
Working code: [electerm/electerm-widget-examples](https://github.com/electerm/electerm-widget-examples).

> **Status**: user widgets land after v5.6.x. Until a release contains them, run electerm from source
> (`npm i --legacy-peer-deps && npm run b && npm run t`).

## 1. Import is the whole install

**Settings → Widgets → Import** (the button on its own row above the search box), pick a folder, done.

Three details matter more than they look:

- **It copies.** The whole folder, `node_modules` included, is copied into
  `<data dir>/widgets/<id>/`. Your source folder is not linked, so editing it afterwards changes
  nothing until you re-import and confirm the overwrite.
- **The id must match the folder name.** `electerm.id` in the manifest *is* the directory name, and
  also the host of the `electerm-widget://<id>/` scheme. A mismatch is refused at import time, with the
  reason in the list row.
- **A broken folder never becomes a broken install.** The manifest is validated before anything is
  copied: missing entry, bad JSON, id/folder mismatch. Metadata is read from `package.json` only —
  listing widgets never executes widget code, so a crashing widget cannot take the list down.

Uninstalling is the ✕ on the row: running instances stop first, then the folder goes, taking whatever
state the widget kept next to `main.js`.

## 2. Three shapes, one API

| Shape | What you write | What electerm draws |
| --- | --- | --- |
| **config mode** (`electerm.configs`, no `ui`) | one `main.js` with plain exports | the form, the result, the buttons |
| **instance** (`type: "instance"`) | `widgetRun(config, ctx)` → `{ instanceId, start, stop }` | the same form + start/stop + instance log |
| **own UI** (`electerm.ui`) | an HTML/CSS/JS page | nothing — it is your document, in a sandboxed iframe |

The first two share one payload language, and that is what makes them cheap to use.

**Fields** are declared, not built: `string`, `textarea`, `number`, `boolean`, `password`, `file`,
`directory`, `select`, each with `label`, `description`, `placeholder`, `required`, `default`, plus
`choices` for a select and `filters` for a file dialog.

**Results** are declared too — the action returns an object and the panel renders it:

| Key | Drawn as |
| --- | --- |
| `message` + `messageType` | a line at the top: `info` / `success` / `warning` / `error` |
| `details` | label/value rows; `secret` masks the value behind an eye and a copy button |
| `table` | `{ columns, rows, rowButtons }` — an antd table with per-row actions |
| `buttons` | plain buttons that replace the current result |
| `openTab` | opens a real terminal tab with the connection you return |

A button's `action` is just another export in `main.js`. Row buttons are called as
`action(row, formValues)` and their result is **pushed** onto a stack with a back arrow — that is how
`rename-files` gets "preview first, then apply", and how `passbolt-search` gets "search, then reveal
one password" without ever dumping the vault onto the screen.

`"persist": true` remembers non-password values in the app's encrypted local storage, scoped per
widget. Password fields are skipped on write, always. `getConfig()` never returns the app's settings
either: a widget reads and writes only its own key.

## 3. What each shape costs

| | config mode | instance | own UI |
| --- | --- | --- | --- |
| Files you write | `package.json` + `main.js` | same + lifecycle | + html/css/js |
| Form | generated | generated | yours |
| Start/stop + instance log | no | yes | no |
| Live updates | request → render | request → render | your own polling |
| Runs in | main process | main process | iframe (own origin) + main process |
| Good for | lookups, mutations, search | servers, tunnels, watchers | dashboards, log panes, inline actions |

Reach for config mode first. `docker-cockpit` exists because a form genuinely cannot express a
container list that changes while you look at it — not because config mode is a toy.

## 4. The own-UI bridge is deliberately small

An own-UI widget is served from `electerm-widget://<id>/<file>`: **a different origin from the app**,
in a sandboxed iframe. It cannot see `window.store`, the app DOM or the preload API. What it gets is
`window.electerm`, injected before its first script:

`call(name, ...args)` · `getConfig()` · `updateConfig(patch)` · `openDialog(opts)` ·
`saveDialog(opts)` · `copy(text)` · `openExternal(url)` · `openTab(tab)` · `log(...args)`

Everything is JSON and request/response — there is no push channel, so a live view polls. The host
also hands over the app's CSS variables (`--main`, `--text`, `--primary`, `--success`…) on `:root` at
init, so a widget panel can look native without linking the app's stylesheet. The frame is sandboxed
with `allow-scripts allow-same-origin allow-forms allow-modals allow-popups`; the panel header has a
reload button, because the development loop is "edit, reload" — there is no HMR.

## 5. Real examples, not demos

Five widgets in [electerm-widget-examples](https://github.com/electerm/electerm-widget-examples), each
with a bilingual README:

| Folder | Shape | What it proves |
| --- | --- | --- |
| `passbolt-search` | config | a full OpenPGP + JWT client behind five fields; keys never leave the machine |
| `docker-cockpit` | own UI | polling, a log pane, confirmations — what a form cannot express |
| `rename-files` | config | a destructive action done safely: preview, then a row button applies it |
| `static-server` | instance | form + start/stop + `serverInfo` + access log |
| `ftp-server` | instance | the same contract with a vendored dependency |

`passbolt-search` is the one to try first if you have a Passbolt server: paste the URL, your user
UUID, an exported private key and its passphrase, then trust the server fingerprint once. Search by
hostname, IP or URI and open SSH/FTP/Telnet/RDP straight from the result rows — the tab is tagged
`from: widget:passbolt-search`, and tabs with a `from` value are never written to connection history,
so decrypted credentials stay out of synced data.

No server? `node scripts/passbolt-mock-and-run.js` starts a throwaway Passbolt-shaped server on
`127.0.0.1`, generates keys, and walks connect → trust → search → details → openSsh → lock.

## 6. Security: two trust levels in one folder

Be precise about this, because it is the one thing that can hurt you:

- **The UI page is contained.** Own origin, sandboxed frame, nine methods, and the host only answers
  messages whose `source` is that frame.
- **`main.js` is not.** The main-process entry runs with full Node privileges inside the app: files,
  network, child processes. A widget that can call `docker` is effectively root; one that reads files
  can read your private keys.

So installing a widget is trusting its author, exactly like a VS Code extension or an npm package.
Install what you wrote or read.

What the host does enforce:

- a user widget **cannot take over a built-in id** — the built-in wins and the ignored folder is
  flagged in the list
- a widget reaches Node built-ins and its own `node_modules`, never the app's internal modules
- only functions the widget module itself exports are callable through the bridge
- `openTab` is tagged, and tagged tabs are excluded from connection history

## 7. Limits worth knowing before you start

| Limit | Why |
| --- | --- |
| No app internals | `require('../mcp/server/mcp.js')` from the data dir resolves to a path that does not exist. This is why the built-in MCP Server cannot be ported |
| Native modules are painful | They can be vendored, but the prebuilt binary must match the Electron ABI and be re-vendored on every Electron bump (`node-pty`, 27MB, is why there is no user-widget SSH server) |
| No terminal typing API | `openTab` opens a connection, not a command; a local tab cannot take a `cwd` or a command. Widgets copy a command to the clipboard instead |
| No push events | The bridge is request/response; poll for live data |
| No dev server for widget UIs | Import copies; edit, re-import, overwrite |
| Version coupling is yours | Assume the app's Node/Electron version, nothing else |

## 8. Try it in ten minutes

```sh
mkdir -p ~/widgets/hello && cd ~/widgets/hello
```

`package.json`:

```json
{
  "name": "hello",
  "version": "1.0.0",
  "main": "main.js",
  "electerm": {
    "id": "hello",
    "name": "Hello",
    "type": "frontend",
    "submitLabel": "Run",
    "configs": [
      { "name": "who", "label": "Who", "type": "string", "required": true, "default": "world" }
    ]
  }
}
```

`main.js`:

```js
module.exports = {
  async run ({ who }) {
    return {
      message: `Hello, ${who}!`,
      messageType: 'success',
      details: [{ label: 'Time', value: new Date().toISOString(), copy: true }]
    }
  }
}
```

Import the folder, click **Hello**, type a name, press **Run**. That is the whole loop — and it is the
same loop the five examples use, at a larger scale.

- Reference: [User widget guide](https://github.com/electerm/electerm/wiki/User-widget-guide)
- Examples: [electerm/electerm-widget-examples](https://github.com/electerm/electerm-widget-examples)
- Questions and widget showcases: [issues](https://github.com/electerm/electerm/issues)
