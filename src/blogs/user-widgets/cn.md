---
title: 用户自定义 widget —— 不改 electerm 一行代码，加自己的面板
description: electerm 的用户 widget 就是带 package.json 的文件夹，应用运行时加载。导入之后你要么得到一张自动生成的表单，要么得到一个跑在 sandbox iframe 里的自己的页面；主进程里是完整 Node 权限，不用重新编译、不用 fork。包含清单字段、config 模式、instance 生命周期、window.electerm 桥、真实示例与安全模型。
date: 2026-10-22
tags: [widgets, extensibility, automation, passbolt, docker, security]
bannerScript: banner.js
---

# 用户自定义 widget：不改应用，也能加自己的面板

终端类应用最后总会遇到同一个需求：「它能不能顺便对接**我们自己的**那套东西？」一个内部凭据库、
一个只在我们机器上才有意义的容器面板、一条符合我们命名规范的改名规则。为这个去 fork electerm
显然荒唐 —— 为了加一个面板，你得继承一整个 Electron 应用。

**用户 widget** 就是出口。一个 widget 就是一个带 `package.json` 的普通文件夹，electerm 运行时从
数据目录里加载它。导入之后它和内置 widget 待在同一个列表里，用同一个面板、同一份实例日志、同一套
启停行为；把文件夹删掉，它就没了。

完整参考：[User widget guide](https://github.com/electerm/electerm/wiki/User-widget-guide)。
可运行代码：[electerm/electerm-widget-examples](https://github.com/electerm/electerm-widget-examples)。


## 1. 导入就是安装的全部

**设置 → Widgets → Import**（搜索框上方独立那一行的按钮），选一个文件夹，结束。

三个细节比看上去重要：

- **是复制。** 整个文件夹（含 `node_modules`）被复制到 `<data dir>/widgets/<id>/`。源文件夹不会被
  链接，所以之后改源码等于没改，除非重新导入并确认覆盖。
- **id 必须等于文件夹名。** 清单里的 `electerm.id` **就是**目录名，同时也是
  `electerm-widget://<id>/` 这个 scheme 的 host。不一致会在导入时被拒，原因写在列表那一行。
- **坏文件夹不会变成坏的安装。** 复制之前先校验清单：入口不存在、JSON 坏了、id 与目录名不一致。
  元数据只从 `package.json` 读 —— 列清单从不执行 widget 代码，所以一个会崩的 widget 拖不垮列表。

卸载是行上的 ✕：先停掉运行实例，再删文件夹，widget 写在 `main.js` 旁边的状态也一起走。

## 2. 三种形态，一套接口

| 形态 | 你写什么 | electerm 画什么 |
| --- | --- | --- |
| **config 模式**（`electerm.configs`，没有 `ui`） | 一个只有导出的 `main.js` | 表单、结果、按钮 |
| **instance**（`type: "instance"`） | `widgetRun(config, ctx)` → `{ instanceId, start, stop }` | 同样一张表单 + 启停 + 实例日志 |
| **自带 UI**（`electerm.ui`） | 一个 HTML/CSS/JS 页面 | 什么都不画 —— 那是你的文档，跑在 sandbox iframe 里 |

前两种共用一套结果语言，这也是它们用起来便宜的原因。

**字段是声明的，不是拼的**：`string`、`textarea`、`number`、`boolean`、`password`、`file`、
`directory`、`select`，每个都可以带 `label`、`description`、`placeholder`、`required`、`default`，
select 带 `choices`，file 带 `filters`。

**结果也是声明的** —— action 返回一个对象，面板照着画：

| 字段 | 画成什么 |
| --- | --- |
| `message` + `messageType` | 顶部一行提示：`info` / `success` / `warning` / `error` |
| `details` | 标签 + 值；`secret` 会把值打码，配眼睛和复制按钮 |
| `table` | `{ columns, rows, rowButtons }` —— 一张带行内动作的 antd 表 |
| `buttons` | 普通按钮，点击替换当前结果 |
| `openTab` | 用你返回的连接开一个真正的终端标签页 |

按钮的 `action` 只是 `main.js` 里另一个导出名。行按钮按 `action(row, formValues)` 调用，结果
**压进栈**并带返回箭头 —— `rename-files` 的「先预览、再执行」和 `passbolt-search` 的
「先搜索、再揭示某一个密码」都是这么来的，而且不用把整个库摊在屏幕上。

`"persist": true` 会把非 password 的值记在应用的加密本地存储里，按 widget 隔离。password 字段在
写入时永远被跳过。`getConfig()` 也永远不会返回应用配置：widget 只读写自己那把 key。

## 3. 每种形态的成本

| | config 模式 | instance | 自带 UI |
| --- | --- | --- | --- |
| 要写的文件 | `package.json` + `main.js` | 同上 + 生命周期 | 再加 html/css/js |
| 表单 | 生成 | 生成 | 你自己画 |
| 启停 + 实例日志 | 没有 | 有 | 没有 |
| 实时刷新 | 请求 → 渲染 | 请求 → 渲染 | 自己轮询 |
| 跑在 | 主进程 | 主进程 | iframe（独立 origin）+ 主进程 |
| 适合 | 查询、变更、搜索 | 服务、隧道、监听器 | 仪表盘、日志面板、行内动作 |

先试 config 模式。`docker-cockpit` 之所以存在，是因为一张表单确实表达不了「边看边变的容器列表」，
而不是因为 config 模式是个玩具。

## 4. 自带 UI 的桥，故意做得很小

自带 UI 的 widget 从 `electerm-widget://<id>/<文件>` 加载：**和应用不同源**，跑在 sandbox iframe
里，看不到 `window.store`、应用 DOM 或 preload API。它拿到的是 `window.electerm`，在它的第一个
脚本之前就注入好了：

`call(name, ...args)` · `getConfig()` · `updateConfig(patch)` · `openDialog(opts)` ·
`saveDialog(opts)` · `copy(text)` · `openExternal(url)` · `openTab(tab)` · `log(...args)`

全部是 JSON 的请求/响应，没有推送通道，所以实时视图要自己轮询。宿主还会在初始化时把应用的 CSS
变量（`--main`、`--text`、`--primary`、`--success`……）挂到 `:root`，所以 widget 面板不引应用样式表
也能长得像原生。iframe 的 sandbox 是
`allow-scripts allow-same-origin allow-forms allow-modals allow-popups`；面板标题栏有个 reload
按钮，因为开发循环就是「改、reload」—— 没有 HMR。

## 5. 是真能用的例子，不是 demo

[electerm-widget-examples](https://github.com/electerm/electerm-widget-examples) 里有五个 widget，
每个都有中英双语 README：

| 目录 | 形态 | 证明了什么 |
| --- | --- | --- |
| `passbolt-search` | config | 完整的 OpenPGP + JWT 客户端藏在五个字段后面；私钥不出本机 |
| `docker-cockpit` | 自带 UI | 轮询、日志面板、确认框 —— 表单表达不了的部分 |
| `rename-files` | config | 破坏性操作怎么做得安全：先预览，行按钮才真改 |
| `static-server` | instance | 表单 + 启停 + `serverInfo` + 访问日志 |
| `ftp-server` | instance | 同一个契约，依赖 vendor 进来 |

如果你有 Passbolt 服务器，先试 `passbolt-search`：填 URL、自己的 user UUID、导出的私钥和口令，
首次连接确认一次服务器指纹。按主机名、IP 或 URI 搜索，直接从结果行开 SSH/FTP/Telnet/RDP —— 标签页
会被标记 `from: widget:passbolt-search`，而带 `from` 的标签页不写连接历史，解出来的凭据不会进同步
数据。

没有服务器？`node scripts/passbolt-mock-and-run.js` 会在 `127.0.0.1` 起一个假 Passbolt、现场生成
密钥，把 connect → trust → search → details → openSsh → lock 走一遍。

## 6. 安全：一个文件夹里两个信任级别

这点必须说准，因为它是唯一能真正伤到你的地方：

- **UI 页面是被关住的。** 独立 origin、sandbox frame、九个方法，宿主只回应 `source` 是那个 frame
  的消息。
- **`main.js` 没有。** 主进程入口以完整 Node 权限跑在应用进程里：文件、网络、子进程。能调 `docker`
  的 widget 基本等价于 root；能读文件的 widget 能读你的私钥。

所以装 widget = 信任它的作者，和装 VS Code 扩展、装 npm 包一样。只装你自己写的、或者读过的。

宿主确实强制的：

- 用户 widget **不能顶掉内置 id** —— 内置胜出，被忽略的文件夹在列表里带标记
- widget 只能拿到 Node 内置模块和自己的 `node_modules`，碰不到应用内部模块
- 通过桥只能调用 widget 模块自己导出的函数
- `openTab` 会带标记，带标记的标签页不进连接历史

## 7. 动手之前该知道的限制

| 限制 | 原因 |
| --- | --- |
| 碰不到应用内部代码 | 从数据目录 `require('../mcp/server/mcp.js')` 解析到的路径不存在。内置的 MCP Server 因此搬不过来 |
| 原生模块很麻烦 | 可以 vendor，但预编译二进制必须匹配 Electron ABI，每次升 Electron 都要重来（`node-pty` 27MB，这就是没有用户版 SSH server 的原因） |
| 没有「往终端打字」的 API | `openTab` 开的是连接，不是命令；本地标签也不能带 `cwd` 或命令。这类 widget 改为把命令复制到剪贴板 |
| 没有推送事件 | 桥是请求/响应，实时数据要轮询 |
| widget UI 没有 dev server | 导入是复制；改、重新导入、覆盖 |
| 版本耦合自负 | 可以假设应用自带的 Node/Electron 版本，别的没有保证 |

## 8. 十分钟试一次

```sh
mkdir -p ~/widgets/hello && cd ~/widgets/hello
```

`package.json`：

```json
{
  "name": "hello",
  "version": "1.0.0",
  "main": "main.js",
  "electerm": {
    "id": "hello",
    "name": "Hello",
    "type": "frontend",
    "submitLabel": "运行",
    "configs": [
      { "name": "who", "label": "谁", "type": "string", "required": true, "default": "world" }
    ]
  }
}
```

`main.js`：

```js
module.exports = {
  async run ({ who }) {
    return {
      message: `你好，${who}！`,
      messageType: 'success',
      details: [{ label: '时间', value: new Date().toISOString(), copy: true }]
    }
  }
}
```

导入这个文件夹，点 **Hello**，填个名字，点 **运行**。整个循环就这些 —— 和那五个例子用的是同一个
循环，只是规模不同。

- 参考：[User widget guide](https://github.com/electerm/electerm/wiki/User-widget-guide)
- 例子：[electerm/electerm-widget-examples](https://github.com/electerm/electerm-widget-examples)
- 问题与作品：[issues](https://github.com/electerm/electerm/issues)
