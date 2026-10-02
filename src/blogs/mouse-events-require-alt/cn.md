---
title: '既保留 tmux 滚轮，又拿回拖选复制：鼠标事件需要按下 Alt 键'
description: 开了 tmux 鼠标模式之后，普通拖选会失效、松手就没了。electerm 新增「鼠标事件需要按下 Alt 键」选项：滚轮照常翻页，普通拖拽本地选中并保留，按住 Option 点击才把鼠标事件交给远端程序。
date: 2026-10-02
tags: [终端, tmux, 鼠标, 选中, alt, option, xterm, 提效, 技巧]
videos: [electerm-auto-copy-on-select, electerm-usage-demo, electerm-terminal-and-sftp-split-view]
bannerScript: banner.js
---

# 既保留 tmux 滚轮，又拿回拖选复制

你打开了 tmux 的鼠标模式，因为从现在开始滚轮就是你读历史的方式。`set -g mouse on`，窗格第一次用起来如此顺手。然后你想从回滚区里复制一条命令：鼠标划过去，高亮出现了大约零点一秒，松手的瞬间就没了。`⌘C` 复制到的是上一次留在剪贴板里的东西——也就是什么都没有。把鼠标模式关掉，选中恢复正常，可滚轮又退回到一屏一屏地翻。

这个取舍没有好答案，因为两种行为想要的是同一个手势。electerm 现在有一个设置把它们拆开：**鼠标事件需要按下 Alt 键**。普通拖拽重新变成本地选中并且松手后保留，滚轮依然能翻 tmux，按住 Option 点击才把点击交还给远端程序。

## 选中为什么会消失

这不是 bug，tmux 那边也没有错。它就是鼠标模式的约定。

当应用程序申请鼠标报告时，它会发一串类似 `ESC[?1000h`（VT200 鼠标上报）的序列，从那一刻起 xterm.js 就不再把这个指针当成文本指针。在 `MouseService._syncMouseModeState` 里，整个判断就是一行：

```ts
if (this._mouseStateService.areMouseEventsActive) {
  element.classList.add(MouseEventCssClasses.ENABLE_MOUSE_EVENTS);
  this._selectionService.disable();
}
```

关键的是后半句 `_selectionService.disable()`。本地选中不是被"让位"，而是被**关掉**。于是拖拽根本不会创建选区，本该开始选中的那次 mousedown 被编码成 SGR 报告推给了 pty。松手时没有任何东西需要保留——这就是你看到的高亮一闪而过的原因。

`less`、开了鼠标模式的 `vim`、`htop`，凡是抓走指针的 TUI 都是同样的情况。tmux 只是那个"我既要滚轮，又想复制，而且想永远这样"的场景。

## 这个设置到底改了什么

一个选项，`mouseEventsRequireAlt`，在 **设置 → 终端 → 鼠标事件需要按下 Alt 键**。它**默认关闭**，所以你不主动要求，行为一点都不变：

```js
// src/app/common/config-default.js
mouseEventsRequireAlt: false,
```

打开之后，上面那个分支走了另一条路——选中保持可用，转发则以 Alt 键为条件：

| 手势 | 设置关闭（默认） | 设置打开 |
| --- | --- | --- |
| 普通拖拽 | 发给远端程序，**没有**本地选中 | **本地选中**，松手保留，`⌘C` 可复制 |
| 滚轮 | 发给远端程序 | **依然发给远端程序** |
| Option+点击 | 发给远端程序 | 发给远端程序 |
| Option+拖拽 | 发给远端程序 | 发给远端程序，无本地选中 |
| 没有程序申请鼠标事件 | 本地选中，不发送任何东西 | 完全相同——这个选项是惰性的 |

这张表里有两行值得读两遍，因为它们就是整个功能：

**滚轮不受影响。** Alt 只对点击、拖拽和移动生效。滚轮报告无论如何都会转发，所以 `tmux` 还是用你原本那两根手指翻历史。不需要为了滚动去按住任何修饰键。

**没有程序想要鼠标事件时，这个选项是惰性的。** `_syncMouseModeState` 只在 `areMouseEventsActive` 这个分支里才去看它。在普通 shell 里它什么都不做，所以你不会陷入"我明明开了 alt-click 却选不了字"的状态。

## 按住 Option，把指针交还给远端

设置打开、且远端程序开着鼠标模式时，xterm.js 会随着 Alt 按下/松开增删一个 class，而背后的 CSS 就一句声明：

```css
.xterm.enable-mouse-events {
  /* When mouse events are enabled (eg. tmux), revert to the standard pointer cursor */
  cursor: default;
}
```

于是终端用眼睛回答了它没法说出口的问题：按住 Option，光标变成箭头——指针现在归远端程序，点击会被转发；松开，你又回到选文字的状态。`AltMouseCursorController` 监听 `keydown`、`keyup` 和 `mousemove`，并在窗口 `blur` 时复位，所以按住 Alt 切走窗口也不会把箭头卡在那里。

`Alt` 键本身**不会**出现在发给远端程序的报告里。tmux 看到的就是一次普通的左键点击，和你没按修饰键时完全一样——这正是重点：你不是在重新映射任何东西，你只是在决定指针这一刻归谁。

## 每一次点击都是一条转义序列

转发出去的报告是标准 SGR 鼠标编码，按下是 `ESC[<b;x;yM`，松开是 `ESC[<b;x;ym`，`b` 里带着按键和修饰键位。这就是按住 Option 点击时真正穿过线路的东西：

```
ESC[<0;18;6M        按下，左键，第 6 行第 18 列
ESC[<0;18;6m        在同一格松开
```

滚轮一格是这样的，注意按键码里带着滚轮位（`64`）：

```
ESC[<64;10;4M        在第 4 行第 10 列向上滚
ESC[<65;10;4M        向下滚
```

electerm 能说哪些协议，取决于远端程序在 `DECSET` 序列里要了什么：

| `DECSET` | 编码 | 会发来什么 |
| --- | --- | --- |
| `ESC[?1000h` | X10 / VT200 | 按下、松开、滚轮——没有纯移动事件 |
| `ESC[?1002h` | 按键事件拖拽 | 上面那些，**加上**按住按钮时的拖拽 |
| `ESC[?1003h` | 全事件追踪 | 上面那些，**加上**悬停移动 |
| `ESC[?1006h` | SGR | 上面示例用的坐标编码，格数无上限 |

tmux 默认发的是 `1000` 加 `1006`。这就是为什么在 tmux 里普通拖拽被报成"在某格按下、某格松开"，中间没有任何 drag 事件：远端程序从来不知道中间那段移动，它只知道你在哪按下、在哪松开。

## 不用重连就生效

`mouseEventsRequireAlt` 是四个被直接写进运行中 xterm 实例的终端选项之一，而不是在启动时定死的：

```js
// src/client/components/terminal/terminal.jsx
terminalConfigProps = [
  { name: 'rightClickSelectsWord', type: 'glob' },
  { name: 'mouseEventsRequireAlt', type: 'glob' },
  { name: 'fontSize', type: 'glob_local' },
  { name: 'fontFamily', type: 'glob_local' }
]
```

`checkConfigChange` 会在下一次渲染时把新值写进 `term.options`。在一个跑着 tmux 的 SSH 会话里直接切换，立刻生效——不用重连、不用开新标签、丢不了回滚区。它同时也在数据同步的键列表里，所以这个选择会跟着你的其他设置走到别的机器上。

## 值得信任的数字

- **默认是 `false`**，electerm 的 `config-default.js` 和 xterm 自己的 `OptionsService` 都是这样。这是一个可选的行为变更，绝不会悄悄发生。
- **不需要重连**。上面那个选项列表在每次 `componentDidUpdate` 时都会检查。
- **alt 位不会被发送**。远端程序收到的是无修饰键的报告；修饰键只在本端起门禁作用，不是协议变化。
- **滚轮永远不被门禁**。它不属于 Alt 所能解锁的范围。
- **选中的启用/禁用跟的是鼠标模式，而不是单看这个设置。** 设置关闭且鼠标模式开启时，选中是真的被 `disable()` 了——指针归远端程序。
- **设置优先级**。`mouseEventsRequireAlt` 生效时，优先级高于 xterm 的 `macOptionClickForcesSelection`，两者不会为同一个手势打架。

## 值得知道的事

- **在 macOS 上，Alt 就是 Option 键**。这个设置在所有平台都存成同一个名字，物理按键在 Mac 上是 Option，其他平台是 Alt。
- **你改的是指针归谁，不是远端收到什么。** tmux 分不出 Option 点击和普通点击。如果你有依赖鼠标修饰键位的绑定，它看到的位会被剥掉——这是 xterm 的文档化行为，不是 electerm 的选择。
- **全屏 TUI 里的普通拖拽按设计依然不可用。** `vim`、`less`、`htop` 是用来操作的，不是用来读的。在它们里面要选中一段，就用 Option+拖拽。
- **它按终端会话生效**，本地 shell 也一样——但只有真的申请了鼠标事件的地方，你才会注意到它。

## 两分钟试一下

开一个会话，进 tmux，把鼠标打开：

```bash
$ tmux new -s work
$ tmux set -g mouse on
```

然后 **设置 → 终端 → 鼠标事件需要按下 Alt 键**。在输出上拖一段然后松手：选区保留，`⌘C` 能复制。滚滚轮：历史翻页，不需要按修饰键。按住 Option 点击：tmux 收到点击，同时光标变成箭头告诉你它归谁了。

整个功能就这么点。它会在下个版本发布，默认关闭——而它回答的是每一个认真对待鼠标模式的终端都被问过的那句话：怎么两个都要。