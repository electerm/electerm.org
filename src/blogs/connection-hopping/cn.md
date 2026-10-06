---
title: Electerm 连接跳跃：不用背 ProxyJump 的跳板机用法
description: 用一串或多串跳板机连进内网服务器——跳跃列表的顺序规则、每跳独立认证（agent、跳板机上的 key、密码）、v1.50.65 顺序变更，以及 SSH、VNC、RDP 通用的跳法。
date: 2026-09-27
tags: [ssh, 跳板机, bastion, 跳跃, 安全, 效率]
videos: [electerm-connection-hop, electerm-connection-jump]
bannerScript: banner.js
---

# Electerm 连接跳跃：不用背 ProxyJump 的跳板机用法

数据库在 `10.0.0.5`，没有公网 IP，22 端口也不对外——唯一走法是 `笔记本 → bastion.example.com → 10.0.0.5`。原生 OpenSSH 要写 `ProxyJump`、拼 `-J` 参数、折腾 agent 转发，两遍密码还得按顺序输对。

electerm 把这条链做成书签上的有序列表：每跳填自己的 host、用户和凭证，最终目的地还是书签本身。看一眼上面的横幅——一个循环先连跳板机，再穿过去，最后落在目标上。这篇文章讲的就是这个循环。

基础文档：[Connection Hopping Behavior Change since v1.50.65](https://github.com/electerm/electerm/wiki/Connection-Hopping-Behavior-Change-in-electerm-since-v1.50.65)。总览篇：[Electerm SSH 全解](/blogs/ssh-features-guide/cn/)。

## 30 秒心智模型

跳跃链就是嵌套的 SSH 连接。electerm 按你列的**顺序**一跳跳拨过去，每一跳都以前一跳为隧道，shell 只开在最后一台上：

```
笔记本 ──SSH──► 跳板机 ──隧道──► 网关 ──隧道──► 10.0.0.5（shell 在这）
```

三句话扫清一大半困惑：

- 书签自己的 host 就是**最终目的地**——它*不在*跳跃列表里，列表只放中间节点。
- 列表是**连接顺序，从上往下**：第 1 行最先拨，最后一行紧挨目标。拖 `⋮⋮` 手柄可排序。
- 列表底下有一行实时路径 `👤 -> bastion -> gateway -> 10.0.0.5`。路径读着不对，顺序就是错的。

## 在 electerm 里哪里配跳跃

打开任意 SSH 书签 → **连接跳跃**选项卡：

1. 填**host**（必填）、**端口**（默认 `22`）、**用户名**。
2. 选**认证方式**填凭证——密码、私钥 + 可选 passphrase、证书，或已存的 **profile**。每跳独立认证。
3. 捷径：**从书签选择**——挑一个现成书签，host/用户/认证自动填进表单（没存密码的自己补一下）。
4. 点添加按钮。行里显示 `user:*****@host:port (privateKey:*****)`，带铅笔改、减号删。
5. 第 2 跳、第 3 跳照此添加……**保存书签并连接。** electerm 先拨第 1 跳，再经第 1 跳拨第 2 跳，依此类推，最后穿过去连书签主机。终端、SFTP、SSH 隧道都跑在最终连接上。

改配置点铅笔（弹窗改），删除点减号，排序直接拖。一个书签可以挂**任意多跳**。

进阶：quick-connect 连接串也能带跳跃，例如 `ssh://user@10.0.0.5?opts={"connectionHoppings":[{"host":"bastion.example.com","port":22,"username":"jumper"}]}`。

## v1.50.65 顺序变更（只看这一次）

**v1.50.65 起**列表含义是*连接顺序*。electerm 拿第 1 行当第一次连接，把书签自己的 host/端口/用户/key 追加为最后一步。也就是说跳跃列表是 `[bastion, gateway]`、书签 host 是 `10.0.0.5` 时，实际连的是 `bastion → gateway → 10.0.0.5`。

老版本语义是反的，所以老客户端建的书签会弹一次性警告条，带 [wiki 链接](https://github.com/electerm/electerm/wiki/Connection-Hopping-Behavior-Change-in-electerm-since-v1.50.65)。看到它：读 wiki，把行拖成连接顺序，点"已读"，一劳永逸。

> 笨办法：表格底下的 `👤 -> …` 路径，必须跟你的 `ssh -J bastion,gateway target` 从左到右一个样。

## 1. 单跳：跳板机场景

**形状：**书签 host = `10.0.0.5`（内网），跳跃 = `[bastion.example.com]`。

**配置：**

- 书签本身：host `10.0.0.5`、端口 `22`、用户名 `dbadmin`，填 DB 那边的凭证。
- 第 1 跳：host `bastion.example.com`、端口 `22`、用户名 `jumper`，填跳板机凭证。
- 路径行应该是 `👤 -> bastion.example.com -> 10.0.0.5`。

保存、连接。electerm 先 SSH 到跳板机，在它上面开出隧道，下一次 SSH 握手就跑在这条流里。CLI 对应：`ssh -J jumper@bastion.example.com dbadmin@10.0.0.5`。

视频：[Electerm Connection Hop](/videos/electerm-connection-hop/)（老版 [Electerm Connection Jump](/videos/electerm-connection-jump/) 录于顺序变更之前，行顺序是旧语义）。

## 2. 多跳链

从上往下按拨号顺序加行。例子——`笔记本 → bastion → 10.0.0.9（网关）→ 10.0.0.5（db）`：

- 第 1 跳：`bastion.example.com`
- 第 2 跳：`10.0.0.9`（站在*跳板机*角度能连到就行，内网地址没问题）
- 书签 host：`10.0.0.5`（站在 *10.0.0.9* 角度能连到就行）

每跳的 `host:port` 都是**站在上一跳的网络**里解析的，跟链式 `ProxyJump` 一模一样。所有跳跃连接都绑在会话生命周期上，关掉标签页一起回收——不会留下僵尸跳板会话。

跳数没有硬限制，一般两三跳最常见。再多就该想想 VPN、NetBird 路由或一条 SOCKS 隧道是不是更合适（见下）。

## 3. 每跳认证：agent、跳板机上的 key、密码

每跳独立认证，electerm 会尽量不弹框打扰你。单跳的尝试顺序：

1. **先试 SSH agent。** agent 转发语义覆盖整条链，electerm 默认就开（也支持自定义 agent 路径）。agent 能过，这一跳就不读 key 了。
2. **试跳板机上的 key。** agent 不行、且该跳没配显式密码/key 时，electerm 列出*当前*跳板机 `~/.ssh/*.pub` 并逐个试私钥。key 要 passphrase 才弹框。
3. **用行里存的密码 / key。** 表单里存了啥先试啥，免弹框。
4. **最后才弹框。** `password for user@hop`（或 `passphase for hop/keypath`）出现在登录框里。纯 keyboard-interactive 的目标会自动填已存密码，不弹框（#4427）。
5. **每跳单独验 host key。** 每台新跳板/新目标都要确认一次 known-hosts，第一次 trust 过之后不再问。

实操建议：

- 天天用优先 **agent**：`ssh-agent` / 1Password / KeePassXC 里加一次 key，跳跃行保持无凭证。
- 无人值守书签（共用跳板账号）就把跳板**密码或 key 存行里**，或让行引用 **profile**。
- 跳跃行同样支持**证书**——跟主书签一样的私钥 + 证书 + passphrase 三件套，按跳跃主机的 principal 匹配。

## 4. VNC / RDP 也能跳（还有 Spice）

跳跃不是 SSH 标签页专属。VNC、RDP、Spice 书签有同样的选项卡，底层做法略有不同：electerm 弹出最后一跳，开一个一次性 SSH 会话带**动态 SOCKS 转发**（loopback 随机空闲端口），桌面协议走 `socks5://127.0.0.1:<端口>` 过去。关掉桌面标签页，SSH 会话跟着杀掉。

所以 `10.0.0.20:5900` 的 VNC 藏在同一跳板机后面，写法一样：VNC 书签 host `10.0.0.20` + 跳跃行 `bastion.example.com`。心智模型不变，只是顺序照样从上往下。

## 5. 跳跃 vs 隧道 vs ProxyCommand vs NetBird

| 需求 | 用 | 为什么 |
|---|---|---|
| 到跳板机后的机器开 shell / SFTP | **跳跃**（本篇） | 每跳独立认证，整个会话穿过去 |
| 只够一个*端口*（DB、管理后台），且那台机器本来就能 SSH | **SSH 隧道**（`-L`） | 不用多一次跳跃登录，见[SSH 隧道](/blogs/ssh-tunnels/cn/) |
| Mesh / SSO / 内网 DNS（NetBird、Tailscale 类、`cloudflared`、`aws ssm`） | **ProxyCommand** / NetBird | 传输是命令的 stdio，不是跳跃登录，见 [SSH 全解](/blogs/ssh-features-guide/cn/) |
| 已有复杂 `ssh_config` 的固定跳法 | `~/.ssh/config` 写 `ProxyJump` + 普通书签 | electerm 照样走 agent；跳跃 UI 更适合分享给团队 |

两个值得知道的行为：书签带跳跃时，**proxy-command / NetBird 自动探测会被跳过**；**中间跳不配 X11 转发**——shell 通道只开在最后一台。

## 排错清单

1. **第 2 跳之后"connection refused"**——跳跃地址是站在*上一跳*解析的，不是你的笔记本。先 SSH 上第 1 跳，在里面连第 2 跳地址验证。`10.x` 内网名只配第 2 行之后。
2. **顺序看着是反的**——可能是 v1.50.65 之前的老书签。看 `👤 -> …` 路径：必须是从先拨到后拨。拖行、确认警告。
3. **某跳 "All configured authentication methods failed"**——该跳行里没可用凭证 + agent 里没 key + 跳板机 `~/.ssh` 也没 key。给行里补密码/key，或 agent 里加 key。纯 keyboard-interactive 目标记得把密码存书签上（自动填，#4427）。
4. **密码框问的主机不对**——跳跃弹框都带主机名 `password for user@hop-host`，看清再输；目标密码在书签上，跳跃密码在行里。
5. **shell 能上但穿跳失败**——中间机要开 `AllowTcpForwarding yes`（多数发行版默认开）。跳板机设了 `AllowTcpForwarding no` / `DisableForwarding`，后面全断——这是服务端配置，得找管理员。
6. **host key 反复问**——每跳独立验。trust 一次即可；服务器换 key 了按正常 SSH 流程清 known-hosts。
7. **关标签页链全断**——设计如此：跳跃绑在会话生命周期上。重连整条重建；真不能断的活儿放目标机 tmux 里，再配[会话保活](/blogs/session-keepalive/cn/)防闲置杀。

## 速查

- 最终目的地 = **书签 host**。跳跃列表 = **中间节点，按拨号顺序**，`👤 -> hop1 -> hop2 -> target`。
- 每跳：host + 端口 + 用户 + 自己的凭证（agent / 跳板机 `~/.ssh` key / 存的密码 / 证书 / profile），"从书签选择"可一键填表。
- v1.50.65 起列表顺序 = 连接顺序，老书签有一次性警告 + wiki 链接。
- 跳跃随标签页同生共死。VNC/RDP 跳跃走动态 SOCKS 代理。
- 跳跃 + 隧道可组队：先跳进内网，再 `-L` 把 DB 端口带出来，一个书签全办。
- CLI 对应：单跳 `ssh -J jumper@bastion dbadmin@10.0.0.5`，多跳 `ssh -J bastion,gateway target`。

下一篇：[Electerm SSH 全解](/blogs/ssh-features-guide/cn/)看认证、隧道、NetBird 怎么跟跳跃组队——只要*端口*不要 shell 就看[SSH 隧道](/blogs/ssh-tunnels/cn/)。
