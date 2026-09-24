---
title: 'electerm-web：用 Docker 把 electerm 装进自家服务器，用浏览器打开'
description: electerm-web 是可自托管的 electerm 网页版——完整的终端客户端（SSH、SFTP、FTP、RDP、VNC、SPICE、Telnet）跑在你自己的服务器/Docker 里。什么时候选它而不是桌面版和公有云版，一条命令如何部署，以及怎样加锁和自定义。
date: 2026-09-24
tags: [electerm-web, 自托管, docker, 浏览器, ssh, 自定义]
bannerScript: banner.js
---

# electerm-web：用 Docker 把 electerm 装进自家服务器，用浏览器打开

坐在自己的电脑前，桌面版 electerm 最好用。在别人的电脑上临时救火，[electerm 公有云版](/blogs/electerm-online/)打开浏览器就能用。但还有第三种情况：**你有自己的服务器，想要自己的数据、自己的登录、自己的规则**——中间不想经过任何第三方。

这就是 [**electerm-web**](https://github.com/electerm/electerm-web)：electerm 的网页应用形态，打包好让你自己跑起来——最省事的是用 Docker——然后在任何浏览器里打开，手机也行。

> **一句话：** electerm-web 是跑在*你自己*机器上的 electerm，通过 HTTP 提供服务，在浏览器标签页里使用。界面和 SSH/SFTP/RDP/VNC 能力一样，但服务器是你的。

功能演示：[Electerm Usage Demo](/videos/electerm-usage-demo/)。

## 桌面版 / 公有云 / 自托管网页版：怎么选？

三者同源同貌，但回答的是不同问题：

| | 桌面版 electerm | 公有云版（cloud） | electerm-web（自托管） |
|---|---|---|---|
| **跑在哪里** | 你的笔记本 / 台式机 | 维护者的 VPS | 你的 VPS、NAS、家庭实验室、树莓派 |
| **怎么打开** | 安装好的应用 | [cloud.electerm.org](https://cloud.electerm.org)，GitHub 登录 | `http://你的服务器:8082`，你自己的密码 |
| **数据在哪** | 在你的电脑上 | 在云服务器上 | 在你的磁盘 / Docker 卷里 |
| **客户端要安装吗** | 要 | 不要，有浏览器就行 | 不要，有浏览器就行 |
| **适合** | 主力日常、本地 shell、串口 | 借电脑、手机上临时修一下 | 自己可控的个人网关 |

如果只是想看看，先打开托管演示站：[demo.electerm.org](https://demo.electerm.org)。觉得对味、想要完全自己掌控，再往下看。

## 它到底跑了个什么

不是"阉割版网页终端"。它是做成网页应用的 electerm 客户端：同样的标签栏、会话控制条、底栏、主题和快捷键，协议也几乎全：

**SSH、SFTP、FTP、Telnet、RDP、VNC、SPICE**——SSH 那套（agent 转发、本地/远程端口转发、动态 SOCKS、X11 转发、隧道、跳板机）、快捷命令、触发器、批量/镜像输入、分屏、SFTP 拖拽传文件、工作区、AI 助手、gist/WebDAV/自建服务器同步、14 种界面语言，全都在。

和桌面版有两个实在区别：

- **本地终端和串口属于"主机侧"。** 在 VPS 上给浏览器用户一个"本地 shell"没有意义，一般会关掉（见下文）。串口也一样，除非 USB 转串口线就插在这台主机上。
- **浏览器打不开到 22 端口的裸 TCP。** SSH 会话要经过你的服务器中转——所以这台服务器最好是*你自己的*。

## 哪些事是桌面版做不到的

很多人是事到临头才发现：

1. **装不了客户端的电脑。** 没有管理员权限的办公本、Chromebook、图书馆的公用机、客户现场的跳板机——只要有现代浏览器，就有 electerm。
2. **没有桌面版的设备。** iPad、安卓平板、吃晚饭时部署挂了手边只有手机。网页 UI 是响应式的，手机布局足够用来重启服务救火。
3. **从外面连回内网。** 在家里/办公室放一台跑 electerm-web 的小主机，只把网页 UI 经 Tailscale / WireGuard / nginx 暴露出去，`192.168.x.x` 的书签在酒店里突然全能用了。
4. **一个网关，多端通用。** 书签、主题、快捷命令都住在服务器上。笔记本、平板、手机打开同一个 URL，配置完全一样，不用同步。
5. **共用机 / 机房大屏。** 车间电脑、NOC 大屏，只需要 SSH 到固定几台主机：部署一次、配好书签，发个 URL 就行，不用每台机子装一遍配一遍。

如果以上都和你无关，继续用桌面版就好。只要中了一条，自托管就值回票价。

## 自定义控制才是重点

公有云服务给不了你任何旋钮。自己的实例全是旋钮：

- **自己的认证。** 给整个 UI 加密码（`ENABLE_AUTH`），背后是你自己的 `SERVER_SECRET`。
- **自己的攻击面。** 挂公网的主机就关掉本地终端（`DISABLE_LOCAL_TERMINAL=1`）。
- **自己的数据目录。** `DB_PATH` 指向 Docker 卷——也可以直接指向桌面版 electerm 的数据目录，书签原地复用。
- **自己的网络。** `HOST`/`PORT` 想绑哪绑哪，前面架 nginx 做 TLS（仓库里有现成例子），限 IP、只走 VPN，按你的策略来。
- **自己的代码。** `config.js` 支持自定义 `Db` 实现和 `extensions.appExtend`——挂额外的 Express 路由，有的要登录，有的不要。再加[从 URL 参数初始化](https://github.com/electerm/electerm-web/wiki/Init-from-url-query-string)，连接可以预填好。

真正的卖点不是"不用安装的 electerm"，而是"跑在*你的规则*后面的 electerm"。

## 部署：Docker 一条命令

最快的是预构建镜像（[electerm-web-docker](https://github.com/electerm/electerm-web-docker)，Docker Hub 上叫 `zxdong262/electerm-web`）。容器内数据在 `/home/electerm/data`，应用监听 `5577`。

基础版、无登录（只给本机 / VPN 用）：

```sh
docker run --init \
  -v $(pwd)/electerm-web-data:/home/electerm/data \
  -e "DB_PATH=/home/electerm/data" \
  -e "HOST=0.0.0.0" \
  -p 8082:5577 \
  zxdong262/electerm-web
```

然后访问 `http://127.0.0.1:8082`。

带登录密码（挂公网必须用这个）：

```sh
docker run --init \
  -v $(pwd)/electerm-web-data:/home/electerm/data \
  -e "DB_PATH=/home/electerm/data" \
  -e "HOST=0.0.0.0" \
  -e "SERVER_SECRET=some_server_secret" \
  -e "SERVER_PASS=password_to_login" \
  -e "ENABLE_AUTH=1" \
  -p 8082:5577 \
  zxdong262/electerm-web
```

Linux 下建议加上 `--user "$(id -u):$(id -g)"`，否则数据文件会变成 root 属主。

习惯 Compose？`docker-compose.yml`：

```yaml
services:
  electerm-web:
    image: zxdong262/electerm-web:latest
    container_name: electerm-web
    volumes:
      - ./electerm-data:/home/electerm/data
    environment:
      - DB_PATH=/home/electerm/data
      - HOST=0.0.0.0
      # - SERVER_SECRET=some_server_secret
      # - SERVER_PASS=password_to_login
      # - ENABLE_AUTH=1
    ports:
      - "8082:5577"
    init: true
    restart: unless-stopped
```

```sh
UID=$(id -u) GID=$(id -g) docker-compose up -d
```

### 复用桌面版数据

把卷指向现有的桌面版数据目录而不是空目录，书签直接跟着过来：

```sh
# macOS
docker run --init --user "$(id -u):$(id -g)" \
  -v "/Users/<你>/Library/Application Support/electerm":/home/electerm/data \
  -e "DB_PATH=/home/electerm/data" -e "HOST=0.0.0.0" \
  -p 8082:5577 zxdong262/electerm-web

# Linux
docker run --init --user "$(id -u):$(id -g)" \
  -v "/home/<你>/.config/electerm":/home/electerm/data \
  -e "DB_PATH=/home/electerm/data" -e "HOST=0.0.0.0" \
  -p 8082:5577 zxdong262/electerm-web
```

或者干干净净来：Docker 里从空数据启动，然后桌面端**导出**、网页端到**数据同步**里**导入**。视频：[Electerm Data Import Export](/videos/electerm-data-import-export/)。

### 从源码部署（一行脚本）

Linux/Mac 主机（Node.js 24）：

```sh
curl -o- https://electerm.org/scripts/one-line-web.sh | bash
# 或：wget -qO- https://electerm.org/scripts/one-line-web.sh | bash
```

Windows（PowerShell）：

```powershell
Invoke-WebRequest -Uri "https://electerm.org/scripts/one-line-web.bat" -OutFile "one-line-web.bat"
cmd.exe /c ".\one-line-web.bat"
```

源码生产运行：`npm run build`，然后 `npm run prod`（或 `./build/bin/run-prod.sh`）——默认监听 `5577`。开发模式见 [electerm-web README](https://github.com/electerm/electerm-web)（`npm start` + `npm run dev` → `http://127.0.0.1:5580`）。

## 必须做的安全加固

electerm-web 定位是**个人使用**。把它当 SSH 网关看，暴露到公网就要按网关的标准对待：

1. **公网必须开认证。** `ENABLE_AUTH=1`，`SERVER_SECRET` 用长的随机串，`SERVER_PASS` 用强密码。没认证 = 知道 URL 的人就能用你的终端。
2. **服务器上关掉本地终端。** `DISABLE_LOCAL_TERMINAL=1`——浏览器用户不该碰主机的 shell。
3. **前面加 TLS。** 仓库自带 `examples/nginx.conf` 和 `examples/nginx-ssl.conf`——绑个域名，nginx 终止 HTTPS，反代到 `127.0.0.1:5577`。
4. **SSH 主机优先用密钥。** 生成密钥、公钥装到每台服务器、私钥配进 electerm-web。在任何网页应用里敲的密码，走得都比你想象的远。
5. **心里把它当单用户。** 只有一个登录（`SERVER_PASS`）、一个数据目录。它是你的个人网关，不是带审计日志的团队堡垒机。管一批机器就配合每台主机的系统用户和密钥来做。

这五条做到，一台几欧元的 VPS 就是个像样的个人跳板机。

## 再往深了定制

跑起来之后，全部控制就三个文件：

- **`.env`**（从 `.sample.env` 复制）：`HOST`、`PORT`、`SERVER`、`CDN`、`SERVER_SECRET`、`SERVER_USER`、`SERVER_PASS`、`TOKEN_EXPIRED_TIME`、`DB_PATH`，加上上面的开关。
- **`config.js`**（从 `config.sample.js` 复制）：接自己的 `Db` 类（Mongo 风格的 `find`/`findOne`/`insert`/`update`/`remove`），或 `extensions` 里 `appExtend(app, jwtMiddleWare, jwtErrorHandler)` 加路由——公开的和要登录的都能加。
- **`examples/nginx*.conf`**：域名 + TLS 的抄作业起点。

还有[从 URL 初始化的 wiki](https://github.com/electerm/electerm-web/wiki/Init-from-url-query-string)，可以拼出"点开就连到这台主机"的链接——状态页上放个"SSH 进这台机器"按钮正好用上。

## 短版

- **electerm-web**（[源码](https://github.com/electerm/electerm-web)、[docker](https://github.com/electerm/electerm-web-docker)）是自己托管、用浏览器打开的 electerm。
- **什么时候用：** 装不了客户端（锁死的办公本、Chromebook、平板、手机）、要从外面进内网、想要一个带自己认证/数据/网络规则的统一网关。
- **怎么装：** 一条 `docker run`，`DB_PATH` 或导出导入复用桌面版书签。
- **怎么保平安：** `ENABLE_AUTH`、`DISABLE_LOCAL_TERMINAL`、nginx + TLS、SSH 密钥、个人使用的心态。

相关：零部署方案看[Electerm Online](/blogs/electerm-online/)，桌面版看[安装 electerm](/blogs/install-electerm/)，连上之后看 [SSH in Electerm](/blogs/ssh-features-guide/)。
