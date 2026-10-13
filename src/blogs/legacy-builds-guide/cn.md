---
title: Electerm 常规版与 Legacy 版的区别与选择指南
description: 下载页上的 -legacy、win7、mac10 文件有什么区别？讲清 legacy 构建的含义（Electron 基座、Windows 7、macOS 10.x、glibc < 2.34、龙芯旧世界），和常规版的差异，以及 30 秒选对版本的方法。
date: 2026-10-13
tags: [安装, legacy, windows-7, macos, linux, glibc, 龙芯]
---

# Electerm 常规版与 Legacy 版：区别与选择指南

在[下载页](https://electerm.org/#downloads)或 [GitHub releases](https://github.com/electerm/electerm/releases) 上，几乎每个 Linux 文件都有两份——一份普通，一份带 `-legacy`，Windows 还有 `win7` 包，macOS 还有 `mac10` 的 dmg。版本号一样，大小差不多，到底下哪个？

一句话：**同一个 electerm，不同的运行基座。** 常规版给新系统用，legacy 版给老系统用。选错了不会丢数据，只是启动不了；选对了功能完全一样。

## 30 秒速查表

| 你的系统 | 下这个 |
|---|---|
| Windows 10 / 11 | 常规版 `win-x64`（Intel/AMD）或 `win-arm64`（骁龙 / ARM 笔记本） |
| Windows 7 / 8 / 8.1 | `win7.tar.gz`（Windows 唯一的 legacy 构建） |
| macOS 11+（所有 Apple Silicon） | 常规版 `mac-arm64.dmg`（M1/M2/…）或 `mac-x64.dmg`（Intel） |
| macOS 10.x（10.13 / 10.14 / 10.15） | `mac10-x64.dmg` |
| 新 Linux（Ubuntu 20.04+、Debian 11+、较新的 Fedora / Arch，`ldd --version` 显示 glibc 2.34+） | 常规版（名字里没有 `-legacy`） |
| 老 Linux（Ubuntu 18.04、老 UOS / 麒麟、CentOS 7 时代，`ldd --version` 显示 glibc < 2.34），或报错 `GLIBC_2.34 not found` | `-legacy` 版 |
| 龙芯（LoongArch）UOS / 麒麟 | 新世界系统 → 常规版 `loong64`，旧世界系统 → `-legacy`（不确定问发行版厂商，见下文） |

系统是主流较新版本，**无脑选常规版。** 只有常规版装不上、跑不起来时，才换 legacy。

## `-legacy` 到底是什么

Electerm 是 Electron 应用：SSH 会话、SFTP 面板、主题和 AI 助手都是 JS 写的，但底下压着 Chromium + Node.js 运行时，直接和操作系统打交道。

Chromium / Electron 每年都会放弃老系统：

- Electron 23+ 起不再支持 Windows 7/8/8.1（跟随 Chromium 109+）。
- 新版 Electron 需要新版 macOS SDK，老 macOS 10.x 跑不起来。
- 新版 Linux 构建在新发行版上编译，要求 glibc 2.34+。glibc 只向前兼容：在老 glibc 上编译的二进制能在新 glibc 上跑，反过来**在新 glibc 上编译的跑不了老系统**。

所以 electerm 为**同一份代码、同一个版本号、同一套功能**出了两种口味：

- **常规版：** 用当前 Electron + 新基座编译。性能最好，Chromium 安全更新最新，硬件加速表现符合预期。
- **Legacy 版（`-legacy`、`win7`、`mac10`）：** 用兼容老系统的 Electron / 老基座编译，能在 Windows 7、macOS 10.x、glibc 低到 2.17（Ubuntu 18.04、UOS、麒麟、CentOS 7 时代）的机器上启动。龙芯上还额外区分**旧世界 ABI** 与**新世界 ABI**。

书签、同步（GitHub gist / WebDAV / electerm cloud）、快捷命令、AI 功能两边完全一致。版本号也一样——比如 `electerm-5.5.66-linux-x86_64.rpm` 和 `electerm-5.5.66-linux-x86_64-legacy.rpm` 都是 v5.5.66，同一天发布。

一个顺带现象：legacy 文件经常**更小**（v5.5.66 里常规 x86_64 AppImage 约 121 MB，legacy 约 95 MB）。这只是 Chromium 基座不同，不是功能缩水。

## 文件名怎么认

命名规律是 `electerm-<版本>-<平台><后缀>`：

- **Windows：** `electerm-5.5.66-win-x64-installer.exe` = 常规安装包。`electerm-5.5.66-win7.tar.gz` = Win7/8 专用 legacy（解压即运行，没有安装程序）。Windows 上没有 `-legacy` 后缀——`win7` 本身就是 legacy 标记。
- **macOS：** `electerm-5.5.66-mac-arm64.dmg` / `mac-x64.dmg` = 常规版。`electerm-5.5.66-mac10-x64.dmg` = macOS 10.x 专用（只有 Intel，那时还没有 Apple Silicon）。
- **Linux：** 扩展名前带 `-legacy` 的就是 legacy，如 `electerm-5.5.66-linux-amd64-legacy.deb` 对 `electerm-5.5.66-linux-amd64.deb`。`.deb`、`.rpm`、`.AppImage`、`.tar.gz` 都一样，`x64`、`arm64`、`armv7l`、`loong64` 都有两份。
- **龙芯特例：** 会同时看到 `linux-loong64.deb` 和 `linux-loong64-legacy.deb`（有时也叫 `loongarch64`）。这里的 `-legacy` 指的是**旧世界 vs 新世界系统 ABI**，不只是 glibc 新旧。[下载页](https://electerm.org/#downloads)上直接标成“新世界”和“旧世界”。

首页下载区已经帮你分好标签：`x86_64` 对 `x86_64 Legacy`，`ARM64` 对 `ARM64 Legacy`，`LoongArch64` 对 `LoongArch64 Legacy`，Windows 还有单独的 `Windows 7` 标签。

## 三条命令选对版本

### Windows

按 `Win + R`，输入 `winver` 回车；或设置 → 系统 → 关于。

- 显示 Windows 10 / 11 → 常规版 `win-x64-installer.exe`（ARM 笔记本如骁龙 X Elite，看“系统类型”是 ARM 就下 `win-arm64`）。
- 显示 Windows 7 / 8 / 8.1 → `win7.tar.gz`。工业 / 实验室那种必须留在老系统的机器也用它。

### macOS

左上角苹果菜单 → 关于本机。

- macOS 11 Big Sur 及更新 → 按芯片下常规 dmg（M 系列 → `mac-arm64.dmg`，Intel → `mac-x64.dmg`）。
- macOS 10.x（Catalina 10.15 及更老）→ `mac10-x64.dmg`。打开后拖进 Applications，首次运行被 Gatekeeper 拦就右键 → 打开。

### Linux

跑这三条：

```bash
cat /etc/os-release   # 哪个发行版、哪个版本，如 Ubuntu 18.04 还是 22.04，UOS / 麒麟版本
ldd --version         # 第一行就是 glibc，如 "ldd (Ubuntu GLIBC 2.27...)"
uname -m              # CPU：x86_64、aarch64（= arm64）、armv7l、loongarch64、riscv64、ppc64le
```

判定：

1. 先按 `uname -m` 对架构：`x86_64` → `x64`/`amd64`/`x86_64`，`aarch64` → `arm64`，`armv7l` → `armv7l`，`loongarch64` → `loong64`，另有只有常规版的 `riscv64` / `ppc64le`。
2. glibc **2.34 及更新**（Ubuntu 22.04 自带 2.35，Debian 12 自带 2.36，Fedora 38+ 自带 2.37+）→ 常规版。
3. glibc **老于 2.34**（Ubuntu 18.04 是 2.27，很多 UOS / 麒麟旧世界是 2.28）→ `-legacy` 版。粗略记：Ubuntu 18 / Debian 9 / CentOS 7 时代及同期国产发行版 = legacy；Ubuntu 20.04+ / Debian 11+ / 较新的 UOS = 先试常规版。

龙芯只看 glibc 不够。龙芯有过“旧世界”（早期 UOS / 麒麟龙芯版用的过渡 ABI）和“新世界”（上游标准化后的 ABI）之分，新世界二进制在旧世界系统上跑不起来，反之亦然，哪怕 glibc 一样。如果 `uname -m` 是 `loongarch64` 又不知道自己是哪个世界，去看发行版 release notes 或问厂商——新世界拿常规版，旧世界拿 `-legacy`。

## “下错了”长什么样

放心，下错不会丢数据，只是启动阶段就失败。换个文件就行——书签和配置在数据目录里，不在安装包里。

| 现象 | 原因 | 解法 |
|---|---|---|
| Linux：`./electerm: /lib/x86_64-linux-gnu/libc.so.6: version 'GLIBC_2.34' not found` | 老 glibc 上跑了常规版 | 换同架构的 `-legacy` `.deb` / `.rpm` / `.AppImage` / `.tar.gz` |
| Linux：`cannot execute binary file` 或秒退 | 架构下错（如 arm64 派上跑了 x64 包） | 重查 `uname -m`，下对架构 |
| Windows 7：安装包打不开、白屏、缺 `api-ms-win-*` DLL | 常规版要 Windows 10+ | 下 `win7.tar.gz`，解压运行 |
| macOS 10.x：提示“This application requires macOS 11 or later” / 打不开 | 常规 dmg 要新 SDK | 下 `mac10-x64.dmg` |
| 龙芯：架构明明对，却 `Exec format error` 或解释器找不到 | 新旧世界搞混 | loong64 常规版 ↔ `-legacy` 互换试试 |

很老的独显如果跑常规版渲染异常，也可以试试 legacy——老 Chromium 在十年前的图形栈上反而更稳。

## FAQ

**legacy 版是不是过时的、功能少的？**
不是。两边同一份提交、同一个版本号一起发布。v5.5.66 发布时，40 来个包——常规和 legacy——是同一批出来的。

**legacy 版是不是更不安全？**
它的 Chromium 基座确实更老（不老就跑不上老系统），常规版会先吃到上游 Chromium 的加固。但应用层的问题两边都会修；在已经停止更新的老系统上跑个还有人维护的 legacy 版，远比跑个远古终端安全。系统*能*跑常规版就跑常规版。

**以后能换吗？**
能。删掉一个装另一个就行。数据目录、导出的 JSON、云同步都能带过去。很多人会在 U 盘里备一个另一口味的免安装 `.tar.gz` / `.AppImage`，去机房老机器上直接跑。

**snap / apt / rpm 仓库 / winget / brew 装的是哪个？**
包管理器渠道跟的都是**常规版**。要 legacy 就去[首页](https://electerm.org/#downloads)、[GitHub releases](https://github.com/electerm/electerm/releases)、[AtomGit 镜像（国内快）](https://atomgit.com/electerm/electerm/releases)或[历史版本存档](https://history.electerm.org/releases/)直接下载文件。

**安卓 / 鸿蒙 / iOS 有 legacy 版吗？**
没有——`-legacy` / `win7` / `mac10` 只存在于桌面端（Windows / macOS / Linux）。移动端是按 ABI 分 APK，见[安装配置总指南](/blogs/install-electerm/cn/)。

## 作弊条

- 新系统 → 常规版（名字里没有 `-legacy`）。老系统 → legacy（`-legacy`、`win7`、`mac10`）。
- Linux 只看 `ldd --version`：≥ 2.34 常规，< 2.34 legacy。
- 龙芯看新旧世界：旧世界 legacy，新世界常规。
- 版本、功能、同步都一样，只差“最低能跑的系统”。拿不准就先试常规版，报 GLIBC / 系统版本不够再换 legacy。

下一篇：[安装配置总指南](/blogs/install-electerm/cn/)看各系统安装步骤，跑起来后看 [SSH 功能指南](/blogs/ssh-features-guide/cn/)。
