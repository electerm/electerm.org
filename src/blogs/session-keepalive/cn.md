---
title: '会话保活：点亮心跳图标，让会话真的不掉线'
description: electerm 会话工具条里的心跳图标会在你空闲时每隔几秒发一个回车——重置 TMOUT 和应用层空闲清理，这是 TCP 保活够不到的地方。在哪里开、底层怎么工作、什么时候该关。
date: 2026-09-24
tags: [保活, ssh, tmout, 终端, 会话, 提效, 技巧]
bannerScript: banner.js
---

# 会话保活：点亮心跳图标，让会话真的不掉线

你离开 SSH 会话五分钟去看文档，回来一看：`timed out waiting for input: auto-logout`。或者堡垒机悄无声息把你踢了。或者中间的防火墙觉得空闲的 TCP 流就是死的流。SSH 层保活明明一直开着——一点用都没有。

说的就是这种掉线。electerm 还有第二层更猛的保活：**会话工具条里的心跳图标**。点一下，它会在你**空闲时每隔几秒发一个回车（`\n`）**——唤醒 shell、重置空闲计时、产生真正的应用层活动。看一眼页眉动画：空闲计时往上爬，心跳一跳，回车飞过去，计时清零。整个功能就是这个循环。

## 图标在哪

看**会话控制条**——终端窗格上方那条细 bar（`src/client/components/session/session-control.jsx`）。

从左到右依次是 `SSH / SFTP` 窗格标签、回形针（SFTP 路径跟随）、分屏切换，然后就是**心跳**：一个心形轮廓中间穿过一条心电图折线（`src/client/components/icons/heartbeat.jsx` 里的 `HeartbeatIcon`——心形 path 加一段 `160,512 310,512 370,310 450,714 ...` 的折线）。

- **灰色 = 关。**默认状态，什么都不发。
- **高亮（橙红，`.sess-icon.active` → `--warn`）= 这个标签页开着。**再点一下关掉。

它是**按标签页、只放内存**的开关（`src/client/components/session/session.jsx` 里的 `keepaliveEnabled`，经 `src/client/components/terminal/mixins/term-attach.js` 的 `term.toggleKeepalive()` 切换）。没有全局开关——会发按键的功能，本来就该每个会话单独 opt-in。

> 只有终端类会话（SSH 或本地 shell）才有这个图标。纯 SFTP、网页标签、RDP 会话没有东西可发回车，图标会自动隐藏。

## 它到底发了什么

不是 TCP 包，不是 SSH 的 `keepalive@openssh.com` 消息，而是一个真正的换行，进 PTY 的：

1. 每 **3 秒**检查一次：*终端输出和键盘输入是不是都已经静默 3 秒了？*（`src/client/components/terminal/attach-addon-custom.js` 里 `_keepaliveInterval = 3000`，`_checkKeepalive`）。
2. 是——且 WebSocket 还是 `OPEN`——就沿着现有连接发 `{ action: 'keepalive' }`。
3. 服务端往 PTY 写 `\n\r\x1b[K`（`src/app/server/session-server.js`）。
4. bash 的 `read()` 被唤醒，`TMOUT` 计时清零，bash 重画一行提示符。客户端顺手压住约 500 ms 的回显（`startOutputSuppression(500, null, true)`），所以你只看到提示符轻轻重画，不会刷屏。

```
空闲 3s ──► 客户端: { action: 'keepalive' } ──► 服务端: term.write('\n\r\x1b[K')
                                                          │
bash read() 被唤醒 ◄── TTY 凑够一行才投递 ──◄── PTY ──────┘
TMOUT 清零，提示符重画，回显被压住
```

两个值得知道的细节：

- **为什么是 `\n` 而不是 NUL？**经典模式下 TTY 行规程要凑够一个换行才把数据交给 `read()`——`\x00` 会永远卡在缓冲里，根本叫不醒 shell。`session-server.js` 的注释专门写了这一点。
- **你干活时它很安静。**敲键盘、有输出都会重置两个空闲时钟，所以它从不在你输入到一半时插嘴。只有你真正走开了，它才开口。

## 为什么它比 TCP / SSH 保活硬

electerm 本来就有常规传输层保活：设置 → SSH 里的 `keepaliveInterval`（默认 10 秒）和 `keepaliveCountMax`（默认 10），经 `term-socket.js` 传到 `session-ssh.js`。相当于 OpenSSH 的 `ServerAliveInterval`——保的是**线**。

心跳保的是**shell**。层不一样，杀你的东西也不一样：

| | SSH / TCP 保活 | 会话心跳（本文） |
|---|---|---|
| **发什么** | SSH 协议包 / TCP ACK | 真正进 PTY 的 `\n` |
| **默认节奏** | 每 10 秒（`keepaliveInterval`） | 真正空闲每 3 秒 |
| **能挡 NAT / 防火墙空闲回收吗** | 一般能 | 能——而且是真流量 |
| **能挡 shell `TMOUT` 自动登出吗** | **不能**——shell 根本看不到它 | **能**——`read()` 被唤醒，计时清零 |
| **能挡堡垒机 / 网关 / WAF 的应用层空闲清理吗** | 经常**不能**——人家看的是按键，不是包 | 实践中**能**——看起来就是有人在动 |
| **肉眼可见的副作用** | 无 | 提示符重画（回显被压住） |
| **作用范围** | 按书签 / 全局设置 | 按标签页开关，默认关 |

一句话心智模型：**TCP 保活告诉网络“这个 socket 还在”。心跳告诉 shell“用户刚在空行上敲了个回车”。**那些杀“空闲”会话的中间件和 shell，看的都是后一种。

所以当传输层保活“不好使”——还是 `TMOUT` 踢你，网关还是 5 分钟赶人——多半不是它坏了，而是杀你的东西本来就不归它管。把那颗心点亮就行。

## 什么时候最爽

- **`TMOUT` / `autologout` 的机器。**合规加固过的机器 `TMOUT=300`，故障处理到一半踢你下线。心跳是唯一不用 root 改服务端就能搞定的客户端办法。
- **有空闲策略的堡垒机、跳板机。**很多网关按 *应用层* 数据算空闲，加密的 SSH 保活包根本不算数；回车算数。
- **酒店 Wi-Fi / 爱回收的 NAT。**回收空闲流量的设备，一个 3 秒一次的换行是它无法忽视的流量。
- **长时间守着。**`tail -f`、tmux 里跑迁移、等 CI——有输出时心跳自动闭嘴；输出卡住时它开始看门。和你担心的方向正好反过来。
- **串口控制台。**本地 / 串口终端类型里 SSH 保活根本不存在，图标照样能用。

## 限制和丑话

这个图标发的是**真按键到真机器**，所以默认关、按标签页生效，项目是故意的。请尊重它：

- **它按的是回车。**在空提示符上无害（重画一行）。其他地方先过脑子：**进 `vim`、`nano`、`emacs`、TUI 安装器、`read -p` / 密码提示之前先关掉。**插入模式里一个换行就是多一行；在 `Are you sure? (y/N)` 面前就是一次默认确认——空默认一般安全，但别赌。
- **会有提示符的闪动。**每次空闲几秒，提示符重画一次。500 ms 的回显压制能盖住大部分，但在慢链路上你可能瞥见一眼。那一闪就是保活在干活。
- **重连后要重开。**和所有按标签页的状态一样，关掉标签页开关就没了。重连 → 再点一次小心心。
- **它不是 tmux/screen 的替代品。**网络真断了，什么保活都救不了。重要的活放 tmux 里跑，*外面*再开着心跳守住这层会话，两层都要。
- **自动化会忽略它。**触发器匹配和 shell 集成逻辑会显式跳过保活回显（`attach-addon-custom.js`），所以心跳自己的重画不会误触你的触发器。

## 排查清单

1. 这个标签页的心跳图标**高亮了吗**？（灰色 = 没开。）
2. 标签页是**终端**（SSH / 本地）吗，而不是纯 SFTP 或 RDP？
3. 死法是 `TMOUT`（写着 `auto-logout`）还是网络（先卡住再 `broken pipe`）？前者心跳稳吃；后者要两层保活一起上，再加 tmux。
4. 敲字时看到提示符重画？正常不应该——它只在输入和输出都静默 3 秒后才动。如果干活时也动，可能是空闲时钟被卡住了，值得报个 issue。
5. 在编辑器里光标乱跳？那就是心跳回车落错了地方——回到 shell 提示符之前，先把心关掉。

## 一句话备忘

- **开** = 会话控制条里的心跳图标高亮（`session-control.jsx` → `HeartbeatIcon`，`.keepalive-icon.active`）。
- **干什么** = 真正空闲每 3 秒往 PTY 发 `\n`（`attach-addon-custom.js` → `session-server.js`），回显压 500 ms。
- **为啥不用 SSH 保活** = 传输层保活够不到 `TMOUT` 和应用层空闲清理；换行够得到。
- **何时关** = 编辑器、TUI、密码提示、危险确认。回到提示符再开。
- **范围** = 只这个标签页，只放内存，默认关。

下一篇：[SSH 功能](/blogs/ssh-features-guide/)——和本文互补的传输层保活设置；想让终端*自动回*提示而不是只保活，看[终端触发器](/blogs/terminal-triggers/)。
