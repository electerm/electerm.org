---
title: '从 electerm 书签打开 Windows 远程桌面'
description: '在 RDP 书签中启用 Windows 自带的远程桌面客户端，由 Windows 处理登录。需要通过代理或 SSH 跳板机连接时，也可以在标签页内切回内置客户端。'
date: 2026-11-23
tags: [RDP, Windows, 书签]
---

如果你习惯用 electerm 管理服务器地址，又喜欢用 Windows 自带的「远程桌面连接」在多块显示器上工作，现在可以直接从 RDP 书签启动它。Windows 桌面版 electerm 会为每个书签单独保存这个选择。你可以用 Windows 客户端连接工作站，其他远程桌面照常在 electerm 标签页中打开。

## 用 Windows 客户端打开书签

1. 在 Windows 上打开 electerm，编辑已有的 RDP 书签，或新建一个。填写远程主机的地址和端口，默认端口为 `3389`。
2. 在**授权信息**页签中，找到 **Network level authentication (NLA)** 下方的**使用本地 RDP 客户端打开 (Windows Only)** 开关，打开后保存书签。
3. 像平时一样打开书签。Windows 会在单独的窗口中启动「远程桌面连接」（`mstsc.exe`）。如果出现登录提示，在该窗口中登录即可。

electerm 会将主机地址、端口、NLA 设置以及已填写的用户名传给 Windows 客户端。如果你填写的是不带域名的用户名，并单独填写了域，客户端也会收到域名。凭据由 Windows 处理，书签里保存的密码会留在 electerm 中。

## 何时使用内置客户端

Windows 客户端会从当前电脑直连远程主机。如果某台服务器只能通过书签中的 SOCKS 代理或 SSH 跳板机访问，请使用内置客户端。启用了代理或跳板机的书签在启动 Windows 客户端时，electerm 会提示你这些设置将被忽略。

Windows 客户端启动后，electerm 中的标签页会保留。你可以在这里再次启动 Windows 客户端，也可以点击**切换到内置 RDP**，直接在当前标签页中连接。如果希望以后打开这个书签时都使用内置客户端，编辑书签，关闭本地客户端开关并保存即可。
