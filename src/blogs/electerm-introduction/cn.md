---
title: Electerm 介绍 — 免费开源的终端与 SSH 客户端
description: Electerm 是免费开源的终端、SSH、SFTP 与远程桌面客户端，支持 Linux、macOS、Windows、Android、鸿蒙与 iOS。本文带你浏览它的核心功能。
date: 2026-01-15
tags: [介绍, 功能, ssh, sftp, 终端]
videos: [electerm-usage-demo, electerm-terminal-and-sftp-split-view, electerm-session-layout, electerm-batch-operations, electerm-quick-commands, electerm-workspace]
---

# Electerm 介绍

**Electerm** 是免费开源的终端 / SSH / SFTP / Telnet / Serial / RDP / VNC / Spice / FTP 客户端，支持 Linux、macOS、Windows、Android、鸿蒙与 iOS。它基于 Web 技术（Electron + React）构建，MIT 协议开源。源码：[github.com/electerm/electerm](https://github.com/electerm/electerm)。

如果你每天都泡在终端里，electerm 想成为那个"一个就够"的应用：本地 shell、远程 SSH、文件传输、远程桌面、工作区、快捷命令、批量操作、同步、主题与 AI 辅助，一个应用全包。

> 先看总览视频：[Electerm 使用演示](/videos/electerm-usage-demo/)

## 一个应用，多种协议

多数终端应用只做一件事，electerm 把它们装进了一个窗口：

- **终端**：功能完整的本地终端模拟器，支持主题、背景图、字体设置、关键词高亮、透明度、缩放、选中自动复制。
- **SSH + SFTP**：核心工作流。SSH 终端与 SFTP 文件管理器同屏显示，路径联动，拖拽传输，文件夹压缩传输，双击直接编辑远端文件，还有服务器信息面板。
- **FTP / Telnet / 串口**：面向老设备、路由器、嵌入式开发板。
- **RDP / VNC / Spice**：图形化远程桌面会话（VNC 为 beta），RDP 支持文件传输。
- **Web**：把内网控制台当成标签页，和终端放在一起。

典型的一天——SSH 上生产机、SFTP 传构建产物、RDP 连 Windows、串口调试开发板——可以在一个窗口、一套书签里完成。

## 终端 + SFTP 同屏

标志性布局是同一主机的终端与 SFTP 分屏显示：

- 新建 SSH 书签时同时打开 `enableSsh` 与 `enableSftp`。
- 点文件管理器按钮切换分屏。
- 打开 **SFTP 跟随终端路径**，shell 里 `cd`，文件面板自动跟过去（反过来也行）。
- 双击远端文件直接本地编辑，保存即上传。
- 文件夹压缩传输、权限编辑器、文件信息面板。

相关视频：

- [Electerm 终端与 SFTP 分屏](/videos/electerm-terminal-and-sftp-split-view/)
- [Electerm SFTP 传输文件与文件夹](/videos/electerm-sftp-transfer-files-and-folders/)
- [不同 SFTP 间拖拽传输](/videos/electerm-drag-and-drop-file-transfer-between-sftp/)
- [SFTP 路径与终端同步](/videos/electerm-sftp-path-sync-with-terminal/)

## 书签、快捷命令、批量输入

**书签**是 electerm 的连接管理器：文件夹、标签、颜色、备注、按书签独立的代理、编码、终端类型、启动目录、连接后自动执行的脚本，还支持 `ssh://user@host:22` 这种 deep-link 直接唤起。甚至可以用自然语言让 AI 生成书签（见 AI 篇）。

**快捷命令**是可复用的命令片段，可绑定书签或全局：一键执行 `docker ps`、`kubectl get pods`、 tail 日志等。wiki 里有模板库和视频演示。

**批量操作**更进一步：

- **批量输入 / 镜像输入**：敲一次，同时发往多个终端——集群滚动重启的神器。
- **批量执行命令**：在选中的多个会话上跑脚本并汇总结果。

视频：

- [Electerm 快捷命令](/videos/electerm-quick-commands/)
- [Electerm 批量操作](/videos/electerm-batch-operations/)
- [批量与镜像输入到多个终端](/videos/electerm-batch-and-mirror-input-to-multiple-terminals/)

## 工作区与会话布局

每天早上都要打开同样的 6 个会话？存成**工作区**：一键恢复布局 + 连接列表，还支持启动自动加载。分屏、标签页布局按工作区保存，"前端 + 后端 + 数据库 + 日志"一次到位。

- [Electerm 工作区](/videos/electerm-workspace/)
- [Electerm 会话布局](/videos/electerm-session-layout/)
- [启动时打开书签](/videos/electerm-open-bookmarks-on-startup/)

## 同步、云端与可移植性

书签、主题、快捷命令可以同步到：

- GitHub / Gitee secret gist
- WebDAV
- 自建同步服务器
- [electerm cloud (sync.electerm.org)](https://sync.electerm.org/)

导入导出是纯 JSON 文件，换机器迁移很简单。还有 [electerm-web](https://github.com/electerm/electerm-web) 与 Docker 镜像（浏览器里用同一套 UI），以及托管的在线版 [cloud.electerm.org](https://cloud.electerm.org)。

视频：[Electerm 同步数据到云服务](/videos/electerm-sync-data-to-cloud-service/)

## 自定义没有上限

- **主题**：完整的 UI + 终端主题编辑器，可从 iTerm2 配色库导入，去 [theme.electerm.org](https://theme.electerm.org) 分享。
- **字体、透明度、背景图、自定义 CSS**：几乎一切都能改，wiki 有自定义 CSS 样例。
- **快捷键**：全局呼出（默认 `Ctrl+2`，Guake 风格），全部可改。
- **多实例、系统标题栏、启动密码、本地启动目录**。

视频：

- [Electerm 主题设置与编辑](/videos/electerm-theme-settings-and-editing/)
- [Electerm 终端背景设置](/videos/electerm-terminal-background-settings/)
- [Electerm 自定义 CSS](/videos/electerm-custom-css-styling/)
- [Electerm 字体设置](/videos/electerm-change-font-settings/)

## SSH 强力功能（预告）

electerm 的 SSH 覆盖密码、公钥、ssh-agent、OpenSSH 证书、keyboard-interactive（MFA/TOTP 二次验证）、连接跳转（跳板机）、NetBird / proxy-command、SOCKS/HTTP 代理、X11 转发、保活与本地/远端/动态隧道。专文 [Electerm SSH：认证、跳板、NetBird 与隧道](/blogs/ssh-features-guide/cn/) 有完整 walkthrough 与 wiki 链接。

## 内置 AI（预告）

自然语言生成命令、选中解释、AI 生成书签、AI 生成主题，以及在终端里直接跑多步任务的 agent 模式——可接任意 OpenAI 兼容 API，或免费的 [ai.electerm.org](https://ai.electerm.org) 服务。完整介绍：[Electerm AI 功能](/blogs/ai-features-guide/cn/)。

## 下一步

- [在 Windows、macOS、Linux、Android 与 iOS 上安装 Electerm](/blogs/install-electerm/cn/)
- [官方 wiki](https://github.com/electerm/electerm/wiki)——每个功能的深度文档
- [视频指南](/videos/)——40+ 短视频，每个功能一个
- [下载](https://electerm.org/#downloads)——选平台，先试试 demo 书签
