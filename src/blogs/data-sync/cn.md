---
title: 'Electerm 数据同步：一处配置，台台机器都一样'
description: electerm 把书签、主题、快速命令和设置同步到秘密 gist、自建服务、electerm 云或任意 WebDAV 网盘——按类型加密、上传下载可预览、自动同步加文件导出。五个后端怎么工作、该怎么选。
date: 2026-09-25
tags: [同步, 备份, 书签, github-gist, webdav, 提效]
bannerScript: banner.js
---

# Electerm 数据同步：一处配置，台台机器都一样

换了台新笔记本，五十个书签全没了。一个个重建连接不是装机——是带着额外步骤的既视感。

electerm 专门有一个面板干这件事：**设置 → Sync**。把数据传到五个后端之一，换台机器再下载回来——书签、书签分组、终端主题、快速命令、配置文件、地址簿、工作区、触发器，再加一部分应用设置。笔记本和台式机从此是同一套主机，不用复制粘贴。

> **先看这段**：同步是整盘替换，不是合并。下载会按数据类型直接覆盖本地（`src/client/store/sync.js` 里每个类型一次 `store.setItems(n, arr)`）。先看下文的预览，再点下载。

## 1. 五个后端并排对比

`src/client/components/setting-sync/setting-sync.jsx` 里的标签页就是 `syncTypes`（`src/client/common/constants.js`）的五个条目。你的构建可能用 `allowedSyncTypes()` 藏掉几个，但官方版五个全有：

| | github | gitee | custom | cloud | webdav |
|---|---|---|---|---|---|
| **存到哪** | 秘密 gist | 秘密 gist | 你自己的 HTTP 服务 | `sync.electerm.org`（测试版） | 任意 WebDAV 服务器 |
| **凭据** | 个人访问令牌（`gist` 权限）+ gist id | 同构，gitee token + gist id | API 地址 + JWT 密钥 + 用户 id | 网站上拿到的 token | 服务器地址 + 用户名 + 密码 |
| **适合** | 大多数人，免费稳定 | 更习惯 gitee 的国内用户 | 自建、团队 | 零折腾，不想玩 gist | 有 NAS / Nextcloud / 坚果云的人 |

切换标签页不会丢其它后端的凭据——每个类型在 `config.syncSetting` 下各存一套 `*AccessToken`、`*GistId`、`*LastSyncTime`、`*SyncPassword`，**保存**只写当前页（`setting-sync-form.jsx` → `updateSyncSetting`）。

## 2. 60 秒跑通第一次同步（github）

1. 去 `github.com/settings/tokens/new` 建一个**只有 gist 权限**的 token——立刻复制，GitHub 只给看一次（[wiki：创建个人访问令牌](https://github.com/electerm/electerm/wiki/Create-personal-access-token)）。
2. 去 `gist.github.com` 建一个**秘密** gist，从 URL 里抄 id（`.../your-name/xxxxxxxx` → `xxxxxxxx`）。
3. electerm 打开**设置 → Sync → github**，粘贴 token + gist id，按需设**加密密码**（第 5 节），需要走代理就填 **proxy**，点 **Save**。
4. 旧机器点 **Upload**，新机器点 **Download**。看 **lastSyncTime** 和 **Check gist** 链接确认。

gitee 流程一样——但先看警告：面板里明确写着 *“不推荐使用 Gitee 同步”*（[wiki：gitee 同步警告](https://github.com/electerm/electerm/wiki/gitee-data-sync-warning)）。新配置优先 github、cloud 或 WebDAV。

## 3. 到底同步了什么

`constants.js` 里的 `syncDataMaps` 就是全部契约：

```js
{
  settings: ['config'],                    // 精选子集，见下
  bookmarks: ['bookmarks', 'bookmarkGroups'],
  terminalThemes: ['terminalThemes'],
  quickCommands: ['quickCommands'],
  profiles: ['profiles'],
  addressBookmarks: ['addressBookmarks'],
  workspaces: ['workspaces'],
  triggers: ['triggers']
}
```

表单下面的**数据类型复选框**（`data-select.jsx`）写 `config.dataSyncSelected`——默认 `all`，取消勾选就变成逗号列表。`getDataSyncNames()` 把它翻译成 `{ names, syncConfig }`，上传（`uploadSettingAction`）只传这些，下载（`downloadSettingAction`）只覆盖这些。

还有两个值得知道的细节：

- **设置只是精选列表**，不是整个配置（`sync.js` 的 `getSyncConfig()`）：主题、字号、回滚行数、快捷键、语言、终端选项、AI 设置等四十来个键。导入时会被剥掉服务器相关键（`stripServerManagedKeys`：`tokenElecterm`、`host`、`port`、`wsHost`……），同步来的配置永远弄不坏本机服务的 WebSocket 令牌。
- **排序也跟着走。** 每个数据集都带一个 `<name>.order.json`；下载时按它重排，书签和标签页顺序过一趟同步原样保留。

## 4. 每个后端的配置要点

**自建服务**（[wiki](https://github.com/electerm/electerm/wiki/Custom-sync-server)）——填 API 地址、JWT 密钥、用户 id。协议很小：`PUT` 存 JSON 请求体（从 `jwtData.id` 取用户），`GET` 把存的东西吐回来，`POST` 在用户校验通过时回 `ok`。`electerm/electerm-sync-server-*` 下有现成实现：Cloudflare Workers + D1（推荐）、Vercel、Python、Rust、Go、Java 等等。

**Cloud**——表单里的 `sync.electerm.org [Beta]` 链接。没有 gist id 一项：保存时自动固定 `cloudGistId = 'cloud'` 和默认 API 地址，去网站拿 token 粘进来就行。

**WebDAV**（[wiki](https://github.com/electerm/electerm/wiki/WebDAV-sync)）——切到 `webdav` 页，填服务器地址、用户名、密码，自签名证书就打开**跳过 SSL 验证**。地址形状：Nextcloud/ownCloud 是 `https://server/remote.php/dav/files/username`，坚果云是 `https://dav.jianguoyun.com/dav/`，裸 Apache/nginx 就是 `/dav/`。服务器上是一个 `/electerm/` 目录，里面是 `<name>.json` 加 `userConfig.json` 和 `electerm-status.json`（设备名、electerm 版本、`lastSyncTime`）。生产环境一定用 HTTPS，优先应用专用密码，目录记得备份。

所有后端都可以填可选的 **proxy**（`socks5://127.0.0.1:1080` 这种格式，见[代理格式 wiki](https://github.com/electerm/electerm/wiki/proxy-format)）。

## 5. 加密：密码到底保护了什么

**加密密码**是分后端存的（`<type>SyncPassword`）。设了之后：

- 上传时**只加密书签和 profiles**（`uploadSettingAction` 里的 `encryptAsync`）；主题、快速命令等还是明文 JSON。
- 下载是**失败即停**（`decryptSyncData`）：配了密码却收到明文 `bookmarks.json` / `profiles.json`（`[…]` 开头），直接中止，不把可能是坏人塞的数据吃进来。
- 密码没有找回。丢了，服务器上那份就永远打不开了——wiki 写得很直白，代码也是这么执行的：没密码谁都解不开。

实操规矩：第一次上传**之前**就设好密码，所有机器用同一个，密码放密码管理器——别只存在 electerm 里。

## 6. 上传、下载，先看再下

- **上传**（`uploadSetting`）把选中的数据集加 `electerm-status.json`（时间戳、版本、主机名）推出去。gist 后端是一次 gist `update` 调用；WebDAV 是一个文件一次 `PUT`。
- **下载**（`downloadSetting`）拉回来、解密、跑 `fixBookmarks` / `fixThemes`、恢复排序、应用精选 `userConfig.json`，最后盖 `<type>LastSyncTime` 章。
- **预览**——按钮下面的**服务器数据状态**行，加上 `previewServerDataWithCompare` 驱动的差异视图（`sync-data-compare.jsx`）：每个类型一行 `远端 N / 本地 M → 建议上传/下载？`，没差别就显示 `Data in sync`。往已有书签的机器第一次下载前，先看它。
- **空目标报错很直白**：*“gist 是空的，先检查 gist ID 或先上传”*（gist）和 WebDAV 目录版同理——意思就是字面意思：先上传，再下载。

## 7. 自动同步和文件导出

标签页上面的**导出 / 导入 / 自动同步**一排（`data-import.jsx`）管的是省心路径：

- **自动同步开关**（[wiki：自动同步](https://github.com/electerm/electerm/wiki/Auto-data-Sync)），间隔（`数据变更时`、5/10/15/30 分钟、1/2/6/12/24 小时）加方向（上传 / 下载）。默认是*变更即上传*：任何数据改动触发 `uploadSettingAll`，推到每个配好的后端。定时模式由 `auto-sync.jsx` 轮询；下载方向让第二台机器跟着第一台走。
- **导出**（`handleExportAllData`）吐一个 `YYYY-MM-DD-HH-mm-ss-electerm-all-data.json`，全部数据集加完整配置——离线备份就靠它。
- **导入**（`importAll`）从这个文件整盘替换同样的数据集，200 条一批带进度条，再应用配置（照样剥服务器键、重设主题）。

书签上的**触发器跟着书签一起同步**，这边调好的登录流程，那边开箱即用——见[终端触发器](/blogs/terminal-triggers/)。

## 8. 真正要紧的安全守则

1. **只用秘密 gist。** 公开 gist 等于把主机名、用户名乃至（未加密的）密码挂上互联网。建秘密的，id 也别乱发。
2. **token 只要 gist 权限。** 权限给多了，丢一个同步配置等于丢整个 GitHub 账号。
3. **加密密码先设**，而且别只记在 electerm 里。
4. **往非空机器第一次下载前先预览**——下载是替换，不是合并。
5. **同一时间只有一个写者。** 两台机器都开变更即上传，最后写入的赢；机群里让一台传、其余定时下载。

## 速查表

- **入口**——左侧齿轮 → Sync。五个页：github / gitee / custom / cloud / webdav。
- **第一次**——token（+ gist id）→ 保存 → 这边上传、那边下载，看 `lastSyncTime`。
- **选数据**——表单下面的复选框（`dataSyncSelected`）；设置只同步精选四十来个键，服务器键会被剥掉。
- **上锁**——加密密码只包书签 + profiles，下载失败即停，丢了找不回。
- **省心**——自动同步（变更即时或定时，上传或下载）+ 单文件导出导入做离线备份。
- **口诀**：*新机器*先预览再下载；*主力机*变更即上传；*机密和机群*加密加私有后端。

下一篇：[终端触发器](/blogs/terminal-triggers/)——跟着书签一起同步的自动化应答；或者[密码管理](/blogs/password-management/)——把这些书签带来的密码一次转完。
