---
title: '大肥鱼终端水印 —— widgets.electerm.org 新收录的 widget'
description: 大肥鱼终端水印把 electerm 自带的白色字标换成鲸鱼娘立绘。两种画风、四个配置项，从 widgets.electerm.org 按固定 commit 安装并逐个文件校验 sha256。本文讲安装、配置、与自定义背景的关系，以及这张二创图的许可与署名。
date: 2026-11-16
tags: [widgets, watermark, terminal, customization, registry]
banner: https://cdn.jsdelivr.net/gh/electerm/electerm-widget-fatfish-watermark@61ae2ec00218457ebebf6bb83fcb8bf33df6be7c/assets/source-front.png
bannerScript: banner.js
---

# 大肥鱼终端水印：索引站的新 widget

electerm 会在终端文字后面画一个很淡的白色 `electerm` 字标。深色主题下它算一点安静的装饰，浅色
主题下几乎看不见。如果你想让那个位置有点别的东西，
[widgets.electerm.org](https://widgets.electerm.org/widget/fatfish-watermark/) 刚收录的这一款正好。

**Fatfish Terminal Watermark（大肥鱼终端水印）** 把这个字标换成大肥鱼 —— 从 DeepSeek 社区长出来
的蓝发鲸鱼娘。它是 widget，从 **设置 → Widgets** 安装和启停，不用改应用本身。自带两张图、四个
配置项，停掉之后不留任何残留。

<div style="display:flex;gap:18px;flex-wrap:wrap;align-items:flex-start;margin:1.5em 0">
  <div style="flex:1 1 220px;min-width:0">
    <img src="https://cdn.jsdelivr.net/gh/electerm/electerm-widget-fatfish-watermark@61ae2ec00218457ebebf6bb83fcb8bf33df6be7c/assets/source-front.png" alt="原始大肥鱼 Q 版立绘，蓝发白头饰" style="width:100%;max-width:235px">
    <div><small>原始立绘 —— 未经改动的原图（255 × 340），默认风格。</small></div>
  </div>
  <div style="flex:1 1 220px;min-width:0">
    <img src="https://cdn.jsdelivr.net/gh/electerm/electerm-widget-fatfish-watermark@61ae2ec00218457ebebf6bb83fcb8bf33df6be7c/assets/fatfish-pixel-art.png" alt="同一角色的八色像素画" style="width:100%;max-width:235px">
    <div><small>彩色像素画 —— 同一角色压成八色调色板的像素网格。</small></div>
  </div>
</div>

两张图都通过 jsDelivr 直接从 widget 自己的仓库引用，并且钉在索引站校验过的同一个 commit 上 ——
electerm.org 里没有复制任何图片文件。

## 1. 装的到底是什么

| | |
| --- | --- |
| 名称 | Fatfish Terminal Watermark |
| widget id | `fatfish-watermark` |
| 索引站里的版本 | 1.4.0 |
| 包大小 | 14 个文件，210,198 字节（约 205 KB） |
| 需要 | electerm **5.11.8** 或更新版本 |
| 许可 | 代码 MIT；立绘沿用上游 MIT，需保留署名 |

它是 **instance widget**：不会往终端里加面板或按钮，只是安静地在后台把水印画上。索引站在
`2026-11-16T00:21:05.611Z` 这次构建里收录了 **9 个 widget**，这是唯一一个改动终端画面的。

## 2. 从 Online 安装

打开 **设置 → Widgets → Online**，找到 *Fatfish Terminal Watermark*，点 **Install**。确认框会在下载
之前列出版本、作者、仓库、完整 40 位 commit 和文件数。随后 electerm 只拉这个 commit，把 14 个
文件逐个算哈希，全部与索引站公布的 digest 对上，才把目录复制进本地。

这次构建钉住的 commit 是：

```
electerm/electerm-widget-fatfish-watermark#61ae2ec00218457ebebf6bb83fcb8bf33df6be7c
```

这也是索引站 **Copy install** 按钮复制出来的串。把它贴进 **设置 → Widgets → Import**，适用于
electerm-web、离线机器，或者只是想少点几次鼠标。Import 这条路**不校验**逐文件摘要，在乎校验就用
Online tab。只写仓库名、不带 `#sha`，拉到的是默认分支，不是这个被校验过的 commit。

> **版本要看一眼。** 用户 widget 从 5.6.10 起就有，Online tab 是 5.10.0 加的。这一个用的是
> **5.11.8** 才提供的新式 widget 样式能力，老版本能装上，但启不起来。

## 3. 启动

**设置 → Widgets → Fatfish Terminal Watermark → Start widget**。水印会出现在每个终端面板的文字
后面，之后新开的窗口也会带上。想撤掉，在 *Running instances* 里点 **Stop**。

保持 **Apply on launch** 开启，electerm 会把它放进自动运行列表，每次启动都会重新应用；只想这一次
用，就把它关掉。

## 4. 四个配置项

| 配置项 | 默认 | 作用 |
| --- | --- | --- |
| Artwork style | Original PNG | 原始立绘，或八色像素版。 |
| Opacity (%) | 20 | 浓度，限制在 5–60，实际按 1.4 倍绘制（20 → 28%）。 |
| Height (%) | 78 | 相对终端面板的高度，宽度按图片比例走；限制在 30–95。 |
| Apply on launch | 开 | 通过自动运行列表，每次启动重新应用。 |

两个值得留意的细节：原始立绘最高只画到它自己的 340 px，窗口再高也不会被拉糊；像素版本来就是
510 × 680，放大才是它的用法。另外只会加载当前选中的那一张图，所以切到像素版之后注入的样式表很小 ——
约 12 KB，而不是原始版的约 201 KB。

## 5. 它不会跟你抢设置

水印只替换**默认**背景。一旦你自己设了终端背景 —— 背景图、文字水印、标签序号，或者「无背景」——
electerm 不再画自带字标，这个 widget 也跟着停手。它不会覆盖你的选择，不写
**设置 → 通用 → 自定义 CSS**，也不动任何终端背景设置。electerm 保存的只有 widget 自己的表单值和
自动运行条目。

样式属于运行中的实例：**Stop**、删掉 widget、退出应用，都会干净地撤掉，不会给下次启动留一条
孤儿规则。默认 28% 透明度、始终在文字后面，不会跟你的提示符打架。它也不依赖桌面运行时，同一份
文件在 electerm-web 里照样能用。

装之前想先比一比？仓库里带了一个
[预览页](https://github.com/electerm/electerm-widget-fatfish-watermark/blob/main/preview.html)，
在六种终端主题下并排放出两种画风和无水印基线。浏览器直接打开就行，不用安装。

## 6. 图从哪来

大肥鱼是**社区二创**，不是 DeepSeek 官方素材。原始立绘取自
[1190fasheqi/dafeiyu-pet](https://github.com/1190fasheqi/dafeiyu-pet)，采用 MIT 许可；像素版是把它
降到 51 × 68 网格、吸附到八种平涂颜色后得到的衍生图。角色署名、上游许可和必须保留的署名都写在仓库
的 [NOTICE.md](https://github.com/electerm/electerm-widget-fatfish-watermark/blob/main/NOTICE.md) 里。

这是一个非官方、非商业的二创水印。如果你要把这张图再分发 —— 主题包、截图集，或者做成产品 ——
先读那份 NOTICE：品牌与角色权利，和立绘文件的 MIT 授权是两回事。

## 7. 老规矩，widget 要信得过

widget 的代码跑在 electerm 主进程里，有完整 Node 权限：能读文件、能联网、能跑命令。索引站的逐文件
哈希只能证明「你拿到的字节就是作者在那个 commit 发布的字节」，证明不了作者可信。点确认之前，打开
弹框里的 **View source at this commit**，或者去
[仓库](https://github.com/electerm/electerm-widget-fatfish-watermark) 看一眼。

## 8. 动手试

1. 升到 **electerm 5.11.8** 或更新版本。
2. 打开 **设置 → Widgets → Online**，安装 *Fatfish Terminal Watermark*。
3. 点 **Start widget**，看看终端面板。再把 **Artwork style** 换成 *Colour pixel art*，把
   **Opacity** 调到 35，试试浓度能推到哪。
4. 到 **设置 → Terminal → Terminal background image** 设一张自定义背景图，水印会安静地让开；
   换回默认，它又回来。
5. 想换回朴素字标，在 *Running instances* 里点 **Stop**。

- widget 页面：[widgets.electerm.org/widget/fatfish-watermark](https://widgets.electerm.org/widget/fatfish-watermark/)
- 源码与素材说明：[electerm/electerm-widget-fatfish-watermark](https://github.com/electerm/electerm-widget-fatfish-watermark)
- 索引站怎么校验文件：[widgets.electerm.org：找到 widget，逐个文件校验](/blogs/widgets-registry/cn/)
- widget 基础：[用户自定义 widget：不改应用，也能加自己的面板](/blogs/user-widgets/cn/)
