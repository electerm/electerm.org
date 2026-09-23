---
title: How to Install and Set Up Electerm on Windows, macOS, Linux, Android and iOS
description: Download and install electerm on every major OS — Windows, macOS, Linux (deb, rpm, snap, AppImage, tarball, APT/RPM repos), Android, HarmonyOS and iOS — plus first-run setup, sync and updates.
date: 2026-03-10
tags: [install, windows, macos, linux, android, setup]
videos: [electerm-usage-demo]
---

# How to Install and Set Up Electerm

Electerm ships for **Windows, macOS, Linux, Android, HarmonyOS and iOS**, with extra builds for older systems (Windows 7, macOS 10.x, glibc < 2.34 distros like Ubuntu 18 / UOS / Kylin) and extra CPU architectures (ARM64, ARMv7, LoongArch64, RISC-V 64, ppc64le). Download everything from the [homepage](https://electerm.org/#downloads) or the [releases archive](https://history.electerm.org/releases/).

Check the [Know issues](https://github.com/electerm/electerm/wiki/Know-issues) and [Troubleshoot](https://github.com/electerm/electerm/wiki/Troubleshoot) wiki pages if an installer misbehaves.

## Windows

Requirements: Windows 7+ (x64 / ARM64). There is a dedicated legacy build for Windows 7.

Options, pick one:

**1. Installer (recommended)** — download the `win-x64-installer.exe` (or `win-arm64` on Snapdragon/ARM machines), run it, launch from Start Menu.

**2. Portable** — download the `.exe` without `installer` in the name, or the `.zip` / `.tar.gz`. Extract and run, no admin rights needed. Great for USB sticks.

**3. winget:**

```powershell
winget install electerm.electerm
```

**4. Scoop:**

```powershell
scoop bucket add dorado https://github.com/chawyehsu/dorado
scoop install dorado/electerm
```

**5. Microsoft Store** — search "electerm" in the Store app.

Port 30975 note: on Windows the app serves a local helper on port 30975. If a firewall or another app blocks it, see [In Windows Can Not Access Port 30975 Issue](https://github.com/electerm/electerm/wiki/In-windows-can-not-access-port-30975-issue).

## macOS

Requirements: macOS 10.15+ (Intel x64 and Apple Silicon arm64 builds; there is also a `mac10` build for macOS 10.x).

**1. DMG (recommended)** — download the right dmg:

- Apple Silicon (M1/M2/...): `mac-arm64.dmg`
- Intel: `mac-x64.dmg`

Open, drag to Applications. On first run, right-click → Open if Gatekeeper complains about an unsigned app.

**2. Homebrew:**

```bash
brew install --cask electerm
```

## Linux

Electerm covers more Linux variants than most Electron apps. Identify your case first: distro family (Debian vs RHEL vs other), glibc version (`ldd --version`), CPU (`uname -m`).

**1. Debian / Ubuntu (`deb`)** — download the matching `linux-x64.deb` (or `arm64`, `armv7l`, `loong64`, `riscv64`, `ppc64le`). If your system is old (Ubuntu 18, UOS/Kylin old-world, glibc < 2.34), grab the `-legacy` build.

```bash
sudo dpkg -i electerm*.deb
# or via the APT repo (Debian/Ubuntu):
# https://repos.electerm.org/deb
```

**2. RHEL / Fedora / openSUSE (`rpm`)** — same arch/legacy logic:

```bash
sudo rpm -i electerm*.rpm
# or via the RPM repo:
# https://repos.electerm.org/rpm
```

**3. Snap (any distro with snapd):**

```bash
sudo snap install electerm --classic
```

**4. AppImage (any distro)** — download `.AppImage`, make executable, run:

```bash
chmod +x electerm*.AppImage
./electerm*.AppImage
```

**5. Tarball (any distro)** — `linux-*.tar.gz`, just extract and run the `electerm` binary inside. Good for servers without root.

**6. npm (any OS with Node.js):**

```bash
npm i -g electerm
```

Arch cheat-sheet:

| `uname -m` | download |
|---|---|
| `x86_64` | `x64` (or `x64-legacy` on old glibc) |
| `aarch64` | `arm64` |
| `armv7l` | `armv7l` |
| `loongarch64` | `loong64` new-world / old-world |
| `riscv64` | `riscv64` |
| `ppc64le` | `ppc64le` |

## Android, HarmonyOS, iOS

- **Android**: download the APK for your ABI (`arm64-v8a` for most modern phones, `armeabi-v7a` for older ones, `x86_64` for emulators) from the homepage, or install from the release page. There is also [electerm-android](https://github.com/electerm/electerm-android) source.
- **HarmonyOS**: via [AppGallery](https://appgallery.huawei.com/app/detail?id=org.electerm.electerm) or the `electerm-harmony` repo.
- **iOS**: via the [Apple App Store](https://apps.apple.com/cn/app/electerm/id6792971552) or the `electerm-ios` repo.

Mobile apps focus on SSH/SFTP on the go; workspaces and cloud sync make phone ↔ desktop handoff painless.

## First-run setup (all platforms)

1. **Create your first bookmark**: click New → SSH, enter host, port (22), username. Pick auth (password or key — details in the [SSH guide](/blogs/ssh-features-guide/)), Test Connection, Save. Or skip saving and use quick-connect: just type `user@host` and Enter.
2. **Import existing data**: Settings → Import — electerm accepts its own JSON export, and the AI bookmark generator can convert other terminals' exports.
3. **Enable sync** (recommended): Settings → Sync → choose GitHub/Gitee gist, WebDAV, custom server, or electerm cloud. You will need a personal access token / secret gist — see [Create secret gist](https://github.com/electerm/electerm/wiki/Create-secret-gist) and [Create Personal Access Token](https://github.com/electerm/electerm/wiki/Create-personal-access-token).
4. **Tune the terminal**: set font, theme, transparency, background image, `Ctrl+2` global hotkey, auto-copy-on-select, keyword highlighting.
5. **Autorun on login** (desktop): follow [Autorun electerm when login to OS](https://github.com/electerm/electerm/wiki/Autorun-electerm-when-login-to-os) if you want electerm always a hotkey away.

## Keeping electerm updated

- Desktop apps check the release feed (`/data/electerm-github-release.json`) and prompt on new versions.
- winget / brew / snap / apt / rpm users: update through the package manager (`winget upgrade`, `brew upgrade`, `snap refresh`, `apt upgrade`).
- Want an old version? Every build ever published is kept in the [releases archive](https://history.electerm.org/releases/) with per-version download pages.
- Upgrading from 1.x to 2.x with data loss? Read [Upgrading from 1.x to 2.x: Data Loss Issue and Recovery](https://github.com/electerm/electerm/wiki/Upgrading-from-1.x-to-2.x:-Data-Loss-Issue-and-Recovery) before panicking — recovery steps are documented.

## Verify your install

Open the demo: [Electerm Usage Demo](/videos/electerm-usage-demo/) shows the first 10 minutes end-to-end. Then create one SSH bookmark, open terminal + SFTP split view, run a quick command, and save a workspace. If those four work, your setup is done — the rest is customization.

Next: [SSH in Electerm: auth, jump hosts, NetBird and tunnels](/blogs/ssh-features-guide/) for the connection deep-dive.
