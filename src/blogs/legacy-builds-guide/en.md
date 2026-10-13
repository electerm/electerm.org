---
title: Legacy vs Regular Builds in Electerm - What's Different and How to Choose
description: Confused by -legacy, win7 and mac10 files on the electerm download page? Learn what legacy builds change (Electron base, Windows 7, macOS 10.x, glibc < 2.34, LoongArch old-world), how they differ from regular builds, and which one to download in 30 seconds.
date: 2026-10-13
tags: [install, legacy, windows-7, macos, linux, glibc, loongarch]
---

# Legacy vs Regular Builds in Electerm: What's Different and How to Choose

On the [download page](https://electerm.org/#downloads) or [GitHub releases](https://github.com/electerm/electerm/releases) you will see almost every Linux file twice — once plain, once with `-legacy` — plus a `win7` archive on Windows and a `mac10` dmg on macOS. Same version number, similar size, different file. Which one do you need?

Short answer: **same electerm, different runtime base.** Regular builds are for modern systems. Legacy builds are for older systems. Pick wrong and the app just won't start — pick right and everything works identically.

## The 30-second rule

| Your system | Download this |
|---|---|
| Windows 10 / 11 | regular `win-x64` (Intel/AMD) or `win-arm64` (Snapdragon / ARM) |
| Windows 7 / 8 / 8.1 | `win7.tar.gz` (the only Windows legacy build) |
| macOS 11+ (including all Apple Silicon Macs) | regular `mac-arm64.dmg` (M1/M2/...) or `mac-x64.dmg` (Intel) |
| macOS 10.x (10.13 / 10.14 / 10.15) | `mac10-x64.dmg` |
| Modern Linux (Ubuntu 20.04+, Debian 11+, Fedora / Arch recent, `ldd --version` shows glibc 2.34+) | regular (no `-legacy`) |
| Old Linux (Ubuntu 18.04, UOS / Kylin old releases, CentOS 7-era, `ldd --version` shows glibc < 2.34) or you get a `GLIBC_2.34 not found` error | `-legacy` build |
| LoongArch (Loongson) UOS / Kylin | new-world system → regular `loong64`, old-world system → `-legacy` (ask your distro vendor if unsure, see below) |

If you are on a mainstream, up-to-date OS, **always take the regular build.** Only reach for legacy when the regular one refuses to run or your OS is on the left side of the table above.

## What `-legacy` actually means

Electerm is an Electron app: your SSH sessions, SFTP panel, themes and AI assistant run as JavaScript, but they sit on top of a Chromium + Node.js runtime that talks directly to the OS.

Every year Chromium and Electron drop support for older OS versions:

- Electron 23+ dropped Windows 7/8/8.1 (follows Chromium 109+).
- Newer Electron needs newer macOS SDKs, so old macOS 10.x can't run it.
- Newer Linux builds are compiled on newer distros, so they require glibc 2.34+. glibc is forward-compatible only: a binary built on old glibc runs on new glibc, but a binary built on new glibc **refuses to run** on old glibc.

So electerm ships two flavors of the **same app code, same version number, same features**:

- **Regular:** built with the current Electron on a modern base. Best performance, newest Chromium security fixes, hardware acceleration as expected.
- **Legacy (`-legacy`, `win7`, `mac10`):** built with an older-compatible Electron / older build base so it still starts on Windows 7, macOS 10.x, and glibc as old as 2.17 (Ubuntu 18.04, UOS, Kylin, CentOS 7-era). For LoongArch it additionally means the **old-world ABI** vs the **new-world ABI**.

Nothing about your bookmarks, sync (GitHub gist / WebDAV / electerm cloud), quick commands, or AI features changes between the two. The version number is identical — e.g. `electerm-5.5.66-linux-x86_64.rpm` and `electerm-5.5.66-linux-x86_64-legacy.rpm` are both v5.5.66, released the same day.

Side effect you may notice: legacy files are often **smaller** (in v5.5.66 the regular x86_64 AppImage is ~121 MB, the legacy one ~95 MB). That is just the different Chromium base, not missing features.

## How to tell the files apart

File names follow `electerm-<version>-<platform><ext>`:

- **Windows:** `electerm-5.5.66-win-x64-installer.exe` = regular installer. `electerm-5.5.66-win7.tar.gz` = Windows 7/8 legacy (extract and run, no installer). There is no `-legacy` suffix on Windows — `win7` *is* the legacy marker.
- **macOS:** `electerm-5.5.66-mac-arm64.dmg` / `mac-x64.dmg` = regular. `electerm-5.5.66-mac10-x64.dmg` = macOS 10.x legacy (Intel only — there was no Apple Silicon back then).
- **Linux:** anything with `-legacy` before the extension is legacy, e.g. `electerm-5.5.66-linux-amd64-legacy.deb` vs `electerm-5.5.66-linux-amd64.deb`. This applies to `.deb`, `.rpm`, `.AppImage` and `.tar.gz`, across `x64`, `arm64`, `armv7l` and `loong64`.
- **LoongArch special case:** you will see both `linux-loong64.deb` and `linux-loong64-legacy.deb` (sometimes also labeled `loongarch64`). Despite the generic `-legacy` name, here it means **old-world vs new-world system ABI**, not just glibc age. The [download page](https://electerm.org/#downloads) labels them "New World" and "Old World".

On the homepage the download tabs already split these for you: `x86_64` vs `x86_64 Legacy`, `ARM64` vs `ARM64 Legacy`, `LoongArch64` vs `LoongArch64 Legacy`, plus a separate `Windows 7` arch tab.

## How to choose: check your system in 3 commands

### Windows

Press `Win + R`, type `winver`, Enter. Or Settings → System → About.

- Shows Windows 10 / 11 → regular `win-x64-installer.exe` (or `win-arm64` on ARM laptops like Snapdragon X Elite — check Settings → System → About → System type).
- Shows Windows 7 / 8 / 8.1 → `win7.tar.gz`. Also use it if you must stay on an unpatched old machine for industrial / lab hardware.

### macOS

Apple menu → About This Mac.

- macOS 11 Big Sur or newer → regular dmg matching your chip (Apple Silicon M-series → `mac-arm64.dmg`, Intel → `mac-x64.dmg`).
- macOS 10.x (Catalina 10.15 and older) → `mac10-x64.dmg`. Open after download, drag to Applications, right-click → Open on first run if Gatekeeper complains.

### Linux

Run these three:

```bash
cat /etc/os-release   # which distro + version, e.g. Ubuntu 18.04 vs 22.04, UOS / Kylin version
ldd --version         # first line shows glibc, e.g. "ldd (Ubuntu GLIBC 2.27...)"
uname -m              # cpu: x86_64, aarch64 (= arm64), armv7l, loongarch64, riscv64, ppc64le
```

Decision:

1. Map `uname -m` to the file arch: `x86_64` → `x64`/`amd64`/`x86_64`, `aarch64` → `arm64`, `armv7l` → `armv7l`, `loongarch64` → `loong64`, plus `riscv64` / `ppc64le` which currently ship regular-only.
2. If glibc is **2.34 or newer** (Ubuntu 22.04 ships 2.35, Debian 12 ships 2.36, Fedora 38+ ships 2.37+) → regular build.
3. If glibc is **older than 2.34** (Ubuntu 18.04 ships 2.27, many UOS / Kylin old-world releases ship 2.28) → `-legacy` build. As a rule of thumb: Ubuntu 18 / Debian 9 / CentOS 7-era and contemporary domestic distros = legacy; Ubuntu 20.04+ / Debian 11+ / UOS 1070+ new installs = try regular first.

For LoongArch, glibc alone is not enough. Loongson had an "old world" (pre-standard ABI used by early UOS/Kylin LoongArch releases) and a "new world" (the upstreamed ABI). A new-world binary will not run on an old-world system and vice versa, even with the same glibc. If `uname -m` says `loongarch64` and you don't know which world you have, check your distro's release notes or ask the vendor — then take regular for new-world, `-legacy` for old-world.

## "I picked the wrong one" — symptoms and fixes

Good news: picking wrong never breaks your data. It just fails fast at launch. Switch files and you are done — bookmarks and settings live in your data folder, not in the installer.

| Symptom | Cause | Fix |
|---|---|---|
| Linux: `./electerm: /lib/x86_64-linux-gnu/libc.so.6: version 'GLIBC_2.34' not found` | regular build on old glibc | download the `-legacy` `.deb` / `.rpm` / `.AppImage` / `.tar.gz` for your arch |
| Linux: `cannot execute binary file` or instant exit | wrong CPU arch (e.g. x64 binary on arm64 Pi) | re-check `uname -m`, download matching arch |
| Windows 7: installer won't start, blank window, or missing `api-ms-win-*` DLL errors | regular build needs Windows 10+ | download `win7.tar.gz`, extract and run |
| macOS 10.x: "This application requires macOS 11 or later" / won't open | regular dmg needs newer SDK | download `mac10-x64.dmg` |
| LoongArch: `Exec format error` or missing interpreter on an otherwise correct arch | old-world vs new-world mismatch | swap regular ↔ `-legacy` loong64 build |

If the regular build installs but renders oddly on a very old GPU, trying the legacy build is also a reasonable experiment — the older Chromium sometimes behaves better on decade-old graphics stacks.

## FAQ

**Are legacy builds outdated or missing features?**
No. Both flavors are built from the same commit and published under the same version. When v5.5.66 ships, all ~40 assets — regular and legacy — ship together.

**Are legacy builds less secure?**
They use an older Chromium base (that is precisely *why* they still run on old OSes), so the regular build gets newer upstream hardening first. But electerm still patches app-level issues in both, and running the legacy build on an old OS that gets no other current terminal is far safer than running an ancient terminal. If your OS *can* run the regular build, run it.

**Can I switch later?**
Yes. Uninstall / delete one, install the other. Your data folder, exported JSON, and cloud sync carry over. Many people keep a portable `.tar.gz` / `.AppImage` of the other flavor on a USB stick for old lab machines.

**What about snap / apt / rpm repos / winget / brew?**
Package-manager channels track the **regular** build. If you need legacy, download the file directly from the [homepage](https://electerm.org/#downloads), [GitHub releases](https://github.com/electerm/electerm/releases), the [AtomGit mirror (fast in China)](https://atomgit.com/electerm/electerm/releases), or the [releases archive](https://history.electerm.org/releases/).

**Do Android / HarmonyOS / iOS have legacy builds?**
No — `-legacy` / `win7` / `mac10` only exist for desktop (Windows / macOS / Linux). Mobile apps ship per-ABI APKs instead; see [How to Install and Set Up Electerm](/blogs/install-electerm/).

## Cheat-sheet

- Modern OS → regular (no `-legacy` in the name). Old OS → legacy (`-legacy`, `win7`, `mac10`).
- Linux tiebreaker is `ldd --version`: ≥ 2.34 → regular, < 2.34 → legacy.
- LoongArch tiebreaker is old-world → legacy, new-world → regular.
- Same version, same features, same sync — only the OS floor differs. When in doubt, try regular first; if it complains about GLIBC / OS version, grab legacy.

Next: [How to Install and Set Up Electerm](/blogs/install-electerm/) for per-OS install steps, or the [SSH features guide](/blogs/ssh-features-guide/) once you are up and running.
