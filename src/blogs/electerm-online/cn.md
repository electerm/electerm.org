---
title: 'Electerm Online：把终端装进浏览器标签页'
description: electerm online（cloud.electerm.org）就是你熟悉的那个 electerm，只不过跑在浏览器里——SSH、SFTP、FTP、RDP、VNC、SPICE、Telnet 会话，GitHub 登录，无需安装，书签和主题在笔记本和手机上都在。
date: 2026-09-20
tags: [electerm online, 云端, 浏览器, ssh, sftp, rdp, vnc, 手机]
videos: [electerm-usage-demo, electerm-sync-data-to-cloud-service, electerm-workspace, electerm-data-import-export]
bannerScript: banner.js
---

# Electerm Online：把终端装进浏览器标签页

你手边这台机器不是你的。一台没有管理员权限的办公笔记本、一台别人的台式机、一台平板，或者一部手机。而你需要马上够到另一端的那台服务器——可是什么也装不了。

[**cloud.electerm.org**](https://cloud.electerm.org) 就是为这个场景准备的。它就是 electerm：你本来要下载安装的那个应用，现在作为一个 web 服务跑在浏览器标签页里。用 GitHub 登录，连接就在那儿。

功能视频：[Electerm 使用演示](/videos/electerm-usage-demo/)。

## 它到底是什么

不是"网页版精简终端"。它就是 electerm 客户端本身，通过 HTTP 提供服务：同一个标签栏、同一个会话控制栏、同一个页脚、同一套主题、同一组你已经形成肌肉记忆的快捷键。

|  |  |
|---|---|
| **地址** | [cloud.electerm.org](https://cloud.electerm.org) |
| **登录方式** | GitHub OAuth，不用注册，不用再编一个密码 |
| **费用** | 免费 |
| **运行环境** | 任何现代桌面或手机浏览器 |
| **会话类型** | SSH、SFTP、FTP、RDP、VNC、SPICE、Telnet |
| **不包含** | 本地终端、串口、打开网页 |

先把话说清楚：它就是桌面客户端减掉那三件"只有坐在自己机器前才成立"的功能，其余全部一起搬了过来。

## 怎么进去

1. 打开 [cloud.electerm.org](https://cloud.electerm.org)，点 **Sign in with GitHub**，授权之后直接进主界面。没有邮件验证，没有注册流程。
2. 如果你已经在用桌面版 electerm，不要手工重建书签——在桌面版里**导出**数据，再在在线版里**导入**。书签、快速命令、主题等等，一个文件全带过来。视频：[Electerm 数据导入导出](/videos/electerm-data-import-export/)。
3. 加连接的方式和桌面版一样；如果你配好了大模型 API，也可以直接说一句话让 AI 助手替你建书签。

上手过程就这些。之后你面对的界面，就是你本来就熟悉的那个。

## 一项一项说清楚

**桌面版支持的协议，它都支持。** SSH、SFTP、FTP、RDP、VNC、SPICE、Telnet。用 RDP 连 Windows 机器，用 VNC 或 SPICE 连虚拟化控制台，用 Telnet 连交换机，用 FTP 连老主机——全都在同一个标签栏里，和你的 SSH 会话并排。

**完整的 SSH 能力，不是阉割版。** Agent 转发、本地与远程端口转发、动态 SOCKS 代理、X11 转发、SSH 隧道，以及通过跳板机的连接跳跃。视频：[Electerm 连接跳转](/videos/electerm-connection-hop/)。

**AI 助手。** 接上任何兼容 OpenAI 接口的大模型，它就能生成命令、解释你刚选中的那段命令、写脚本、用自然语言创建书签，还能在 Agent 模式下直接执行任务。不想自己配 key 的话，[ai.electerm.org](https://ai.electerm.org) 为 electerm 用户提供免费入口。

**数据同步，目标随你选。** 书签、主题、快速命令可以同步到 GitHub 私密 Gist、Gitee 私密 Gist、electerm 同步云、自建服务器或 WebDAV——和桌面版提供的是同一组选项。视频：[Electerm 同步数据到云服务](/videos/electerm-sync-data-to-cloud-service/)。

**那些让 electerm 成为 electerm 的工作流功能。** 快速命令、一次驱动多个终端的[镜像输入与批量输入](/blogs/batch-and-mirror-input/)、分屏与 2x2 布局、两个 SFTP 会话之间拖拽传文件，以及把日志里任何 epoch 数字变成日期的[时间戳提示](/blogs/timestamp-tooltip/)。

**主题，包括自定义 CSS。** 内置的 iTerm 主题全集，再往上你还可以用自己的主题和自己的 CSS。

**双击直接编辑远程小文件。** 和桌面版同一个手势：在 SFTP 面板里双击一个文件，就地编辑。

**十四种界面语言。** 整个界面都做了本地化，不只是菜单。

**工作区。** 把布局*和*它包含的连接一起存下来，一键载入整套工作环境。视频：[Electerm 工作区](/videos/electerm-workspace/)。

## 手机上是真的能用

这是最让人意外的一点。在线版同时为触屏和鼠标做了适配，所以手机浏览器是一等公民，不是退路。布局会自动调整，控制栏收进菜单，批量输入的入口缩成一个紧凑按钮。

你不会想用它写一整天 YAML。但当晚饭吃到一半部署炸了、而笔记本在另一个房间时，它正是你要的东西：打开标签页、连上、重启服务、关掉。

## 三种形态，怎么选

现在跑 electerm 有三种方式，它们并不互相竞争：

| 你的情况 | 用哪个 |
|---|---|
| 自己的机器，要完整功能，可能离线 | **桌面版 electerm**——本地终端、串口，全都有 |
| 装不了软件的机器，或者手机 | **electerm online**——零安装，只要有浏览器 |
| 自己的服务器、自己的数据、自托管 | **electerm-web**——自己跑，也支持 Docker |

[electerm-web](https://github.com/electerm/electerm-web) 是源码；electerm online 是建立在同一套思路之上、替所有人跑起来的服务。如果"中间不能有第三方"对你是硬要求，那就自托管 electerm-web——这是个完全正当的选择，项目本身也支持。

## 安全性，直说

在把一个生产库密码填进去之前，请先读完这一段。

- **凭据存放在服务器上，SSH 连接也经由服务器代理。** 浏览器客户端只能这么做——浏览器无法直接对 22 端口开原始 TCP 连接。你的流量会途经维护者的那台 VPS。
- **优先使用密钥认证。** 生成一对密钥，公钥放到服务器上，私钥交给在线客户端。这在任何地方都是更好的做法，在这里更重要。
- **不要把最敏感的凭据放进去。** 如果某台主机需要的是一个你绝不会敲进别人笔记本的密码，那就用桌面版，或者自托管。
- **这是一位开发者、一台小 VPS、没有任何保证。** 官网首页就是这么写的，与其让你以后自己发现，不如我再说一遍。

这些都不是"别用"的理由。它们是"清楚自己在做什么再用"的理由：用密钥认证，只用在浏览器客户端确实合适的主机上。

## 做个好邻居

这个服务是免费的，跑在一台小 VPS 上。它不适合让你常驻一个 `htop`，也不适合把几个 G 的文件传输压到别人的带宽上。用它擅长的事——手边没有别的客户端时够到一台主机；坐在自己桌前时，还是用桌面版。

## 一句话总结

- **cloud.electerm.org** 就是浏览器里的 electerm：同样的界面、同样的功能、零安装。
- **用 GitHub 登录**，导入桌面版数据，书签还在你放下的地方。
- **SSH、SFTP、FTP、RDP、VNC、SPICE、Telnet**，而且在手机上确实好用。
- **它不是**桌面版：没有本地 shell，没有串口。这些还是用桌面版。
- **把取舍讲清楚**：凭据在服务端，SSH 走代理。请用密钥，别放命根子凭据，或者干脆自托管 electerm-web。

在旁边的标签页里打开 [cloud.electerm.org](https://cloud.electerm.org) 试试。如果还没装桌面版，可以从[安装 electerm](/blogs/install-electerm/)或 [electerm 介绍](/blogs/electerm-introduction/)看起。
