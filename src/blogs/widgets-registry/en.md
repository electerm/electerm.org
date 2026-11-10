---
title: 'widgets.electerm.org - Find a Widget, Verify Every File, Install It in electerm'
description: The new widgets.electerm.org registry indexes community widgets at a pinned commit and publishes a sha256 for every file. electerm 5.10.0 can browse it from Settings → Widgets → Online and verify the whole tree before anything is copied to disk. Covers the three JSON endpoints, the install dialog, the digest check, the copyable install string, revocations, failure behaviour and what verification does not buy you.
date: 2026-11-10
tags: [widgets, registry, security, extensibility, supply-chain]
bannerScript: banner.js
---

# widgets.electerm.org: find a widget, verify every file

A widget repository is easy to install once somebody tells you its name. Finding widgets nobody told
you about is harder, and knowing that the bytes now sitting in your data folder are the bytes the
author published is harder still — a branch can move between the moment you read a README and the
moment you press Import.

[widgets.electerm.org](https://widgets.electerm.org) is the answer to both. It is a small index of
community widgets, each pinned to one commit with a sha256 for every file in the package. Since
**electerm 5.10.0** the desktop app reads that index directly: **Settings → Widgets → Online** lists
what is available, and one **Install** button downloads the pinned tree, hashes every file, and only
then copies the widget into place.

If you have not used user widgets at all yet, start with
[User Widgets: your own panel, without touching the app](/blogs/user-widgets/) — this post is about
where to *get* them.

## 1. What the site actually is

It is a pure static site on Cloudflare Workers Static Assets. No Worker script, no database, no
login, no admin and no write API. The build reads `data/widgets.json`, downloads each widget from its
author's repository at a pinned commit, hashes the files, and writes a handful of JSON files plus the
HTML pages. At request time the server does nothing but hand over files.

| Endpoint | What is in it |
| --- | --- |
| `/api/v1/index.json` | `version`, `generatedAt`, and summaries: id, name, version, description, author, license, repo, commit `ref`, `digest`, `fileCount`, `totalSize`, `status`, `sourceUrl`, `filesUrl` |
| `/api/v1/widgets/<id>.json` | the same record plus `files[]` — one `{ path, size, sha256 }` per file |
| `/api/v1/revocations.json` | ids removed from the registry, with a reason |
| `/health` | `{"ok":true}` |

`/api/v1/*` is served with `Access-Control-Allow-Origin: *` and
`Cache-Control: public, max-age=300` from a static `_headers` file. Only `<id>.json` detail URLs
exist; the index's `filesUrl` always uses that form.

**The site never hosts widget code.** It indexes metadata; the bytes come from each author's
repository. Getting listed is a pull request that appends one entry to `data/widgets.json`:

```json
{
  "host": "github.com",
  "owner": "electerm",
  "repo": "electerm-widget-tftp",
  "subdir": "",
  "ref": "<40-char lowercase hex commit sha>"
}
```

`ref` must be a full 40-character commit sha, never a tag or a branch — pinning a sha is what makes
the digest reproducible. `host` is `github.com` or `atomgit.com`. The widget's own `package.json`
must contain an `electerm` object with an `id` matching `^[a-z0-9-]+$`. A widget that merely
repackages an electerm built-in is not listed.

The build runs on every push to main, on a daily schedule at `0 3 * * *` (03:00 UTC), and on manual
dispatch. **Any failure aborts the build** — a half-built index is never published.

## 2. Use it in electerm: Settings → Widgets → Online

The **Widgets** settings panel has three tabs: the installed list, **Online**, and running instances.
Switch to **Online** and the app reads the index. Each row shows the name, version, description,
author, repository, license, file count, total size and the first seven characters of the commit;
installed widgets are marked and their button reads **Update**. The **Source** link opens the
repository at exactly that commit, and the search box filters the index by name, description, author
or repo.

Press **Install** and you get a 520px confirm dialog before any download. It spells out the trust
model in plain words — *a widget's `main.js` runs inside electerm's main process with full Node
permissions, it can read files and run commands, install only widgets whose source you trust* —
then lists version, author, repository, the full commit sha, `Files: 17 (88 KB), pinned and
verified`, and a **View source at this commit** link. Nothing is installed until you confirm.

Afterwards the widget is in the installed list with the same run form, instance log and start/stop
behaviour as any other user widget. If the id is already installed, a second dialog asks
**Replace installed widget?** before reinstalling with `overwrite = true`.

Two honest details about the panel:

- **Browsing is best-effort.** If the site is unreachable, the tab shows
  `Could not load the registry: ...` with a **Retry** button. The installed-widgets tab is
  completely independent and keeps working; a broken revocation list is silently treated as empty.
- **The search box is a filter, not a paste field.** A copied install string (§5) belongs in the
  **Import** dialog on the first tab. The website's three-step hint says "Widgets → Online"; in the
  app, the Online tab installs from its own list with a click.

## 3. What each item costs

| Item | What you see | Refresh | What runs on the server |
| --- | --- | --- | --- |
| `/api/v1/index.json` | the Online list: 3 summaries today | rebuilt on push, daily at 03:00 UTC, on dispatch; cached 300s | nothing at request time — a static file |
| `/api/v1/revocations.json` | a red "removed from the registry" line, Install disabled | same build and cache | nothing; a failure to load it is ignored |
| `/api/v1/widgets/<id>.json` | the file list used by the install | same build and cache | nothing |
| `/health` | nothing in the app | same build | nothing |
| The two JSON reads | a spinner, then the rows | once when the Online tab mounts; **Retry** on failure | two GETs through the app's own ws fetch proxy, 15s timeout each, honouring your proxy setting |
| The widget source | nothing until the files land in `<data dir>/widgets/<id>/` | once per install, always at the pinned sha | codeload.github.com → mirror.electerm.org → cdn.jsdelivr.net (30s timeout each), AtomGit via its contents API, 3 files at a time |

The registry has no polling, no push channel and no telemetry. The one thing that runs on a server
is the *build*, which fetches source so it can hash it.

## 4. What actually happens on the wire

This is the part worth reading before you trust an **Install** button.

1. **Read.** `loadWidgetRegistry()` fetches `/index.json` and `/revocations.json` in parallel through
   `fetchFromServer`, the same ws fetch proxy update checks use, with `timeout: 15000` and
   `Accept: application/json`. Every summary must have an id matching `^[a-z0-9-]+$`, a `ref`
   matching `^[a-f0-9]{40}$`, a `digest` matching `^sha256:[a-f0-9]{64}$` and `status === 'public'`;
   strings are type- and length-checked before they reach React. The detail URL is built from the
   **id**, never from a URL in the index, so a tampered index cannot make the app fetch an arbitrary
   address.
2. **Confirm.** The dialog shows the record the site published — including the full 40-character sha
   and the file count/size — with a link to the source at that commit.
3. **Record.** `installRegistryWidget(id)` loads `/widgets/<id>.json`, re-checks that the record is a
   valid summary, that `record.id === id` and that `files` is an array, then calls the main process:
   `runGlobalAsync('importWidgetFromRegistry', record, overwrite)`.
4. **Validate before any network or disk write.** The main process re-validates the whole record:
   host allowlist, safe owner/repo/subdir segments, 40-char sha, digest format, 1–800 files, each
   path safe and unique, each sha256 64 lowercase hex, each size a non-negative integer, total
   ≤ 32 MB, `fileCount` and `totalSize` equal to the file list, and
   `computeDigest(files) === record.digest`. The digest is sha256 of a canonical string, files sorted
   by path, one `path\0size\0sha256\n` line each — byte-for-byte the same algorithm on the build
   side and in the app.
5. **Download at the sha.** `registrySource()` builds a `/tree/<sha>` URL — never a branch, never
   HEAD. `fetchWidgetSource` tries codeload.github.com, then mirror.electerm.org, then
   cdn.jsdelivr.net file by file; AtomGit has no anonymous archive, so its contents API is walked at
   concurrency 3. Budgets: 30s per request, 800 files, 32 MB, 5 redirects. `.git` and
   `node_modules/.bin` links are skipped by every path, on both sides of the hash comparison.
6. **Verify the tree, then copy.** `collectTree()` hashes every regular file. A missing file, an
   extra file, a changed size, a changed sha256, a symlink, a special file, or a `package.json` whose
   `electerm.id` names a different widget all throw. Only after the whole tree matches does
   `importWidget()` copy the folder into `<data dir>/widgets/<id>/`, and the temp folder is removed
   in a `finally` block either way. A mismatch means **nothing was installed**; the error arrives as
   a toast and the busy spinner stops.

That is the whole point: a moved branch, a compromised mirror, an extra file or a changed vendored
dependency fail the install instead of quietly becoming part of it.

## 5. The copyable install string (and what it does not do)

Every card on the website — and every widget detail page — has a **Copy install** button that copies
a repo reference pinned to the exact commit the registry hashed:

```
electerm/electerm-widget-tftp#62957d636a302d43e606615857e32963950ef37c
```

Paste that into **Settings → Widgets → Import**. `parseWidgetSource()` reads everything after `#` as
the ref and downloads that commit through the same mirror chain. It is the right path for the web
app, for an offline machine with the folder already in hand, or for a widget that is not in the
registry.

It is **not** the same guarantee:

| | Online tab → Install | Widgets → Import with `owner/repo#sha` |
| --- | --- | --- |
| Pinned to a commit | yes | yes, if you paste the sha |
| Per-file sha256 check against the registry | yes | **no** |
| Manifest + id validation | yes | yes |
| Digest / fileCount / totalSize checked | yes | no |
| Needs the registry site | yes | no |
| Trust dialog | yes | no |

The website's widget detail page says this outright: the copied string does not verify the registry
digest. If you care about the verification, use the Online tab.

## 6. Numbers worth trusting

- **3 widgets** are indexed in the build stamped `generatedAt: 2026-11-09T10:45:45.961Z`:
  `passbolt-search` (0.1.0, 60 files, 17,170,711 bytes), `docker-cockpit` (1.0.0, 9 files,
  26,410 bytes) and `tftp-server` (1.0.0, 17 files, 89,749 bytes).
- `fileCount` and `totalSize` describe **the entire widget folder**, including vendored
  `node_modules`. Passbolt Search carries its OpenPGP/JWT dependencies, hence 60 files and ~16 MB;
  Docker Cockpit is nine small files. Neither number is an estimate of what your download will cost.
- The `digest` is **not** a hash of a tarball. It is sha256 of the sorted, canonical file manifest —
  a single changed byte in one file changes it, and so does adding or removing a file.
- `generatedAt` is **build time**, not request time. A new commit in an author's repository changes
  nothing until the next build and the 300s CDN cache expires. That staleness is a feature: it is
  what makes the pin a pin.
- The dialog's `Files: 17 (88 KB)` comes from the app's `formatSize()`:
  `(size / 1024).toFixed(size < 1024 * 1024 ? 0 : 1)`. Below 1 MB it is whole KB; above 1 MB it is
  KB with one decimal, so the 16.4 MB Passbolt widget is shown as `16768.3 KB`, not `16.4 MB`.
- `version`, `name`, `description`, `author` and `license` are read from the widget's **own**
  `package.json` at the pinned commit. The registry does not invent metadata.
- `revocations.json` is currently empty. If an id were revoked, the row would say
  *This widget was removed from the registry. Do not reinstall it* and **Install** would be
  disabled — but nothing already installed on your machine would be removed.

## 7. What verification does and does not buy you

It buys you a **verifiable, pinned origin** and an explicit install decision. It does not make a
widget safe. A widget's `main.js` runs in electerm's main process with full Node privileges: files,
network, child processes. A widget that can call `docker` is effectively root; one that reads files
can read your private keys. A perfectly verified malicious commit is still a malicious commit.

Installing a widget is trusting its author, exactly like installing a VS Code extension or an npm
package. The trust dialog exists for that reason. Read the source link before you confirm — the whole
point of pinning a sha is that the code you read is the code that gets installed.

What the client does enforce on top: only `github.com` and `atomgit.com` records, read-only JSON
consumed as untrusted input, no app internals exposed to widget `main.js`, a user widget cannot take
over a built-in id, and `openTab` results are tagged so they stay out of connection history.

## 8. Limits worth knowing

| Limit | Why |
| --- | --- |
| Online tab is desktop only | the registry client lives in the Electron app; the website's copied string is the web/offline path |
| No URL paste in the Online tab | the search field filters the index; installs start from a row |
| 800 files / 32 MB per widget | bounded on the build side and the client side so hashing stays cheap |
| GitHub or AtomGit only | the download chain and the `ref` rules are written for those two hosts |
| Revocation is advisory | it disables the Install button, it does not uninstall local files |
| No live updates | the index lists `status: public` records from the last build; reopen the tab to reload |
| No `npm install` | a widget carries its own `node_modules`, or it fails at load |

## 9. Try it

1. Update to **electerm 5.10.0** or newer.
2. Open **Settings → Widgets → Online**. Three rows should appear, loaded from
   [index.json](https://widgets.electerm.org/api/v1/index.json).
3. Pick **Local TFTP Server** (17 files, 89,749 bytes, the smallest self-contained one), press
   **Install**, read the dialog and open **View source at this commit**.
4. Confirm. The app pins commit `62957d63…`, hashes all 17 files, then copies the folder. The widget
   appears in the installed list; open it and you get the generated form with its folder and port
   fields.
5. Curious about the data? Open `/api/v1/widgets/tftp-server.json` to see the `files[]` array and the
   digest the app just checked.

- Registry: [widgets.electerm.org](https://widgets.electerm.org)
- Source of the registry: [electerm/electerm-widgets](https://github.com/electerm/electerm-widgets)
- Example index: [electerm/electerm-widget-examples](https://github.com/electerm/electerm-widget-examples)
- Write your own: [User widget guide](https://github.com/electerm/electerm/wiki/User-widget-guide) and
  [User Widgets: your own panel, without touching the app](/blogs/user-widgets/)
- Questions and widget showcases: [issues](https://github.com/electerm/electerm/issues)
