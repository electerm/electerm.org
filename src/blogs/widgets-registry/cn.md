---
title: 'widgets.electerm.org —— 找到 widget，逐个文件校验，再装进 electerm'
description: 全新的 widgets.electerm.org 把社区 widget 索引到固定 commit，并为包内每个文件发布 sha256。electerm 5.10.0 起可在 设置 → Widgets → Online 里直接浏览，安装前会校验整棵目录树。本文覆盖三个 JSON 接口、安装确认框、digest 校验、可复制安装串、撤销列表、失败语义，以及「校验通过」不等于「安全」。
date: 2026-11-10
tags: [widgets, registry, security, extensibility, supply-chain]
bannerScript: banner.js
---

# widgets.electerm.org：找到 widget，逐个文件校验

别人告诉你仓库名的时候，装一个 widget 很容易。难的是发现那些没人告诉你的 widget，更难的是确认
「现在躺在你数据目录里的字节」就是作者发布的字节 —— 从你读完 README 到按下 Import，一个分支
可能已经动了。

[widgets.electerm.org](https://widgets.electerm.org) 同时解决这两件事：它是一个很小的社区 widget
索引，每条记录都钉死在某个 commit 上，包里每个文件都有 sha256。从 **electerm 5.10.0** 起，桌面端
直接读这个索引：**设置 → Widgets → Online** 列出可装的东西，点一次 **Install**，应用会下载固定
commit 的目录树、把每个文件都算一遍哈希，全部对上才复制进数据目录。

如果还没用过用户 widget，先读
[用户自定义 widget：不改应用，也能加自己的面板](/blogs/user-widgets/cn/) —— 这一篇讲的是去哪儿
**找**它们。

## 1. 这个站点到底是什么

它是跑在 Cloudflare Workers Static Assets 上的纯静态站：没有 Worker 脚本、没有数据库、没有登录、
没有后台、没有写接口。构建时读 `data/widgets.json`，按钉死的 commit 从作者仓库把源码拉下来、逐个
文件算哈希，然后写出几个 JSON 和 HTML 页面。请求进来时，服务端除了发文件什么都不做。

| 接口 | 里面是什么 |
| --- | --- |
| `/api/v1/index.json` | `version`、`generatedAt`，以及摘要：id、名称、版本、描述、作者、许可证、仓库、commit `ref`、`digest`、`fileCount`、`totalSize`、`status`、`sourceUrl`、`filesUrl` |
| `/api/v1/widgets/<id>.json` | 同一条记录，外加 `files[]` —— 每个文件一条 `{ path, size, sha256 }` |
| `/api/v1/revocations.json` | 从索引里移除的 id，附原因 |
| `/health` | `{"ok":true}` |

`/api/v1/*` 由静态 `_headers` 文件加上 `Access-Control-Allow-Origin: *` 和
`Cache-Control: public, max-age=300`。详情接口只有 `<id>.json` 这一种 URL，索引里的 `filesUrl`
也始终用这个形式。

**站点不托管 widget 代码**，只索引元数据；字节来自各作者自己的仓库。想被收录，提一个 PR，往
`data/widgets.json` 追加一条：

```json
{
  "host": "github.com",
  "owner": "electerm",
  "repo": "electerm-widget-tftp",
  "subdir": "",
  "ref": "<40-char lowercase hex commit sha>"
}
```

`ref` 必须是完整的 40 位小写十六进制 commit sha，不能是 tag 或分支 —— 钉死 sha，digest 才可复现。
`host` 只能是 `github.com` 或 `atomgit.com`。widget 自己的 `package.json` 里要有 `electerm` 对象，
`id` 匹配 `^[a-z0-9-]+$`。只是把 electerm 内置功能重新包一层的 widget 不收录。

构建在每次 push 到 main、每天 `0 3 * * *`（UTC 03:00）以及手动触发时执行。**任何一步失败就整体
失败** —— 半个索引永远不会被发布出去。

## 2. 在 electerm 里用：设置 → Widgets → Online

**Widgets** 设置面板有三个 tab：已安装列表、**Online**、运行中的实例。切到 **Online**，应用读取
索引。每行给出名称、版本、描述、作者、仓库、许可证、文件数、总大小和 commit 的前 7 位；已安装的
会标记出来，按钮变成 **Update**。**Source** 链接打开的就是那个 commit 的仓库页面，搜索框按名称、
描述、作者或仓库过滤索引。

按 **Install**，在任何下载开始之前先弹一个 520px 的确认框。它把信任模型直接写明白 —— *widget 的
`main.js` 跑在 electerm 主进程里，有完整 Node 权限，能读文件、能跑命令，只装你信得过的源码* ——
然后列出版本、作者、仓库、完整 commit sha、`Files: 17 (88 KB), pinned and verified`，以及
**View source at this commit** 链接。不确认就什么都不会装。

装完之后，widget 出现在已安装列表里，用的还是用户 widget 那套生成表单、实例日志和启停行为。如果
这个 id 已经装过，会再问一次 **Replace installed widget?**，确认后才以 `overwrite = true` 重装。

关于这个面板，两点得说实在的：

- **浏览是尽力而为。** 站点连不上时，tab 显示 `Could not load the registry: ...` 并给一个 **Retry**
  按钮。已安装列表完全独立，照常工作；撤销列表读取失败会被静默当成空列表。
- **搜索框是过滤器，不是粘贴框。** 复制来的安装串（§5）要贴进第一个 tab 的 **Import** 对话框。
  网站那三步提示写的是「Widgets → Online」，但在应用里，Online tab 是从自己的列表点按钮安装的。

## 3. 每一项的成本

| 项目 | 你看到什么 | 刷新时机 | 服务端跑了什么 |
| --- | --- | --- | --- |
| `/api/v1/index.json` | Online 列表，目前 3 条 | push 时、每天 UTC 03:00、手动触发时重建；缓存 300s | 请求时不跑任何东西，只是静态文件 |
| `/api/v1/revocations.json` | 一行红字「已从索引移除」，Install 置灰 | 同一次构建、同一份缓存 | 无；加载失败直接忽略 |
| `/api/v1/widgets/<id>.json` | 安装时用的文件清单 | 同一次构建、同一份缓存 | 无 |
| `/health` | 应用里看不到 | 同一次构建 | 无 |
| 两次 JSON 读取 | 转圈，然后出列表 | 打开 Online tab 时读一次，失败后点 **Retry** | 走应用自己的 ws fetch 代理，两个 GET，各 15s 超时，遵守你的代理设置 |
| widget 源码 | 文件落到 `<data dir>/widgets/<id>/` 之前什么都看不到 | 每次安装一次，永远是那个 sha | codeload.github.com → mirror.electerm.org → cdn.jsdelivr.net（各 30s 超时）；AtomGit 走 contents API，并发 3 |

没有轮询、没有推送、没有埋点。唯一在服务器上跑的东西是**构建** —— 它拉源码是为了算哈希。

## 4. 线上到底发生了什么

信任一个 **Install** 按钮之前，这段值得读。

1. **读。** `loadWidgetRegistry()` 并行取 `/index.json` 和 `/revocations.json`，走
   `fetchFromServer`（和更新检查同一个 ws fetch 代理），`timeout: 15000`，带
   `Accept: application/json`。每条摘要必须满足 id 匹配 `^[a-z0-9-]+$`、`ref` 匹配
   `^[a-f0-9]{40}$`、`digest` 匹配 `^sha256:[a-f0-9]{64}$`、`status === 'public'`；字符串进 React
   之前先做类型与长度检查。详情 URL 由 **id** 拼出来，绝不取索引里的 URL，所以被篡改的索引没法
   让应用去请求任意地址。
2. **确认。** 弹框展示站点发布的那条记录 —— 包括完整 40 位 sha 和文件数/大小 —— 并给一个指向该
   commit 源码的链接。
3. **取记录。** `installRegistryWidget(id)` 读 `/widgets/<id>.json`，再次检查它是不是合法摘要、
   `record.id === id`、`files` 是不是数组，然后调主进程：
   `runGlobalAsync('importWidgetFromRegistry', record, overwrite)`。
4. **任何网络与磁盘写入之前先校验。** 主进程把整条记录重新验一遍：host 白名单、owner/repo/subdir
   路径段合法、40 位 sha、digest 格式、1–800 个文件、路径安全且不重复、sha256 是 64 位小写十六进制、
   size 是非负整数、总量 ≤ 32 MB、`fileCount` 和 `totalSize` 与文件清单一致，以及
   `computeDigest(files) === record.digest`。digest 是一个规范化字符串的 sha256：文件按路径排序，
   每个一行 `path\0size\0sha256\n` —— 构建端和应用端的算法逐字节一致。
5. **按 sha 下载。** `registrySource()` 拼出 `/tree/<sha>` URL —— 绝不用分支，绝不用 HEAD。
   `fetchWidgetSource` 依次尝试 codeload.github.com、mirror.electerm.org、再按文件走
   cdn.jsdelivr.net；AtomGit 没有匿名归档接口，所以用 contents API 以并发 3 遍历。预算：每个请求
   30s、800 个文件、32 MB、5 次重定向。`.git` 和 `node_modules/.bin` 里的链接在所有下载路径和哈希
   对比的两端都被跳过。
6. **先验树，再复制。** `collectTree()` 给每个普通文件算哈希。少一个文件、多一个文件、size 变了、
   sha256 变了、出现符号链接或特殊文件、或者 `package.json` 里 `electerm.id` 是另一个 widget，
   都会抛错。整棵树都对上之后，`importWidget()` 才把目录复制进
   `<data dir>/widgets/<id>/`；无论成功失败，`finally` 里都会删掉临时目录。对不上就是**什么都没装**，
   错误以 toast 出现，转圈停掉。

这就是重点：分支移动、镜像被污染、多出一个文件、vendored 依赖被改掉，都会让安装失败，而不是悄悄
成为它的一部分。

## 5. 可复制的安装串（以及它不做什么）

网站上每张卡片、每个 widget 详情页都有一个 **Copy install** 按钮，复制的是钉死在索引所哈希的那个
commit 上的仓库引用：

```
electerm/electerm-widget-tftp#62957d636a302d43e606615857e32963950ef37c
```

把它贴进 **设置 → Widgets → Import**。`parseWidgetSource()` 把 `#` 后面的部分当作 ref，走同一条
镜像链下载那个 commit。web 版、离线机器（文件夹本来就在手上）、或者没被索引收录的 widget，用这条
路就对了。

但**保证不是同一套**：

| | Online tab → Install | Widgets → Import 贴 `owner/repo#sha` |
| --- | --- | --- |
| 钉死 commit | 是 | 是，前提是你贴的是 sha |
| 按索引逐个文件校验 sha256 | 是 | **否** |
| 清单与 id 校验 | 是 | 是 |
| 校验 digest / fileCount / totalSize | 是 | 否 |
| 需要索引站点 | 是 | 否 |
| 信任确认框 | 是 | 否 |

网站的 widget 详情页也说得很直白：复制出来的安装串不校验索引 digest。在乎校验，就用 Online tab。

## 6. 这些数字该怎么读

- `generatedAt: 2026-11-09T10:45:45.961Z` 这次构建索引了 **3 个 widget**：
  `passbolt-search`（0.1.0，60 个文件，17,170,711 字节）、`docker-cockpit`（1.0.0，9 个文件，
  26,410 字节）、`tftp-server`（1.0.0，17 个文件，89,749 字节）。
- `fileCount` 和 `totalSize` 描述的是**整个 widget 目录**，包括 vendor 进来的 `node_modules`。
  Passbolt Search 自带 OpenPGP/JWT 依赖，所以是 60 个文件、约 16 MB；Docker Cockpit 只有 9 个小
  文件。这两个数字都不是「下载要花多少」的估算。
- `digest` **不是**压缩包的哈希，而是排序后规范化文件清单的 sha256 —— 某个文件改一个字节会变，
  增删文件也会变。
- `generatedAt` 是**构建时间**，不是请求时间。作者仓库里有了新 commit，在下一次构建和 300s CDN
  缓存过期之前，索引不会变。这种「陈旧」正是钉死之所以成立的原因。
- 弹框里的 `Files: 17 (88 KB)` 来自应用的 `formatSize()`：
  `(size / 1024).toFixed(size < 1024 * 1024 ? 0 : 1)`。小于 1 MB 显示整数 KB，大于 1 MB 显示一位
  小数但**单位还是 KB**，所以 16.4 MB 的 Passbolt widget 会显示 `16768.3 KB`，而不是 `16.4 MB`。
- `version`、`name`、`description`、`author`、`license` 都来自该 commit 上 widget **自己**的
  `package.json`，索引不编造元数据。
- `revocations.json` 目前是空的。如果某个 id 被撤销，那一行会写
  *This widget was removed from the registry. Do not reinstall it* 且 **Install** 置灰 —— 但已经装到
  你机器上的文件不会被删掉。

## 7. 校验给了你什么，没给你什么

给你的是**可验证、钉死的来源**和一次明确的安装决定。它不会让 widget 变安全。widget 的 `main.js`
跑在 electerm 主进程里，有完整 Node 权限：文件、网络、子进程。能调 `docker` 的 widget 基本等价于
root；能读文件的 widget 能读你的私钥。一个校验得完美无缺的恶意 commit，依然是恶意 commit。

装 widget = 信任它的作者，和装 VS Code 扩展、装 npm 包一样。确认框就是为这个存在的。点确认之前
打开源码链接看一眼 —— 钉死 sha 的全部意义，就在于你读到的代码就是被装上的代码。

客户端在此之上还强制了几条：只认 `github.com` 和 `atomgit.com` 的记录；只读 JSON 且一律按不可信
输入处理；不把应用内部模块暴露给 widget 的 `main.js`；用户 widget 不能顶掉内置 id；`openTab`
产生的标签页会带标记，不写进连接历史。

## 8. 动手前该知道的限制

| 限制 | 原因 |
| --- | --- |
| Online tab 只有桌面端有 | 索引客户端在 Electron 应用里；web/离线走网站复制的安装串 |
| Online tab 不能粘 URL | 搜索框只过滤索引，安装从列表某一行发起 |
| 每个 widget 800 文件 / 32 MB | 构建端和客户端都设了上限，让哈希保持便宜 |
| 只支持 GitHub 与 AtomGit | 下载链和 `ref` 规则就是按这两个 host 写的 |
| 撤销只是提示 | 它禁用 Install 按钮，不会卸载本机文件 |
| 没有实时更新 | 索引只列上次构建里 `status: public` 的记录；重开 tab 才重新加载 |
| 不跑 `npm install` | widget 得自带 `node_modules`，否则加载时报错 |

## 9. 试一次

1. 升到 **electerm 5.10.0** 或更新版本。
2. 打开 **设置 → Widgets → Online**，应该出现三行，数据来自
   [index.json](https://widgets.electerm.org/api/v1/index.json)。
3. 选 **Local TFTP Server**（17 个文件、89,749 字节，最小巧完整的一个），点 **Install**，读一遍弹框，
   点开 **View source at this commit** 看看源码。
4. 确认。应用钉住 commit `62957d63…`，把 17 个文件逐个算哈希，然后才复制目录。widget 出现在已安装
   列表里，点开就是自动生成的表单，带目录和端口字段。
5. 想看数据？打开 `/api/v1/widgets/tftp-server.json`，里面就是应用刚刚核对过的 `files[]` 和 digest。

- 索引站：[widgets.electerm.org](https://widgets.electerm.org)
- 站点源码：[electerm/electerm-widgets](https://github.com/electerm/electerm-widgets)
- 示例索引：[electerm/electerm-widget-examples](https://github.com/electerm/electerm-widget-examples)
- 自己写：[User widget guide](https://github.com/electerm/electerm/wiki/User-widget-guide)、
  [用户自定义 widget：不改应用，也能加自己的面板](/blogs/user-widgets/cn/)
- 问题与作品展示：[issues](https://github.com/electerm/electerm/issues)
