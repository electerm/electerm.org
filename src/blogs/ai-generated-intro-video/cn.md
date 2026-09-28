---
title: Electerm 介绍视频——100% AI 生成，从文案到配音
description: 新版 electerm 介绍视频，完全由 AI 生成：使用 workbuddy AI（deepseek v4.1flash）完成文案、配音、剪辑与字幕，中英双语，约 3 分钟讲清 electerm。
date: 2026-09-28
tags: [介绍, AI生成, 视频, workbuddy, deepseek]
videos: [electerm-introduction-video, electerm-usage-demo]
featureVideo: electerm-introduction-video
---

# Electerm 介绍视频——100% AI 生成

我们刚发布了一个新的 electerm 介绍视频：[Electerm 介绍视频](/videos/electerm-introduction-video/)。

这个视频特别的地方不只是内容，而是它的制作方式：**全片完全由 AI 生成**，从文案、配音到剪辑，都是用 `workbuddy AI` + `deepseek v4.1flash` 模型做的。没有相机，没有麦克风，也没有人肉拖时间线。

Bilibili 原片：[electerm 介绍视频](https://www.bilibili.com/video/BV1ufaq6gE61/)。

## 视频里讲了什么

全片约 3 分钟（199 秒），分两个分 P：

- **P1 `electerm-intro-cn`（约 98 秒）**——中文配音：electerm 是什么、支持哪些协议、能跑在哪些系统上。
- **P2 `electerm-intro-en`（约 101 秒）**——同样内容的英文版。

文案只抓主干：

- electerm 是**完全免费开源**的终端 / SSH / SFTP / FTP / Telnet / 串口 / RDP / VNC / Spice 客户端。
- 一个应用覆盖 **Linux、macOS、Windows、Android、鸿蒙与 iOS**。
- 还有容易被忽略的长尾支持：Ubuntu 18、Windows 7、macOS 10+，统信 UOS、银河麒麟等国产 Linux，龙芯 LoongArch（新旧世界都支持），以及 RISC-V（`riscv64`）和 PowerPC 64 位小端（`ppc64le`）Linux。

想要图文完整版，先看[《Electerm 介绍》](/blogs/electerm-introduction/cn/)。

## 怎么做的——全 AI

Bilibili 简介里写得很直白：

> 完全 AI 生成的 electerm 介绍视频，使用 workbuddy AI (deepseek v4.1flash) 生成。

实际流程就是：

1. 把产品事实（功能、协议、平台列表）丢给 workbuddy AI。
2. 它写中英双语文案、生成配音、组装画面、压字幕。
3. 人只负责审片：核对平台列表、修正 `LoongArch` / `riscv64` / `ppc64le` 这类词的发音，然后上传。

人肉剪辑时间：几乎为零。对比经典的录屏教程，比如 [Electerm 使用演示](/videos/electerm-usage-demo/)——讲点击操作很实在，但每次重录都是一次录屏 session。

## 为什么用 AI 做介绍片

- **双语不双倍。** 人录中英两版要录两遍，AI 只是多渲染一次。
- **文档变了，视频能跟上。** 平台列表加了一行，重新生成配音就行，不用重录。
- **短到能转发。** 每种语言约 100 秒，正好是"朋友问 electerm 是啥，直接甩链接"的长度，10 分钟演示版填不了这个坑。

它替代不了实操指南——要看点击和设置，还是去[视频指南](/videos/)（40+ 短视频，一个功能一个）。把它当预告片，其他视频当说明书就行。

## 接下来看什么

- [Electerm 介绍视频](/videos/electerm-introduction-video/)——本文的新 AI 预告片（本篇 featureVideo）
- [Electerm 使用演示](/videos/electerm-usage-demo/)——经典 10 分钟录屏 walkthrough
- [《Electerm 介绍》](/blogs/electerm-introduction/cn/)——图文功能全览
- [《安装 Electerm》](/blogs/install-electerm/cn/)——选平台，先试试 demo 书签
