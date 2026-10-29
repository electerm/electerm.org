---
title: Electerm SSH 隧道：本地、远端、动态（SOCKS）与反向 SOCKS，不用背参数
description: 玩透 electerm 的四种 SSH 隧道——本地（-L）、远端（-R）、动态 SOCKS（-D）与反向 SOCKS（-R 端口）：每种干什么、谁去发起最终连接、在书签编辑器里一步步点出来。
date: 2026-09-26
tags: [ssh, 隧道, 端口转发, socks, 安全, 效率]
videos: [electerm-local-to-remote-ssh-tunnel, electerm-remote-to-local-ssh-tunnel, electerm-dynamic-socks-proxy]
bannerScript: banner.js
---

# Electerm SSH 隧道：本地、远端、动态（SOCKS）与反向 SOCKS，不用背参数

`ssh -L`、`ssh -R`、`ssh -D` 是最有用的几个参数，也是最容易搞混的：到底哪边监听？哪边被连？流量往哪边走？再算上第四种写法 `ssh -R 1080`（在*服务器*上开 SOCKS 代理），脑子更容易打结。

electerm 把四种都做进了书签编辑器，就是 **L→R**、**R→L**、**-D socks**、**-R socks** 四行选项，还带实时提示把你填的 host 和端口画成流向图回显给你。看一眼上面的横幅——一个循环演示四种模式，这篇文章讲的就是这个循环。

基础文档：[How to Use SSH Tunnel](https://github.com/electerm/electerm/wiki/How-to-use-ssh-tunnel)。总览篇：[Electerm SSH 全解](/blogs/ssh-features-guide/cn/)。

## 30 秒心智模型

所有 SSH 隧道都寄生在一条现成的 SSH 连接里，只问两个问题：**谁监听**、**谁去发起最终那条连接**：

| electerm 里的模式 | CLI 对应 | 谁监听 | 谁发起最终连接 | 什么时候用 |
|---|---|---|---|---|
| **L→R** `forwardLocalToRemote` | `ssh -L [本地:]本地端口:远端:远端端口` | 你的电脑 | 服务器 | 远端数据库、管理后台、内网 API |
| **R→L** `forwardRemoteToLocal` | `ssh -R [远端:]远端端口:本地:本地端口` | 服务器 | 你的电脑 | 给同事看本地开发服务、收 webhook |
| **-D socks** `dynamicForward` | `ssh -D [本地:]本地端口` | 你的电脑（SOCKS5） | 服务器 | 借服务器的网浏览、一次连多个内网主机 |
| **-R socks** `remoteDynamicForward` | `ssh -R [远端:]远端端口` | 服务器（SOCKS5） | 你的电脑 | 让服务器上的人够*你*的网络——VPN、内网、只有你能连的服务 |

一句话版本：

- **L→R：**"在我电脑上开个地址，通向*服务器那边*的地址。"
- **R→L：**"在*服务器*上开个地址，通回*我电脑*的地址。"
- **-D socks：**"在我电脑上开个 SOCKS5 代理，发进去的连接都从*服务器*出去。"
- **-R socks：**"在*服务器*上开个 SOCKS5 代理，发进去的连接都从*我电脑*出去。"

> 隧道里的 `remoteHost` 是**站在服务器的角度**解析的。远端填 `127.0.0.1` 指的是"服务器自己"，不是你的笔记本。记住这一条，一大半困惑就没了。

> 两个 socks 模式互为镜像，唯一要记的是流量**从哪出去**：`-D` 从服务器出去，`-R socks` 从你这边出去。要是只记成"SOCKS 就是走服务器"，第二个准让你意外。

## 在 electerm 里哪里配隧道

打开任意 SSH 书签 → 拉到 **SSH 隧道**分区：

1. 选类型：**L→R**、**R→L**、**-D socks** 或 **-R socks**，默认 L→R。
2. 填**监听那一侧**的地址：L→R 和 R→L 两边都要填，两种 socks 模式只填监听的一边。默认值是本地 `127.0.0.1:12200`、远端 `127.0.0.1:12300`，改成你真实要用的端口。
3. 起个**名字**（比如 `pg-prod`、`webhook`、`socks-home`），列表多了才认得出来。
4. 点添加按钮。隧道进列表显示为 `→ 本地:… → 远端:…`（socks 模式显示 `socks5://…`）。`?` 悬浮提示会把你*实际填的值*画成流向图。
5. **保存书签并连接。** 隧道随会话自动建立，不用再点，也不用在后台养 `ssh -fN` 进程。

改配置点行里的铅笔，删除点减号。一个书签可以挂**多条隧道**——比如 Postgres + Redis + 管理后台，一条连接全带走。

三条行为值得知道：

- **每条隧道彼此独立。** 通过隧道的一条连接失败只关它自己，不会断掉整条隧道，其余照常。
- **会话结束全部收掉。** SSH 连接一关，它的所有隧道跟着拆干净——不会留下监听的端口要你手工清。
- **远端永远站在服务器的角度解析。** 这是最容易搞反的一条，下面按模式逐个讲清楚。

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

**形状：** electerm 在你的电脑上监听 `localHost:localPort` 说 SOCKS5。任何支持 SOCKS 的应用指过来，每个连接都经 SSH 转发到应用要去的目的地，由服务器去连。

```
浏览器 --SOCKS5--> 127.0.0.1:1080（你的电脑）
                      │  SSH 连接
                      ▼  由服务器发起
互联网 / VPC 里的任意主机
```

**配置：**

- 类型：**-D socks**——远端 host/端口会消失，因为没有单一目的地。
- 本地：`127.0.0.1`、`1080`
- 名字：`socks-prod`

保存、连接，然后：

- Firefox：设置 → 网络 → SOCKS5 填 `127.0.0.1:1080`（打开*远程 DNS*，域名也经服务器解析）。
- Chrome：`chrome --proxy-server="socks5://127.0.0.1:1080"`。
- curl：`curl --socks5-hostname 127.0.0.1:1080 https://ifconfig.me`——返回的是*服务器*的 IP，就证明流量从那出去。
- CLI 对应：`ssh -D 1080 user@server`。

目的地很多、提前不知道、或域名只能在 VPC 内解析时，一个 SOCKS 顶一堆 `-L`，不用一条条配。

视频：[动态 SOCKS 代理](/videos/electerm-dynamic-socks-proxy/)。

## 4. 反向 SOCKS（`-R 端口`）：代理开在服务器上，流量从你这边出去

**形状：***服务器*监听 `remoteHost:remotePort` 并对连上来的人说 SOCKS5。但当客户端要 `db.internal:5432` 时，这条连接是**你电脑**去发起的，不是服务器。代理坐在服务器那头，流量却从你这头出去。

```
服务器上的应用 --SOCKS5--> server:1080
                              │  SSH 连接（反向）
                              ▼  由你的电脑发起
                    你机器能访问的一切
```

前三种模式解决不了的情况就用它：**你这台机器有服务器没有的访问权。** 公司 VPN 装在笔记本上、只有你的办公网 IP 能进的内网、家里的数据库、需要授权的服务。服务器上的人只要挂一个 `socks5://127.0.0.1:1080`，就都能访问到——不用一个端口一条隧道，也不用在服务器上装 VPN 客户端。

**配置：**

- 类型：**-R socks**——本地字段会消失，因为你机器上不监听任何东西。
- 远端：`127.0.0.1`、`1080`（服务器上的绑定地址；要让别的机器也能用就填 `0.0.0.0` 并开 `GatewayPorts yes`）
- 名字：`vpn-for-server`

保存、连接，然后在服务器上：

```bash
curl --socks5-hostname 127.0.0.1:1080 https://ifconfig.me
# 出来的是你的 IP，不是服务器的——这就是全部意义
```

- CLI 对应：`ssh -R 1080 user@server`（端口后面不带 `host:hostport`）。
- 它不是 VPN：只走 SOCKS5 的 TCP，而且只在会话开着的时候有效。

**方向到底怎么走的**，想确认的话：服务器的 `sshd` 绑定端口，每来一个连接就开一条 `forwarded-tcpip` 通道回给 electerm；electerm 在这条通道上完成 SOCKS5 握手，然后用一条普通的本机 TCP 连接去连客户端要的目的地。目的地信息不会再回到服务器那边。

三个坑：

- 服务器上 **`AllowTcpForwarding no`** 会直接禁掉它，和 R→L 一样。
- **默认只听 loopback。** 要让服务器所在网段的其他机器用，得 `0.0.0.0` + `GatewayPorts yes`，但那样等于把你的内网通过代理开放给它们，想清楚再开。
- **只支持 SOCKS5。** 没有 SOCKS4；老客户端非要用，就直接用 `ssh -R`。

## 排错清单

1. **本地"端口被占用"**——`localPort` 被别的程序（或另一条隧道）占了。`lsof -i :5433` 查一下换个空闲端口，1024 以下要 root，尽量别用。
2. **隧道通了但 connection refused**——隧道没问题，是站在*服务器*角度看 `remoteHost:remotePort` 上根本没服务。先 SSH 上去在服务器里 `curl remoteHost:remotePort` 验证。`-R socks` 反过来：要在*你的机器*上验证目的地通不通。
3. **`remoteHost` 视角搞反了**——`127.0.0.1` 指*服务器自己*。目标在你笔记本上说明方向选反了（该用 R→L 而不是 L→R）。
4. **R→L / -R socks 只能在服务器本机连到**——没开 `GatewayPorts yes` + 远端 `0.0.0.0` 就是这样，这是服务端 `sshd_config` 的事，不是 electerm 的 bug。
5. **会话断了隧道跟着没**——设计如此：隧道绑在 SSH 连接生命周期上（`conn.on('close')` 即回收）。重连即回来；真不能断的活儿放 tmux 里再加隧道看门。
6. **服务器禁了转发**——服务端 `AllowTcpForwarding no`（或 `DisableForwarding`）会禁掉全部四种模式，得找管理员放开。
7. **SOCKS 配了没走代理**——很多应用要单独设代理还要开远程 DNS，先拿 `curl --socks5-hostname` 测一把，分清"隧道坏了"还是"应用没用隧道"。
8. **`-D` 和 `-R socks` 搞混**——看流量从哪出去：`-D` 监听在笔记本、从服务器出去；`-R socks` 监听在服务器、从笔记本出去。挂代理 `curl https://ifconfig.me` 一把就知道自己搭的是哪个。

## 速查

- 要够服务器附近的东西 → **L→R**（`ssh -L 本地端口:远端:远端端口`），本地端口是你的，远端地址是服务器的视角。
- 要让服务器够你的电脑 → **R→L**（`ssh -R 远端端口:本地:本地端口`），非 loopback 暴露要 `GatewayPorts`。
- 要像服务器一样够*很多*东西 → **-D socks**（`ssh -D 本地端口`），应用挂 `socks5://127.0.0.1:本地端口`。
- 要让服务器上的人够*你*的网络 → **-R socks**（`ssh -R 远端端口`），他们的应用挂服务器上的 `socks5://127.0.0.1:远端端口`。
- electerm 里：书签 → 隧道分区 → 类型 + host + 端口 + 名字 → 添加 → 保存 → 连接。铅笔改、减号删，一个书签挂多条没问题。
- 隧道随会话生随会话死——一条连接的事，不留满地 `ssh -fN` 僵尸进程。

下一篇：[Electerm SSH 全解](/blogs/ssh-features-guide/cn/)看认证、跳板机和 NetBird 怎么跟隧道组队——长隧道总被闲置杀掉就看[会话保活](/blogs/session-keepalive/cn/)。
