---
title: 'Electerm 拖文件进终端：trz/rz 上传，或只粘贴路径'
description: 把任意文件拖到 electerm 终端上，再选接下来做什么——用 trz（trzsz）或 rz（zmodem）上传到远端，或只把加引号的路径粘贴进 shell。SSH、串口、本地会话各自怎么处理，以及如何设一个默认动作让它以后不再问。
date: 2026-10-01
tags: [终端, ssh, 文件传输, trzsz, zmodem, 拖拽, 提效]
bannerScript: banner.js
---

# Electerm 拖文件进终端：trz/rz 上传，或只粘贴路径

构建产物躺在下载文件夹里，要送到服务器上。常规操作：打开 SFTP，找到远端目录，把文件拖过去，等传完，再切回终端。或者先想起远端装的是 `trz` 还是 `rz`，敲进去，再去找文件选择框。

electerm 把这串动作压成一个手势：**把文件直接拖到终端上**。一个小对话框问你想干什么——用 `trz` 上传、用 `rz` 上传，还是只把加引号的路径粘贴进 shell——选完即执行。先看顶部动画：这就是全部流程，十秒讲完。

## 拖进去之后到底发生了什么

把一个（或几个）文件丢到任意终端面板上，electerm 按会话类型分流：

| 会话类型 | 拖入后出现 | 为什么 |
|---|---|---|
| **SSH** | `trz` / `rz` / 粘贴路径（`inputOnly`） | 远端 shell 能接收上传，但你也可能只想要路径 |
| **串口（Serial）** | `XMODEM` / 粘贴路径 | 串口只有 XMODEM 通道，没有 trz/rz |
| **本地 / 其它** | 不弹窗，直接粘贴加引号的路径 | 没有“远端”可传，键入 `"~/deploy.tar.gz" ` 是唯一合理的答案 |

两种拖拽来源都认。从系统文件管理器拖进来的，会解析出它在磁盘上的真实路径。从 electerm 内部（SFTP 面板、文件管理器）拖出来的，同样先解析成完整路径，再进同一个对话框。

多文件也没问题：一次拖三个日志，要么一起上传，要么粘成 `"a.log" "b.log" "c.log"`——加引号、空格分隔。

## SSH 的三个选项

SSH 会话下对话框给三个选项，翻译成人话：

- **`trz`**——trzsz 上传（本地 → 远端）。electerm 把文件列表交给传输层，然后往会话里键入 `trz` + 回车，跟你手敲一模一样。远端必须装好 trzsz（`PATH` 里能找到 `trz`）。这是现代默认选项——比 zmodem 更快更稳，也是软件其它地方推荐的方案。
- **`rz`**——经典 zmodem 上传。同样的握手，换成 `rz` + 回车。留给老机器、极简 BusyBox、只有 `lrzsz` 的跳转设备 CLI。
- **粘贴路径（`inputOnly`）**——不上传，只把本地路径加引号键入 shell，例如 `"/Users/zxd/Downloads/deploy.tar.gz" `。远端能看到同一份挂载想自己拼命令（`tar xzf` + 粘贴）、文件本来就在远端只是想要个准确文件名时，用这个。

如果已经有一个传输在跑，electerm 不会叠第二个——你会看到 *A transfer is already in progress* 的提示，而不是一个传坏的文件。

## 不想每次都选：设一个默认动作

默认行为是 `ask`——每次拖都弹窗。如果你永远只做同一件事，去**设置 → 终端 → `dragDropBehavior`** 一次设好：

- `ask`——每次都弹窗问（默认）
- `trz`——SSH 拖入直接开始 trzsz 上传
- `rz`——SSH 拖入直接开始 zmodem 上传
- `inputOnly`——拖入只粘贴加引号的路径

这个默认同样作用于从 electerm 自带 SFTP 面板拖出来的文件，所以 SFTP → 终端整条链路可以变成一次拖拽、零点击。

## 30 秒走一遍

1. `ssh` 到一台装好 trzsz 的主机（远端敲 `trz` 应该有反应）。
2. 把 `deploy.tar.gz` 从 Finder / 资源管理器拖到终端面板上。
3. 在对话框里点 **`trz`**。
4. 终端发出 `trz`，文件选择框里已经填好你的文件，进度条跑完，shell 回到提示符。文件已经在远端当前目录里了。

想以后连点都省了？把 `dragDropBehavior` 设成 `trz`——第 3 步消失，以后每次拖都是直接上传。

粘贴流程更短：拖进去，点粘贴路径按钮，加引号的路径就落在当前命令行上，末尾还带个空格等你加参数。

## 串口会话：XMODEM

串口标签页的对话框只有两个按钮——**XMODEM** 或粘贴路径。选 XMODEM 同样先填好文件列表，再调 `xmodemClient.initiateSend()`，在串口线上发起 XMODEM 发送握手。进度 UI、取消行为和 SSH 传输一样，只是慢一些——那是波特率的锅，不是 bug。

## 真正要紧的安全提醒

- **不安全的文件名会被拒绝。** 路径里带 `"`、`'` 或换行符的，不会半截引号地粘进 shell，而是直接报错 *File name contains unsafe characters*。先重命名。
- **上传落点是远端当前目录。** 拖之前先 `cd` 对地方——对话框不会问你要传到哪。
- **远端必须有 `trz` / `rz`。** 远端回 `trz: command not found`，就去装 trzsz（`https://github.com/trzsz/trzsz`），或者退回 `rz`（如果有 `lrzsz`）。拖拽只是*发起*命令，远端得接得住。
- **一次只传一个。** 传一半再起第二个会弹警告并关掉对话框。等第一个跑完。

## 排查清单

1. 拖了没弹窗？本地 shell 按设计就是直接粘贴——只有 SSH 和串口标签页会问。
2. 远端说 `trz: command not found`？去那台主机上装 trzsz，或改选 `rz`。
3. 传输开始了但卡住？可能有另一个传输占着——找到进度 UI，先取消它。
4. 粘出来的路径斜杠不对？粘的是*本地*路径——SSH 会话里只有远端看得到同一份文件系统时才有意义。
5. 文件名带引号被报错？那是 unsafe-filename 守卫。改名再拖。

## 速查表

- **文件拖到 SSH 终端** → 弹窗：`trz`（trzsz 上传）/ `rz`（zmodem 上传）/ 粘贴加引号路径。
- **文件拖到串口终端** → 弹窗：`XMODEM` / 粘贴加引号路径。
- **文件拖到本地终端** → 直接粘贴加引号路径，不弹窗。
- **默认值**：设置 → 终端 → `dragDropBehavior`（`ask` / `trz` / `rz` / `inputOnly`）。
- **底层**：先暂存文件列表，再发送 `trz` / `rz` + 回车；XMODEM 调 `initiateSend()`。源码：`term-file-drop.js`、`drop-file-modal.jsx`、`file-drop-utils.js`。

下一篇：[Electerm 的 SSH 能力](/blogs/ssh-features-guide/cn/)——先把要接文件的会话配好；或者看看[终端与 SFTP 分屏](/videos/electerm-terminal-and-sftp-split-view/)——不想拖的时候就用浏览的方式。
