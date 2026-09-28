---
title: Electerm on AtomGit: Fast Download Mirror for Users in China
description: electerm now has an official AtomGit mirror — same code and release binaries as GitHub, served from inside China. Every download card on the homepage has a new AtomGit(CN) button.
date: 2026-09-28
tags: [atomgit, mirror, download, install, china]
---

# Electerm on AtomGit: Fast Download Mirror for Users in China

If you download electerm from mainland China, you know the pain: **GitHub is slow**, and 80–100 MB installers (deb / AppImage / exe) often stall halfway. SourceForge and the gh-proxy helped, and now there is a more direct option: **an official AtomGit mirror**.

- Mirror repo: [https://atomgit.com/electerm/electerm](https://atomgit.com/electerm/electerm)
- Installers: every file on [electerm.org/#downloads](https://electerm.org/#downloads) now has an `AtomGit(CN)` button

If you are in China, click `AtomGit(CN)`. That is the whole guide — the rest is details.

## What is AtomGit

[AtomGit](https://atomgit.com) is the open-source code hosting platform run by the [OpenAtom Foundation](https://www.openatom.org/), with servers inside China — no VPN needed, fast for CN users. `electerm/electerm` there is an official mirror of the GitHub repo: same code, same release binaries, synced from GitHub.

Mental model: **GitHub stays the primary repo; AtomGit is the fast mirror for China.**

## How to use the mirror

### Option 1: from the homepage (recommended)

Open [electerm.org/#downloads](https://electerm.org/#downloads), find your file (e.g. `win-x64-installer.exe` for Windows, `mac-arm64.dmg` for Apple Silicon, `linux-x64.deb` for Ubuntu). Each download card now lists 5 links:

- `GitHub` — primary, fastest outside China
- `SourceForge` — classic mirror
- **`AtomGit(CN)` — fastest inside China, pick this if you are in China**
- `gh-proxy` — GitHub acceleration proxy
- `R2` — Cloudflare R2 direct link

`AtomGit(CN)` is a direct file link on AtomGit — just downloads in the browser, no login needed.

### Option 2: straight from the AtomGit releases

```text
https://atomgit.com/electerm/electerm
```

URLs map 1:1 to GitHub, only the host changes — same tag, same file name:

```text
GitHub:  https://github.com/electerm/electerm/releases/download/v5.3.15/electerm-5.3.15-win-x64-installer.exe
AtomGit: https://atomgit.com/electerm/electerm/releases/download/v5.3.15/electerm-5.3.15-win-x64-installer.exe
```

Sizes and SHA256 checksums match the GitHub release.

### Source code is mirrored too

```bash
git clone https://atomgit.com/electerm/electerm.git
```

Much faster `git clone` from inside China. Issues and PRs still live on [github.com/electerm/electerm](https://github.com/electerm/electerm).

## Which source should I pick

| Where you are | Pick | Notes |
|---|---|---|
| Mainland China | **`AtomGit(CN)`** | Direct domestic connection, fastest |
| Outside China | `GitHub` | Primary, same origin as releases |
| GitHub blocked, SourceForge reachable | `SourceForge` | `electerm.mirror` project |
| Scripted `wget` / `curl` | `R2` / `gh-proxy` | Friendly direct links |
| Debian / Ubuntu / RHEL | APT / RPM repos | Upgrade with the system: `https://repos.electerm.org/deb`, `https://repos.electerm.org/rpm` |
| Store users | Stores | `winget` / `brew` / `snap` / Microsoft Store, unchanged |

Linux users: match your arch first (`uname -m`) — `x86_64` → `x64`, `aarch64` → `arm64`, old glibc (Ubuntu 18 / UOS / Kylin old-world) → `-legacy` builds. Full table in the [install guide](/blogs/install-electerm/).

## FAQ

**Same files as GitHub?**
Yes. The AtomGit mirror follows GitHub releases — same versions, names and contents, just served from an address that is fast inside China.

**Do I need an AtomGit account?**
No for downloads — direct links, no login. Only if you want to star / fork / contribute there.

**Do Android APKs have AtomGit links?**
`AtomGit(CN)` buttons currently cover desktop installers (Windows / macOS / Linux). For Android keep using the homepage `R2` / `GitHub` links or the GitHub release page; HarmonyOS via [AppGallery](https://appgallery.huawei.com/app/detail?id=org.electerm.electerm), iOS via the Apple App Store.

**Old versions?**
Tags and historical releases are mirrored the same way; the [releases archive](https://history.electerm.org/releases/) keeps everything ever published.

## Next

- [How to Install and Set Up Electerm](/blogs/install-electerm/) — per-platform picks and first-run setup
- [Introducing Electerm](/blogs/electerm-introduction/) — what to do once it is installed
