---
title: Electerm 上架 AtomGit：国内高速下载镜像来了
description: electerm 官方 AtomGit 镜像上线——代码与安装包国内直连高速下载，首页每个下载卡片都新增 AtomGit(CN) 按钮，本文讲怎么用、和 GitHub 版本是什么关系。
date: 2026-09-28
tags: [atomgit, 镜像, 下载, 安装, 国内加速]
---

# Electerm 上架 AtomGit：国内高速下载镜像来了

国内用户下载 electerm 最常见的抱怨就一个：**GitHub 太慢**，大安装包（80–100 MB 的 deb / AppImage / exe）经常下到一半超时。以前只能靠 SourceForge 或 gh-proxy 绕一下，现在多了一个更直接的选项：**官方 AtomGit 镜像**。

- 镜像仓库：[https://atomgit.com/electerm/electerm](https://atomgit.com/electerm/electerm)
- 安装包下载：首页 [electerm.org/#downloads](https://electerm.org/#downloads) 上每个文件都有 `AtomGit(CN)` 按钮

如果你在国内，优先点 `AtomGit(CN)` 就行。

## AtomGit 是什么

[AtomGit](https://atomgit.com) 是[开放原子开源基金会](https://www.openatom.org/)旗下的开源代码托管平台，服务器在国内，国内访问不需要翻墙、速度快。electerm 在上面开了官方镜像仓库 `electerm/electerm`，代码和 release 安装包都会跟随 GitHub 同步。

简单理解：**GitHub 依然是主仓库，AtomGit 是国内的高速镜子**，文件一模一样，只是下载线路不同。

## 下载镜像怎么用

### 方法 1：从官网首页点（推荐）

打开 [electerm.org/#downloads](https://electerm.org/#downloads)，按平台找到你的文件（比如 Windows 的 `win-x64-installer.exe`、macOS 的 `mac-arm64.dmg`、Ubuntu 的 `linux-x64.deb`），每个下载卡片现在有 5 个链接：

- `GitHub` —— 主站，国外快
- `SourceForge` —— 老牌镜像
- **`AtomGit(CN)` —— 国内快，国内用户点这个**
- `gh-proxy` —— GitHub 加速代理
- `R2` —— Cloudflare R2 直链

认准 `AtomGit(CN)`，点下去就是 AtomGit 的 release 文件直链，浏览器直接下载，不用登录。

### 方法 2：直接去 AtomGit release 页

镜像仓库地址：

```text
https://atomgit.com/electerm/electerm
```

进去找 release / 下载区，按版本号拿文件。URL 规律和 GitHub 完全对应，方便对照：

```text
GitHub:  https://github.com/electerm/electerm/releases/download/v5.3.15/electerm-5.3.15-win-x64-installer.exe
AtomGit: https://atomgit.com/electerm/electerm/releases/download/v5.3.15/electerm-5.3.15-win-x64-installer.exe
```

只是把域名从 `github.com` 换成 `atomgit.com/electerm`，版本号和文件名都不变。校验文件大小 / SHA256 时两边是一致的。

### 源码也镜像了

只需要代码（提 issue、看实现、二次开发），也可以从 AtomGit 克隆，国内 `git clone` 快很多：

```bash
git clone https://atomgit.com/electerm/electerm.git
```

GitHub 主仓库不受影响，提 PR、报 issue 还是去 [github.com/electerm/electerm](https://github.com/electerm/electerm)。

## 该选哪个下载源

| 你在哪 | 推荐点哪个 | 说明 |
|---|---|---|
| 中国大陆 | **`AtomGit(CN)`** | 国内直连，最快最稳 |
| 海外 | `GitHub` | 主站，和 release 同源 |
| GitHub 打不开但能开 SourceForge | `SourceForge` | 老镜像，`electerm.mirror` 项目 |
| 要写脚本批量拉 | `R2` / `gh-proxy` | 直链友好，适合 `wget` / `curl` |
| Debian / Ubuntu / RHEL 系 | APT / RPM 仓库 | 装完还能 `apt upgrade` 跟着升级：`https://repos.electerm.org/deb`、`https://repos.electerm.org/rpm` |
| 应用商店用户 | 商店 | `winget` / `brew` / `snap` / Microsoft Store，和以前一样 |

Linux 用户注意先对好架构（`uname -m`）：`x86_64` 拿 `x64`，`aarch64` 拿 `arm64`，老 glibc（Ubuntu 18 / UOS / 麒麟旧世界）拿 `-legacy` 构建。完整对照表见[安装专文](/blogs/install-electerm/cn/)。

## 常见问题

**和 GitHub 的文件一样吗？**
一样。AtomGit 镜像跟随 GitHub release 同步，版本号、文件名、内容一致，只是换了个国内能高速访问的地址。

**需要注册 AtomGit 账号吗？**
下载不需要，直接点链接就是文件直链。只有你要去 AtomGit 上 star / fork / 参与代码才需要账号。

**Android APK 也有 AtomGit 链接吗？**
目前首页下载卡片的 `AtomGit(CN)` 主要覆盖桌面端安装包（Windows / macOS / Linux）。Android 用户继续走首页 `R2` / `GitHub` 直链，或去 [AppGallery](https://appgallery.huawei.com/app/detail?id=org.electerm.electerm) / GitHub release 页拿 APK；iOS 去 Apple App Store。

**以前的版本有镜像吗？**
有。AtomGit 仓库带 tags，历史 release 同样有对应下载链接；更老的归档也可以去[历史版本存档](https://history.electerm.org/releases/)。

**下载还是慢怎么办？**
换一个源试试（`AtomGit(CN)` → `SourceForge` → `gh-proxy` → `R2`），或换个时间段；企业内网先检查代理和防火墙对 `30975` 以外下载域名的拦截。安装包损坏先对照 release 页的 SHA256。

## 下一步

- [在 Windows、macOS、Linux、Android 与 iOS 上安装 Electerm](/blogs/install-electerm/cn/)——各平台安装包选型与首次配置
- [Electerm 介绍](/blogs/electerm-introduction/cn/)——装完之后，这个终端都能干什么
