---
title: Electerm SSH 隧道：本地、远端与动态（SOCKS）转发，不用背参数
description: 玩透 electerm 的三种 SSH 隧道——本地（-L）、远端（-R）与动态 SOCKS（-D）：每种是干什么的、什么时候用、在书签编辑器里一步步点出来。
date: 2026-09-26
tags: [ssh, 隧道, 端口转发, socks, 安全, 效率]
videos: [electerm-local-to-remote-ssh-tunnel, electerm-remote-to-local-ssh-tunnel, electerm-dynamic-socks-proxy]
bannerScript: banner.js
---

# Electerm SSH 隧道：本地、远端与动态（SOCKS）转发，不用背参数

`ssh -L`、`ssh -R`、`ssh -D` 是最有用的几个参数，也是最容易搞混的：到底哪边监听？哪边被连？流量往哪边走？

electerm 把三者做进了书签编辑器，就是 **L→R**、**R→L** 和 **动态（SOCKS 代理）** 三行选项，还带实时提示把你填的 host 和端口画成流向图回显给你。看一眼上面的横幅——一个循环演示三种模式，这篇文章讲的就是这个循环。

基础文档：[How to Use SSH Tunnel](https://github.com/electerm/electerm/wiki/How-to-use-ssh-tunnel)。总览篇：[Electerm SSH 全解](/blogs/ssh-features-guide/cn/)。

## 30 秒心智模型

所有 SSH 隧道都寄生在一条现成的 SSH 连接里，只问两个问题：**谁监听**、**连到谁**：

| electerm 里的模式 | CLI 对应 | 谁监听 | 你得到 | 什么时候用 |
|---|---|---|---|---|
| **L→R** `forwardLocalToRemote` | `ssh -L [本地:]本地端口:远端:远端端口` | 你的电脑 | 服务器那边/附近的东西 | 远端数据库、管理后台、内网 API |
| **R→L** `forwardRemoteToLocal` | `ssh -R [远端:]远端端口:本地:本地端口` | 服务器 | 你电脑上的东西 | 给同事看本地开发服务、收 webhook |
| **动态** `dynamicForward`（SOCKS 代理） | `ssh -D [本地:]本地端口` | 你的电脑（SOCKS5） | *任意*主机，都经服务器出去 | 借服务器的网浏览、一次连多个内网主机 |

一句话版本：

- **L→R：**"在我电脑上开个地址，通向*服务器那边*的地址。"
- **R→L：**"在*服务器*上开个地址，通回*我电脑*的地址。"
- **动态：**"在我电脑上开个 SOCKS5 代理，发进去的连接都从*服务器*出去。"

> 隧道里的 `remoteHost` 是**站在服务器的角度**解析的。远端填 `127.0.0.1` 指的是"服务器自己"，不是你的笔记本。记住这一条，一大半困惑就没了。

## 在 electerm 里哪里配隧道

打开任意 SSH 书签 → 拉到 **SSH 隧道**分区（`src/client/components/bookmark-form/common/ssh-tunnels.jsx` + `ssh-tunnel-form.jsx`）：

1. 选类型：**L→R**、**R→L** 或 **dynamicForward（socks proxy）**，默认 L→R。
2. 填**本地** host + 端口，以及（动态模式除外）**远端** host + 端口。默认值是本地 `127.0.0.1:12200`、远端 `127.0.0.1:12300`，改成你真实要用的端口。
3. 起个**名字**（比如 `pg-prod`、`webhook`、`socks-home`），列表多了才认得出来。
4. 点添加按钮。隧道进列表显示为 `→ 本地:… → 远端:…`（动态显示 `socks5://…`）。`?` 悬浮提示会把你*实际填的值*画成流向图（`renderSshTunnelFlow`）。
5. **保存书签并连接。** 隧道随会话自动建立，不用再点，也不用在后台养 `ssh -fN` 进程。

改配置点行里的铅笔，删除点减号。一个书签可以挂**多条隧道**（`sshTunnels` 是数组）——比如 Postgres + Redis + 管理后台，一条连接全带走。

底层实现（`src/app/server/ssh-tunnel.js`）：

- L→R 在本机起 TCP 服务（`net.createServer`），每个进来的连接经 SSH（`conn.forwardOut`）打出去。
- R→L 让服务器监听（`conn.forwardIn`），进来的连接再管道回本机（`net.connect`）。
- 动态在本机起 SOCKS5 服务（`socksv5-server`），每个 SOCKS 请求经 SSH（`conn.forwardOut`）转发。
- 每个连接相互隔离——一个 socket 挂了只关自己，不断整条隧道；SSH 断了隧道跟着收。

进阶：quick-connect 连接串也能带隧道，例如 `ssh://user@host:22?opts={"sshTunnels":[{"sshTunnel":"forwardLocalToRemote","sshTunnelLocalPort":8080,"sshTunnelRemoteHost":"localhost","sshTunnelRemotePort":80}]}`。

## 1. 本地 → 远端（`-L`）：伸进服务器的世界

**形状：** electerm 在你的电脑上监听 `localHost:localPort`，发到这里的东西经 SSH 连接送到站在服务器角度看的 `remoteHost:remotePort`。

```
浏览器 → 127.0.0.1:5000（你的电脑）
            │  SSH 连接
            ▼
服务器 → remoteHost:6000（服务器的网络）
```

**配置示例：只监听 localhost 的远端 Postgres：**

- 类型：**L→R**
- 本地：`127.0.0.1`、`5433`（本地用 5433，别跟自己机器上的 5432 打架）
- 远端：`127.0.0.1`、`5432`
- 名字：`pg-prod`

保存、连接，然后客户端连 `127.0.0.1:5433`：

```bash
psql -h 127.0.0.1 -p 5433 -U app prod
```

同形状的更多例子：

- 远端 3000 端口的管理后台 → 本地 `127.0.0.1:5000`，浏览器开 `http://127.0.0.1:5000`。
- 只有服务器能访问的内网服务，比如远端 `10.0.0.8:8080` → 本地 `127.0.0.1:8080`。记住远端地址是*服务器*去解析的，VPC 内网地址这里直接能用。
- CLI 对应：`ssh -L 5433:127.0.0.1:5432 user@server`。

视频：[本地到远端的 SSH 隧道](/videos/electerm-local-to-remote-ssh-tunnel/)。

## 2. 远端 → 本地（`-R`）：让服务器连回你

**形状：***服务器*监听 `remoteHost:remotePort`，连到那里的东西经 SSH 连接送回你电脑的 `localHost:localPort`。

```
同事 / webhook → server:6000
                    │  SSH 连接（反向）
                    ▼
你的电脑 ← 127.0.0.1:5000
```

**配置示例：把本地开发服务演示给能连上服务器的人看：**

- 类型：**R→L**
- 远端：`127.0.0.1`、`6000`
- 本地：`127.0.0.1`、`5000`（`npm run dev` 监听的地方）
- 名字：`demo-friday`

保存、连接，服务器上打开 `http://127.0.0.1:6000` 的人拿到的就是*你本地* `:5000` 的内容。

其他用法：

- 经服务器公网地址在笔记本上收第三方 webhook。
- 不部署就把本地 API 暴露给远端测试机。
- CLI 对应：`ssh -R 6000:127.0.0.1:5000 user@server`。

`-R` 专属两个坑：

- 想让*别的机器*也能连远端端口，远端 host 得填 `0.0.0.0`，**且**服务器 `sshd_config` 要开 `GatewayPorts yes`，否则只监听 loopback——默认这样最安全。
- 远端端口在服务器上被占了就 bind 失败，换个端口。

视频：[远端到本地的 SSH 隧道](/videos/electerm-remote-to-local-ssh-tunnel/)。

## 3. 动态（`-D`）：从服务器出去的 SOCKS5 代理

**形状：** electerm 在你的电脑上监听 `localHost:localPort` 说 SOCKS5。任何支持 SOCKS 的应用指过来，每个连接都经 SSH 转发到应用要去的目的地，由服务器解析。

```
浏览器 --SOCKS5--> 127.0.0.1:1080（你的电脑）
                      │  SSH 连接
                      ▼  从服务器出去
互联网 / VPC 里的任意主机
```

**配置：**

- 类型：**dynamicForward（socks proxy）**——远端 host/端口会消失，因为没有单一目的地。
- 本地：`127.0.0.1`、`1080`
- 名字：`socks-prod`

保存、连接，然后：

- Firefox：设置 → 网络 → SOCKS5 填 `127.0.0.1:1080`（打开*远程 DNS*，域名也经服务器解析）。
- Chrome：`chrome --proxy-server="socks5://127.0.0.1:1080"`。
- curl：`curl --socks5 127.0.0.1:1080 https://ifconfig.me`——返回的是*服务器*的 IP，就证明流量从那出去。
- CLI 对应：`ssh -D 1080 user@server`。

目的地很多、提前不知道、或域名只能在 VPC 内解析时，一个 SOCKS 顶一堆 `-L`，不用一条条配。

视频：[动态 SOCKS 代理](/videos/electerm-dynamic-socks-proxy/)。

## 排错清单

1. **本地"端口被占用"**——`localPort` 被别的程序（或另一条隧道）占了。`lsof -i :5433` 查一下换个空闲端口，1024 以下要 root，尽量别用。
2. **隧道通了但 connection refused**——隧道没问题，是站在*服务器*角度看 `remoteHost:remotePort` 上根本没服务。先 SSH 上去在服务器里 `curl remoteHost:remotePort` 验证。
3. **`remoteHost` 视角搞反了**——`127.0.0.1` 指*服务器自己*。目标在你笔记本上说明方向选反了（该用 R→L 而不是 L→R）。
4. **R→L 只能在服务器本机连到**——没开 `GatewayPorts yes` + 远端 `0.0.0.0` 就是这样，这是服务端 `sshd_config` 的事，不是 electerm 的 bug。
5. **会话断了隧道跟着没**——设计如此：隧道绑在 SSH 连接生命周期上（`conn.on('close')` 即回收）。重连即回来；真不能断的活儿放 tmux 里再加隧道看门。
6. **服务器禁了转发**——服务端 `AllowTcpForwarding no`（或 `DisableForwarding`）会禁掉全部三种模式，得找管理员放开。
7. **SOCKS 配了没走代理**——很多应用要单独设代理还要开远程 DNS，先拿 `curl --socks5` 测一把，分清"隧道坏了"还是"应用没用隧道"。

## 速查

- 要够服务器附近的东西 → **L→R**（`ssh -L 本地端口:远端:远端端口`），本地端口是你的，远端地址是服务器的视角。
- 要让服务器够你的电脑 → **R→L**（`ssh -R 远端端口:本地:本地端口`），非 loopback 暴露要 `GatewayPorts`。
- 要像服务器一样够*很多*东西 → **动态 SOCKS**（`ssh -D 本地端口`），应用挂 `socks5://127.0.0.1:本地端口`。
- electerm 里：书签 → 隧道分区 → 类型 + host + 端口 + 名字 → 添加 → 保存 → 连接。铅笔改、减号删，一个书签挂多条没问题。
- 隧道随会话生随会话死——一条连接的事，不留满地 `ssh -fN` 僵尸进程。

下一篇：[Electerm SSH 全解](/blogs/ssh-features-guide/cn/)看认证、跳板机和 NetBird 怎么跟隧道组队——长隧道总被闲置杀掉就看[会话保活](/blogs/session-keepalive/cn/)。
