---
title: 如何在 Windows、macOS、Linux、Android 与 iOS 上安装与配置 Electerm
description: 在各大系统上下载安装 electerm——Windows、macOS、Linux（deb、rpm、snap、AppImage、压缩包、APT/RPM 仓库）、Android、鸿蒙与 iOS，外加首次配置、同步与更新。
date: 2026-03-10
tags: [安装, windows, macos, linux, android, 配置]
videos: [electerm-usage-demo]
---

# 如何在 Windows、macOS、Linux、Android 与 iOS 上安装与配置 Electerm

Electerm 支持 **Windows、macOS、Linux、Android、鸿蒙与 iOS**，还为老系统准备了特别构建（Windows 7、macOS 10.x、glibc < 2.34 的发行版如 Ubuntu 18 / UOS / 麒麟）与多种 CPU 架构（ARM64、ARMv7、LoongArch64、RISC-V 64、ppc64le）。所有安装包都在[首页](https://electerm.org/#downloads)与[历史版本存档](https://history.electerm.org/releases/)。

安装遇到问题先看 [Know issues](https://github.com/electerm/electerm/wiki/Know-issues) 与 [Troubleshoot](https://github.com/electerm/electerm/wiki/Troubleshoot)。

## Windows

要求：Windows 7+（x64 / ARM64），Win7 有专用 legacy 构建。

任选其一：

**1. 安装包（推荐）**——下载 `win-x64-installer.exe`（ARM 芯片机器下 `win-arm64`），一路下一步，从开始菜单启动。

**2. 免安装版**——下载名字里不带 `installer` 的 `.exe`，或 `.zip` / `.tar.gz`，解压即运行，无需管理员权限，适合放 U 盘。

**3. winget：**

```powershell
winget install electerm.electerm
```

**4. Scoop：**

```powershell
scoop bucket add dorado https://github.com/chawyehsu/dorado
scoop install dorado/electerm
```

**5. Microsoft Store**——在应用商店搜 "electerm"。

30975 端口提示：Windows 版会在本地 30975 端口起辅助服务，被防火墙或别的程序占用会报错，见 [In Windows Can Not Access Port 30975 Issue](https://github.com/electerm/electerm/wiki/In-windows-can-not-access-port-30975-issue)。

## macOS

要求：macOS 10.15+（Intel x64 与 Apple Silicon arm64 构建；另有 `mac10` 构建给 macOS 10.x 老系统）。

**1. DMG（推荐）**——下对架构：

- Apple Silicon（M1/M2/…）：`mac-arm64.dmg`
- Intel：`mac-x64.dmg`

打开后拖进 Applications。首次运行若被 Gatekeeper 拦截，右键 → 打开即可。

**2. Homebrew：**

```bash
brew install --cask electerm
```

## Linux

electerm 支持的 Linux 变种比多数 Electron 应用都多。先确认三件事：发行版家族（Debian 系还是 RHEL 系）、glibc 版本（`ldd --version`）、CPU（`uname -m`）。

**1. Debian / Ubuntu（`deb`）**——下载对应 `linux-x64.deb`（或 `arm64`、`armv7l`、`loong64`、`riscv64`、`ppc64le`）。老系统（Ubuntu 18、UOS/麒麟旧世界、glibc < 2.34）拿 `-legacy` 构建。

```bash
sudo dpkg -i electerm*.deb
# 或走 APT 仓库（Debian/Ubuntu）：
# https://repos.electerm.org/deb
```

**2. RHEL / Fedora / openSUSE（`rpm`）**——同样的架构/legacy 逻辑：

```bash
sudo rpm -i electerm*.rpm
# 或走 RPM 仓库：
# https://repos.electerm.org/rpm
```

**3. Snap（有 snapd 的发行版都行）：**

```bash
sudo snap install electerm --classic
```

**4. AppImage（所有发行版）**——下载 `.AppImage`，加执行权限即运行：

```bash
chmod +x electerm*.AppImage
./electerm*.AppImage
```

**5. 压缩包（所有发行版）**——`linux-*.tar.gz`，解压后直接运行里面的 `electerm`，适合没有 root 的服务器。

**6. npm（有 Node.js 就行）：**

```bash
npm i -g electerm
```

架构速查：

| `uname -m` | 下载 |
|---|---|
| `x86_64` | `x64`（老 glibc 用 `x64-legacy`） |
| `aarch64` | `arm64` |
| `armv7l` | `armv7l` |
| `loongarch64` | `loong64` 新世界 / 旧世界 |
| `riscv64` | `riscv64` |
| `ppc64le` | `ppc64le` |

## Android、鸿蒙、iOS

- **Android**：按 ABI 下 APK（多数新手机 `arm64-v8a`，老机器 `armeabi-v7a`，模拟器 `x86_64`），或去 release 页安装。源码见 [electerm-android](https://github.com/electerm/electerm-android)。
- **鸿蒙**：经 [AppGallery](https://appgallery.huawei.com/app/detail?id=org.electerm.electerm) 或 `electerm-harmony` 仓库。
- **iOS**：经 [Apple App Store](https://apps.apple.com/cn/app/electerm/id6792971552) 或 `electerm-ios` 仓库。

移动端主打随身 SSH/SFTP，配合工作区与云同步，手机 ↔ 电脑接力很顺滑。

## 首次配置（全平台通用）

1. **建第一个书签**：新建 → SSH，填主机、端口（22）、用户名。选认证方式（密码或密钥——细节见 [SSH 专文](/blogs/ssh-features-guide/cn/)），测试连接，保存。一次性的连接不用存，直接 quick-connect：输入 `user@host` 回车。
2. **导入旧数据**：设置 → 导入——electerm 吃自己的 JSON 导出，AI 书签生成器还能转别的终端的导出。
3. **开同步（推荐）**：设置 → 同步 → 选 GitHub/Gitee gist、WebDAV、自建服务器或 electerm cloud。需要 personal access token / secret gist，见 [Create secret gist](https://github.com/electerm/electerm/wiki/Create-secret-gist) 与 [Create Personal Access Token](https://github.com/electerm/electerm/wiki/Create-personal-access-token)。
4. **调终端手感**：字体、主题、透明度、背景图、`Ctrl+2` 全局呼出、选中自动复制、关键词高亮。
5. **开机自启**（桌面端）：按 [Autorun electerm when login to OS](https://github.com/electerm/electerm/wiki/Autorun-electerm-when-login-to-os) 设置，让 electerm 常驻一个快捷键。

## 保持更新

- 桌面端会检查 release feed（`/data/electerm-github-release.json`），有新版弹窗提示。
- winget / brew / snap / apt / rpm 用户：走包管理器更新（`winget upgrade`、`brew upgrade`、`snap refresh`、`apt upgrade`）。
- 想找老版本？[历史版本存档](https://history.electerm.org/releases/)保留了所有发布过的构建，每版有独立下载页。
- 1.x 升 2.x 丢数据？先别慌，看 [Upgrading from 1.x to 2.x: Data Loss Issue and Recovery](https://github.com/electerm/electerm/wiki/Upgrading-from-1.x-to-2.x:-Data-Loss-Issue-and-Recovery)，有恢复步骤。

## 验证安装

打开这个演示：[Electerm 使用演示](/videos/electerm-usage-demo/)，10 分钟走完核心流程。然后建一个 SSH 书签，打开终端 + SFTP 分屏，跑一条快捷命令，存一个工作区——这四步都通，安装就算成功，剩下的都是个性化。

下一篇：[Electerm SSH：认证、跳板、NetBird 与隧道](/blogs/ssh-features-guide/cn/)，连接深水区。
