---
title: 'SFTP 路径跟随终端：一个位置，两边同步看'
description: 在终端里 cd，SFTP 文件面板自动跟过去；在 SFTP 里点开文件夹，终端自动 cd 跟上。如何在 electerm 里开启路径跟随，它如何用 OSC 633 跟踪 shell，以及什么时候应该关掉它。
date: 2026-09-23
tags: [sftp, ssh, 终端, 文件管理, 提效, 技巧]
videos: [electerm-sftp-path-sync-with-terminal, electerm-terminal-and-sftp-split-view, electerm-sftp-transfer-files-and-folders]
featureVideo: electerm-sftp-path-sync-with-terminal
bannerScript: banner.js
---

# SFTP 路径跟随终端：一个位置，两边同步看

你在终端里 `cd /var/www/app/logs` 去读日志，然后想在文件面板里拿同一个日志文件——于是把 `var`、`www`、`app`、`logs` 又点了一遍。反过来也一样：在 SFTP 里已经逛到了发布目录，回终端重启应用时又把那串路径敲了一遍。同一台机器的两个视图，路走了两遍。

electerm 的 **SFTP 路径跟随终端**就是省掉第二遍。打开之后，终端和 SFTP 面板共享同一个位置：shell 里 `cd`，文件面板跟过去；文件面板里点开文件夹，shell 跟过去。看一眼页眉上的动画——这就是该功能十秒钟的全部样子。

功能视频：[Electerm SFTP Path Sync with Terminal](/videos/electerm-sftp-path-sync-with-terminal/)。

## 它到底做了什么

开启跟随后，两个窗格永远指向同一个远端目录：

- **终端 → SFTP。** shell 工作目录一变，SFTP 面板就列出新文件夹。终端里 `cd /var/www/app`，地址栏自动改写成 `/var/www/app`，文件列表也换成新的内容。
- **SFTP → 终端。** 在 SFTP 面板里双击（或回车进入）一个文件夹，终端会自动执行对应的 `cd`，下一个提示符就停在那个目录里。

这是双向同步，不是单向镜像。无论你在哪一边导航，另一边都会跟上——所以它最典型的姿势就是分屏：一边终端、一边 SFTP，连的是同一台主机。视频：[Electerm Terminal and SFTP Split View](/videos/electerm-terminal-and-sftp-split-view/)。

```
终端：  $ cd /var/www/app          SFTP：  /home/zxd  →  /var/www/app
                                              app.js  logs/  public/

SFTP：  双击 logs/                终端：  $ cd /var/www/app/logs
                                              app.log  error.log  access.log
```

## 在哪里打开

有两个开关，作用一样，只是范围不同：

1. **单个会话——回形针图标。** 终端窗格上方的会话控制条里，回形针图标就是该标签页的跟随开关。高亮表示正在跟随。日常就点它。
2. **新建会话的默认值——终端设置。** 设置 → 终端 → `sftpPathFollowSsh`。打开一次，以后每个新会话默认就是跟随状态。

如果开关没反应，先看最 obvious 的：跟随只在**同一个连接**的终端窗格和它自己的 SFTP 窗格之间同步。本地 shell、网页标签、RDP 会话，或者连着另一台主机的 SFTP 窗格，都没有东西可同步。

## electerm 怎么知道 shell 在哪

这个功能难的不是搬文件面板，而是**在不添乱的前提下知道 shell 的目录**。electerm 用的是 **OSC 633 转义序列的 shell 集成**，和 VS Code 终端同一套标准：

- `OSC 633 ; A` —— 提示符开始
- `OSC 633 ; B` —— 命令输入开始
- `OSC 633 ; C` —— 命令执行开始
- `OSC 633 ; D` —— 命令结束
- `OSC 633 ; P ; Cwd=` —— 当前工作目录

开启跟随后，electerm 只监听 `Cwd=` 上报。shell 自己宣布“我现在在 `/var/www/app`”——不用轮询，不往历史里塞 `pwd`，也不解析你的提示符。

这意味着：

- **不注入命令。** 回滚缓冲和 shell 历史里不会多出任何东西。
- **不解析提示符。** 自定义提示符、多行提示符、右侧提示符、`PROMPT_COMMAND` 的各种花活都不会把它搞糊涂，因为它根本不读提示符。
- **怎么绕都准。** `cd`、`pushd`、符号链接、一口气跳三个目录的部署脚本——shell 上报的是最终位置，而不是怎么走过去的。

想看技术细节：[How Electerm Gets the Current Working Directory (pwd)](https://github.com/electerm/electerm/wiki/How-Electerm-Gets-the-Current-Working-Directory-(pwd)-in-Terminal-When-%22SFTP-Follow-Terminal-Path%22-Is-Enabled)，实现在 [`src/client/components/terminal/shell.js`](https://github.com/electerm/electerm/blob/master/src/client/components/terminal/shell.js)。

## 什么时候最爽

**追日志。** `cd` 进日志目录，文件列表已经在那儿了，双击直接编辑或 tail。不用再走一遍目录。

**发布后验证。** 在 SFTP 里点进发布目录确认产物到了，终端已经在那儿等着你 `systemctl restart app`。

**逛一台不熟的机器。** 在文件树里点来点去找方向，终端一路跟着，等找到有意思的目录，直接就能在里面跑命令。

**把 `ls` 戒掉。** 文件面板本身就是一个排好序、带大小、可点击的 `ls`。跟随一开，你不用再靠列目录来回忆里面有什么了。

## 限制和丑话

这是个**试验性**功能，有已知的毛病，项目本身也不藏着：[Warning About SFTP Follow SSH Path Function](https://github.com/electerm/electerm/wiki/Warning-about-sftp-follow-ssh-path-function)。落到实处就是：

- **Shell 只支持 bash、zsh、sh、ash 及同类。**能跑通 `sh` 风格集成脚本的才行。`fish` 和 Windows 终端系暂不支持——在那里跟随会悄无声息地什么都不做。
- **终端一旦不对劲，先关跟随。**集成脚本跑在你的 shell 里面；在魔改过的环境（重度定制的 `PROMPT_COMMAND`、`precmd` 钩子、极简 BusyBox、网络设备 CLI）里，它可能干扰终端的正常表现。图标的 tooltip 直接链到警告 wiki 就是为这个。关掉永远是安全状态。
- **SFTP 那边导航仍然要一次往返。**挪文件面板意味着用 SFTP 列一次远端目录。高延迟链路上，快速连 `cd` 几下会感觉面板慢半拍——那是网络，不是 bug。
- **`sudo -s` / `su` / 容器会改变答案。**上报的是 shell 自己认为的目录。进了容器 mount 命名空间或 `chroot`，上报的路径 SFTP 子系统可能根本解析不了，面板就会拒绝跟随。这是合理的——别硬来。

## 排查清单

1. 这个标签页的回形针图标高亮了吗？
2. SFTP 窗格是**同一个会话**的分屏吗，而不是另一台主机？
3. 远端 shell 是 bash/zsh/sh/ash 吗——不是 fish，也不是设备 CLI？
4. 连接时 shell 有没有报错？集成脚本装不上时会喊得很大声。
5. 还不行？把跟随开关关了再开，或重连这个标签页。如果开了跟随终端本身渲染就奇怪，那就先关着，跟进[警告 wiki](https://github.com/electerm/electerm/wiki/Warning-about-sftp-follow-ssh-path-function)的更新。

## 一句话备忘

- **开启** = 会话控制条里的回形针图标高亮；想默认开就去终端设置里打开 `sftpPathFollowSsh`。
- **终端 → SFTP**：随便 `cd`，文件面板列出新文件夹。
- **SFTP → 终端**：点开文件夹，shell 自动 `cd` 过去。
- **原理**：OSC 633 的 `Cwd=` 上报，不污染历史，不解析提示符。
- **不好用？**先看 shell 类型（fish 不行）、是不是同主机的分屏，不行就关——关掉永远安全。

下一篇：[终端与 SFTP 分屏](/videos/electerm-terminal-and-sftp-split-view/)——这个功能住的布局；目录对了、要搬东西了就看 [SFTP 传文件和文件夹](/videos/electerm-sftp-transfer-files-and-folders/)。
