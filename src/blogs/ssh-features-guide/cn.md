---
title: Electerm SSH 全解：认证、跳板机、NetBird 与隧道
description: 玩透 electerm 的 SSH——密码与公钥认证、ssh-agent、OpenSSH 证书、MFA 二次验证、连接跳转、NetBird 与 proxy-command，以及本地/远端/动态 SSH 隧道。
date: 2026-06-20
tags: [ssh, 认证, 隧道, netbird, 跳板机, 安全]
videos: [electerm-connection-hop, electerm-connection-jump, electerm-local-to-remote-ssh-tunnel, electerm-remote-to-local-ssh-tunnel, electerm-dynamic-socks-proxy, electerm-view-ssh-server-info, electerm-batch-operations]
---

# Electerm SSH 全解：认证、跳板机、NetBird 与隧道

SSH 是 electerm 里用得最多的协议，书签编辑器几乎把 OpenSSH 全套功能搬进了图形界面。本文把每个选项映射到对应 wiki 文档与演示视频。

基础文档：[SSH Agent](https://github.com/electerm/electerm/wiki/ssh-agent)、[SSH Certificate Authentication Guide](https://github.com/electerm/electerm/wiki/SSH-Certificate-Authentication-Guide-for-electerm)、[How to Use SSH Tunnel](https://github.com/electerm/electerm/wiki/How-to-use-ssh-tunnel)、[Connection Hopping Behavior Change since v1.50.65](https://github.com/electerm/electerm/wiki/Connection-Hopping-Behavior-Change-in-electerm-since-v1.50.65)、[SSH Proxy Command and NetBird Support](https://github.com/electerm/electerm/wiki/SSH-Proxy-Command-and-NetBird-Support)、[Keep SSH Session Alive](https://github.com/electerm/electerm/wiki/Keep-SSH-Session-Alive)。

## 1. 密码认证

最简单：书签 → 用户名 + 密码 → 连接。密码存在系统钥匙串加密存储里（可再加启动密码），支持 `keyboard-interactive` 回退、自定义 `serverHostKey` / `cipher` 列表、中文服务器的字符集（`encode`、`envLang`，见 [GBK 示例](https://github.com/electerm/electerm/wiki/Connecting-to-Servers-with-Special-Character-Encoding)），以及连接后自动执行的脚本。

小技巧：一次性的连接不用存，直接 **quick-connect**（`user@host`、`ssh://user:password@host:22`）。完整连接串参考：[Quick Connect](https://github.com/electerm/electerm/wiki/quick-connect)。

## 2. 公钥认证

书签 → PrivateKey/Certificate 分区 → 粘贴密钥内容或选密钥文件 → 可选**口令**。支持 RSA / ed25519 / ECDSA，`~/.ssh/config` 风格的口令，按书签独立的 `authType`（`password | privateKey | profiles`）。存过的认证可做成 **profiles** 跨书签复用。

没密钥先生成一个：

```bash
ssh-keygen -t ed25519 -C "laptop-electerm"
ssh-copy-id user@server
```

## 3. SSH agent 与 agent 转发

electerm 默认启用 **ssh-agent**：连接时读取 `$SSH_AUTH_SOCK`，`ssh-agent` / Pageant / 1Password / KeePassXC 里加载好的密钥直接用，不用重复输口令。每个书签可以：

- 关掉**使用 SSH Agent**开关，
- agent socket 非标准时填**自定义 agent 路径**。

语义与 OpenSSH agent 转发一致，跳板链路同样生效。细节：[SSH Agent wiki](https://github.com/electerm/electerm/wiki/ssh-agent)。

## 4. OpenSSH 证书认证

人多了就别再分发 `authorized_keys`：服务器只信任 CA 一次，CA 签发的所有用户证书在有效期内自动可信——免分发、自带过期、集中吊销，还能限定 principals 与强制命令。

服务端（做一次）：

```bash
# CA 密钥
ssh-keygen -t ed25519 -f ca_key -C "SSH CA"
# 每台服务器信任该 CA（/etc/ssh/sshd_config）：
# TrustedUserCAKeys /etc/ssh/ca_key.pub
```

签发用户证书：

```bash
ssh-keygen -s ca_key -I user-01 -n ubuntu,deploy \
  -V -1w:+52w -z 1 id_ed25519.pub
# 生成 id_ed25519-cert.pub
ssh-keygen -L -f id_ed25519-cert.pub  # 检查 principals 与有效期
```

electerm 侧：书签 → PrivateKey/Certificate → 导入**私钥 + 证书文件** → 可选口令 → 用户名必须命中证书 principals。700 行完整教程（含截图与排错）：[SSH Certificate Authentication Guide](https://github.com/electerm/electerm/wiki/SSH-Certificate-Authentication-Guide-for-electerm)。

## 5. MFA / 双因素登录

TOTP / Duo / 硬件密钥这类二次验证，服务端一般实现为第一因素之后的 **keyboard-interactive** 提问。electerm 在登录框里原生渲染这些提问——先输密码，再按提示输 TOTP 即可，无需额外设置。终端里 `ssh -o PreferredAuthentications=keyboard-interactive` 能通的服务器，electerm 里同样能通。网络不稳再调保活（[Keep SSH Session Alive](https://github.com/electerm/electerm/wiki/Keep-SSH-Session-Alive)）。

## 6. 连接跳转（跳板机）

要 `笔记本 → 跳板机 → 内网 DB`？给书签加**连接跳转**：每一跳独立的主机/端口/用户/密码/密钥/证书。自 **v1.50.65** 起顺序是：按列表逐跳连接，最后连书签主机（老书签为兼容保留旧顺序）。

示例：书签主机 `10.0.0.5`（内网），跳转 `[bastion.example.com]`。electerm 先连跳板机，再经它连 `10.0.0.5`。跳多少层都行。

- Wiki：[Connection Hopping Behavior Change since v1.50.65](https://github.com/electerm/electerm/wiki/Connection-Hopping-Behavior-Change-in-electerm-since-v1.50.65)
- 视频：[Electerm Connection Hop](/videos/electerm-connection-hop/) 与老版 [Electerm Connection Jump](/videos/electerm-connection-jump/)

## 7. NetBird 与 proxy-command

electerm 支持 OpenSSH 风格的**代理命令**（`%h` 主机、`%p` 端口、`%r` 用户自动展开），`netbird ssh proxy`、`cloudflared access ssh`、`aws ssm session-manager-plugin`、`kubectl exec` 这类 stdio 传输全都能接——整个 SSH 会话（终端、SFTP、隧道）都走这条命令。

**NetBird 零配置**：装好 `netbird` 后连 `100.64.0.0/10` 网段地址，electerm 自动跑 `netbird ssh detect` 再 `netbird ssh proxy`，SSO 登录链接弹通知点开即连。代理连接跳过 host-key 校验（临时密钥，和 NetBird 自带 ssh_config 一致）。`netbird` 不在 `PATH` 里就设 `ELECTERM_NETBIRD_BIN` 指过去。

```text
# 书签设置 → 代理命令示例：
netbird ssh proxy %h %p
cloudflared access ssh --hostname %h
```

Wiki：[SSH Proxy Command and NetBird Support](https://github.com/electerm/electerm/wiki/SSH-Proxy-Command-and-NetBird-Support)。通用 SOCKS5/HTTP 代理填书签 `proxy` 字段（`socks5://127.0.0.1:1080`），见 [proxy format](https://github.com/electerm/electerm/wiki/proxy-format)。

## 8. SSH 隧道：图形界面的 -L、-R、-D

书签 → 隧道分区，三种模式（[wiki](https://github.com/electerm/electerm/wiki/How-to-use-ssh-tunnel)）：

| 模式 | CLI 对应 | 示例 |
|---|---|---|
| 本地 → 远端 | `ssh -L 5000:localhost:6000` | 访问 `http://127.0.0.1:5000`，拿到 `remote:6000` |
| 远端 → 本地 | `ssh -R 6000:localhost:5000` | 访问 `http://remote:6000`，拿到你本地 `:5000` |
| 动态（SOCKS） | `ssh -D 1080` | 浏览器挂 `socks5://127.0.0.1:1080` |

每条隧道设本地/远端 host+port、起个名、保存——随会话自动建立。视频：

- [本地到远端的 SSH 隧道](/videos/electerm-local-to-remote-ssh-tunnel/)
- [远端到本地的 SSH 隧道](/videos/electerm-remote-to-local-ssh-tunnel/)
- [动态 SOCKS 代理](/videos/electerm-dynamic-socks-proxy/)

## 9. 规模化操作

以上再叠加**批量操作**（一条命令发往 N 个 SSH 会话）、**镜像输入**、**快捷命令**、X11 转发（`Use X11`）、服务器信息面板（CPU/内存/磁盘/网络/进程——[视频](/videos/electerm-view-ssh-server-info/)），以及终端里的 trzsz/rzsz 传文件。掉线了？保活 + 自动重连 + 工作区恢复，一键满血。

## 速查

- 个人 homelab → 密码或密钥书签，完事。
- 笔记本配硬件密钥 → 开 ssh-agent，electerm 里不再存口令。
- 20+ 人团队 → CA + 短期证书，按角色分 principals。
- 私有 VPC → 跳转或 NetBird/proxy-command，22 端口永不暴露。
- 日常开发 → `-L` 隧道连远端 DB/管理后台，`-D` 让浏览器借服务器的网。

下一篇：[Electerm AI 功能](/blogs/ai-features-guide/cn/)——用自然语言生成命令、书签与主题，让 agent 替你跑腿。
