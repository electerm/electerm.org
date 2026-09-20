---
title: 'electerm 主题编辑器：设计一个主题，实时看它变色'
description: theme.electerm.org 是免费的 electerm 主题在线编辑器——33 个颜色、跑着真实 electerm 的实时预览、一句话生成配色的 AI、GitHub 登录云端保存，以及一个一键复制即可用的社区主题广场。
date: 2026-09-21
tags: [主题, 编辑器, 配色, 自定义, ai, 分享]
videos: [electerm-theme-settings-and-editing, electerm-usage-demo]
bannerScript: banner.js
---

# electerm 主题编辑器：设计一个主题，实时看它变色

改 electerm 的样子，一直以来都意味着改一个列表。33 行 `key=value`，一个色值写错终端就没法看，而唯一的验证方式是把主题存下来、应用上去、然后眯着眼睛盯结果。

[**theme.electerm.org**](https://theme.electerm.org) 把这条回路改短了。它是一个跑在浏览器标签页里的免费主题编辑器：调颜色，看着一个真实的 electerm 随你调色而重绘，然后把主题存到云端、发布到广场上让别人一键复制。

它离应用也只有一步——electerm 的主题设置表单右上角就有一个 `https://theme.electerm.org` 链接。

功能视频：[electerm 主题设置和编辑](/videos/electerm-theme-settings-and-editing/)。

## 它到底是什么

|  |  |
|---|---|
| **地址** | [theme.electerm.org](https://theme.electerm.org) |
| **费用** | 免费 |
| **登录** | GitHub OAuth——只有用 AI、保存、发布、点赞时才需要 |
| **不登录能设计吗** | 能：编辑器和实时预览都是开放的 |
| **可编辑颜色** | 33 个——12 个界面颜色，21 个终端颜色 |
| **预览** | [demo.electerm.org](https://demo.electerm.org) 上跑着的真实 electerm，实时驱动 |
| **保存** | 每个账号最多 10 个主题，可发布到公开广场 |

试用不需要账号。打开页面，随便拖颜色，看预览。想留下点什么的时候再登录。

## 33 个颜色，两组

编辑器的分组方式和 electerm 本身一致。

**界面颜色——12 个。** `main`、`main-dark`、`main-light`、`text`、`text-light`、`text-dark`、`text-disabled`，以及五个强调色 `primary`、`info`、`success`、`error`、`warn`。它们负责所有框架部分：标签栏、会话控制栏、页脚、对话框、按钮、状态点。

**终端颜色——21 个。** 终端的背景色、前景色、光标色；选中背景色；以及十六个 ANSI 槽位，普通与高亮各一套——`black`、`red`、`green`、`yellow`、`blue`、`magenta`、`cyan`、`white` 和对应的 `bright*`。`ls --color`、`git diff`、`htop` 和所有 shell 提示符用的就是这些颜色。

两种改法，在同一个面板里：

- **颜色选择器**——每个键一个原生取色框，下面标着键名。适合"这个红色不对"这种快速修。
- **文本编辑器**——就是 electerm 自己那套 `key=value` 列表，带 `terminal:` 前缀，有语法高亮。适合"把所有强调色整体往暖里挪两格"。

它们是同一个主题的两个视图：改色块，文本跟着变；改文本，色块跟着动。导入一个 `.txt`，两边一起填满。

## 预览是真的应用，不是示意图

这是这个编辑器值得用的原因。预览面板是 [demo.electerm.org](https://demo.electerm.org) 的一个 iframe——一个真正的 electerm 客户端——编辑器通过 `postMessage` 把调色板交给正在运行的应用 store。应用把它注册成一个主题并切换过去，和你选一个内置主题完全一样。

所以你看到的不是 electerm 的近似图，而是 electerm 本身，带着你的颜色，包括示意图一定会画错的那些部分：标签上的计数胶囊、每个会话自己的控制栏、页脚、块状光标，以及 ANSI 配色在你*那块*背景上读起来是什么样。

预览里不对的，装到应用里也一样不对。

## 或者描述一句，让 AI 出第一稿

编辑器里有一个 **AI** 页签。写一句话——*"沙漠上的温暖日落，深色背景配橙色和粉色点缀"*——它返回一套完整的配色：33 个键，全部填好。

生成结果不是原样丢进来的。它会先被解析，再按 schema 归一化：缺失的键用默认值补齐，非法的色值被替换，多余的键被丢掉，名字也会截断。就算模型返回的 JSON 外面裹了一层代码围栏、或者带了多余的逗号，出来的仍然是一个可用主题，之后你像改别的主题一样改它。

两点如实说明。它需要你先登录。另外，模型跑在 electerm 其他 AI 功能用的同一个免费入口 [ai.electerm.org](https://ai.electerm.org) 上——所以它是初稿，不是设计系统。用来破开空白页很好，最后那 10% 还得自己来。

## 保存、分享，和那个广场

用 GitHub 登录之后，编辑器会长出 **Save** 和 **Share to Board** 两个按钮。主题默认是私有的，发布之后才会出现在[广场](https://theme.electerm.org/themes/)上，带着你的 GitHub 名字和头像。每个账号最多 10 个主题。

广场是大家做出来的主题的画廊，可以按最新或最受欢迎排序。每张卡片上有一条主题配色的色带，所以扫一眼就能知道哪些是你想要的。点进去有：

- **实时预览**——同一个真实 electerm iframe，跑的就是这个主题。
- **Copy config**——把整个主题按 electerm 自己的文本格式复制到剪贴板。
- **下载**——同一个东西，存成 `.txt`。
- **编辑**——把主题载进编辑器继续改，大多数好主题就是这么来的。
- **点赞**，以及**分享**到 Twitter 或 Facebook。

electerm 内置的 310 套经典主题（iTerm 那一套）也在里面，所以这个广场既是画廊，也是一排参考书。

## 怎么装进 electerm

三条路，都很快：

1. **复制配置 → 粘贴。** 在编辑器里或主题页上点 **Copy Config**。在 electerm 里打开**设置 → 主题**，新增或编辑一个主题，切到**文本编辑器**页签，粘贴进去。它会先校验，通过了才让你保存。
2. **下载 → 导入。** 在主题页点**下载**拿到 `.txt`，然后在 electerm 的主题表单里用 **Import from file**。名字会一起带过来。
3. **从应用里跳过去改。** 主题表单直接链到编辑器，应用 → 编辑器 → 回来，一个来回。

走第 1 条路时有个细节值得知道：站点复制出来的文本第一行是 `themeName=...`，而 electerm 的文本编辑器会逐键对照它认识的那份列表做校验——`themeName` 不在列表里，所以它会报一个"不支持的属性"。从第二行开始粘贴，然后把名字填进主题名输入框。（第 2 条路没有这个问题。）

## 两件会让你意外的事

- **electerm 会把终端背景绑到界面的 `main` 色上。** 在应用里保存主题时，它会强制让 `terminal:background` 等于 `main`。所以如果你在站点上把终端背景设成一个深色、界面背景设成另一个浅色，应用会把它们压平成一个。要么就按同一个颜色设计，要么接受它们会变得一样。
- **两边的名字长度上限不同。** 站点允许 50 个字符，electerm 的主题名输入框限制 30 个。名字起短一点就不会被截断。

## 一句话总结

- **[theme.electerm.org](https://theme.electerm.org)** 是免费的 electerm 主题在线编辑器——33 个颜色、实时预览、云端保存、公开广场。
- **预览是真的客户端**，不是示意图：一个通过 `postMessage` 驱动的活的 electerm。
- **AI 页签**能把一句话变成一套完整、校验过的配色——是初稿，不是成品主题。
- **用 GitHub 登录**才能保存（每账号 10 个）和发布；不登录也能浏览和复制。
- **Copy Config → 粘贴进 electerm 的主题文本编辑器**，跳过 `themeName=` 那一行；或者下载 `.txt` 用 Import from file。
- **先逛广场**，如果你不想从零开始设计——复制别人的主题，改掉你不喜欢的地方。

如果还没动过 electerm 的主题设置，可以从 [electerm 介绍](/blogs/electerm-introduction/cn/)看起；想深入了解 AI 那部分，见 [electerm 的 AI 功能](/blogs/ai-features-guide/cn/)。
