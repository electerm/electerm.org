---
title: 'Electerm 启动时到底会打开什么：默认标签、书签，还是一整个工作区'
description: 三个设置决定了 electerm 启动时的样子——要不要打开默认本地终端、启动时打开哪些书签、以及是不是改成还原一个存好的工作区。另外讲清本地 shell 究竟从哪个目录开始，以及代码里的优先级顺序。
date: 2026-10-02
tags: [启动, 设置, 书签, 工作区, 本地终端, 效率]
videos: [electerm-open-bookmarks-on-startup, electerm-set-local-startup-directory, electerm-session-layout, electerm-workspace]
featureVideo: electerm-open-bookmarks-on-startup
bannerScript: banner.js
---

# Electerm 启动时到底会打开什么：默认标签、书签，还是一整个工作区

打开 electerm，东西已经在那儿了：一个本地终端标签，停在你的主目录里，等着你。这就是开箱即用的行为，对很多人来说刚刚好。

对其他人来说，这是每天一次的小烦。如果你打开 electerm 是为了连四台生产机，那个你从来不用的本地 shell 就是白占的一个标签和多余的一次按键。反过来，如果你打开它是为了在本机敲一条命令，那"什么都没有"更糟。

这些都能配，三个开关分布在两个地方。上面的横幅就是这个决定的一整个循环：先是默认本地标签，然后是什么都没有，最后是一个存好的工作区。

## 1. 三个开关

| 设置项 | 位置 | 默认 | 作用 |
|---|---|---|---|
| **open default tab when app start** | 设置 → setting | **开** | 当没有配置别的东西时，启动打开一个默认标签 |
| **open bookmarks on startup** | 设置 → setting | 空 | 启动时打开指定的一组书签（或一个工作区） |
| **start directory:local** | 设置 → terminal | 空 | SFTP 窗格里本地一侧的起始路径 |

其中两个在同一屏设置里，一前一后：**open bookmarks on startup** 选择器靠上，**open default tab when app start** 开关在下面那一列通用开关里。在配置文件里它们分别是 `onStartSessions` 和 `initDefaultTabOnStart`。

## 2. 启动链路

整个决定就是一个函数，短到可以直接读完：

```js
// src/client/store/load-data.js — openInitSessions()
const onStartSessions = store.config.onStartSessions

if (typeof onStartSessions === 'string' && onStartSessions) {
  store.loadWorkspace(onStartSessions)        // ① 工作区 id
} else {
  const arr = Array.isArray(onStartSessions) ? onStartSessions : []
  for (const s of arr) {
    store.onSelectBookmark(s)                 // ② 书签 id
  }
  if (!arr.length && store.config.initDefaultTabOnStart) {
    store.initFirstTab()                      // ③ 默认标签
  }
}
```

从上往下读，就是优先级：

1. **选了工作区** → 加载它。布局、窗格、会话原样回来。默认标签**不会**打开。
2. **选了书签** → 逐个打开。默认标签**不会**打开。
3. **什么都没选** → 打开默认标签，但前提是 `initDefaultTabOnStart` 开着。
4. **什么都没选、开关也关着** → 什么都不开，窗口显示空状态。

注意这里缺了什么：没有任何一处是"而且"。这些是**替代**关系，不是叠加。选了书签就压掉默认标签；选了工作区就把两者都压掉。

## 3. 关掉默认的本地终端

这是大家真正来找的那个开关。在 **设置 → setting** 里找到 **open default tab when app start**，关掉。

启动后你得到的是一扇空窗口加"无会话"面板：顶部一排按钮（**new tab**、**new bookmark**，如果配了 AI 还有 **create bookmark by AI**），中间是 electerm 的 logo，下面是你的连接历史。没有任何连接，没有 shell 被占着，你点的第一下就是你真想要的那个东西。

关于这个开关有两点值得知道：

- 它只管**默认**标签。如果你已经配了启动书签或启动工作区，这个开关就无关了——代码根本走不到它。
- 它是存在配置里的按机器设置，所以如果你用数据同步，它也会跟着同步。

## 4. 启动时打开书签

还是在 **设置 → setting**，标题为 **open bookmarks on startup** 的那一节自带两个标签：**bookmarks** 和 **Workspaces**。

**bookmarks** 标签是你书签树上的一个树形多选，可以勾——勾单个书签，或者勾一整个分组把里面的都带上。存下来的值是一个扁平的书签 id 数组，而且勾一个分组存的是它的**子项**而不是分组本身：

```js
// src/client/components/setting-panel/start-session-select.jsx
treeCheckable: true,
showCheckedStrategy: SHOW_CHILD
```

`SHOW_CHILD` 就是选择器里显示叶子的原因。实际好处是：以后重命名或挪动那个分组，启动列表照样能用，因为它指向的是书签。

这就是下面那个视频讲的东西，也是当你的启动集合是**几个彼此独立的会话**时该用的方案。如果你在意每个会话落在**哪个窗格**里，那你要的是工作区。

## 5. 启动时打开一个工作区

同一节，切到 **Workspaces** 标签，从下拉里挑一个。配置就这么多。

两个标签是**互斥**的，这是设计如此。存下来的值有两种可能的形状——书签 id 数组，或者单个工作区 id 字符串——切换标签会清空另一边，因为上面那条启动链路只能走一个分支：

```js
// src/client/components/setting-panel/start-session-select.jsx
if (key === 'bookmarks' && typeof onStartSessions === 'string') {
  onChangeStartSessions([])
} else if (key === 'workspaces' && Array.isArray(onStartSessions)) {
  onChangeStartSessions(undefined)
}
```

如果 Workspaces 标签里是空的，说明你还没存过工作区——那个操作在标签栏的布局下拉里，不在设置里。见 [Electerm 工作区](/blogs/workspace-feature/cn/)。

## 6. "默认标签"不总是一个标签

一个会让用分屏的人意外的细节：默认标签是**按窗格**创建的。

```js
// src/client/store/tab.js — initFirstTab()
const { layout } = store
const batchCount = splitConfig[layout].children || 1
for (let i = 0; i < batchCount; i++) {
  const newTab = newTerm()
  newTab.batch = i
  store.addTab(newTab)
}
```

所以如果你上次用的是 2x2 网格，开着默认标签启动 electerm 会给你**四个**本地终端，一个窗格一个——不是一个。`splitConfig` 里各布局的数量：

| 布局 | 窗格数 |
|---|---|
| `c1` 单窗格 | 1 |
| `c2` 两列 | 2 |
| `c3` 三列 | 3 |
| `r2` 两行 | 2 |
| `r3` 三行 | 3 |
| `c2x2` 网格 | 4 |
| `c1r2` 右两行 | 3 |
| `r1c2` 下两列 | 3 |

如果启动就来四个本地 shell 不是你想要的，那这是另一个理由去显式配启动会话——或者先切回 `c1`，布局以后再还原。

## 7. 本地终端究竟从哪开始

本地 shell 并不从你配置的目录开始，它从**主目录**开始，因为进程就是这么 spawn 的：

```js
// src/app/server/session-local.js
const cwd = process.env[platform === 'win32' ? 'USERPROFILE' : 'HOME']
```

要让它开在别的地方，electerm 会往 shell 里**敲一条 `cd`**，作为第一个启动脚本。三个来源能提供这个路径，按这个顺序：

```js
// src/client/components/terminal/startup-queue.js
const startFolder = reloadCwd || startDirectory || window.initFolder
```

| 来源 | 由谁设置 |
|---|---|
| `reloadCwd` | 恢复的 cwd，只在开了 **restore terminal session on reload** 时 |
| `startDirectory` | 书签自己的 **start directory:remote** 字段 |
| `window.initFolder` | `-d` / `--init-folder` 命令行参数 |

所以命令行参数才是改**默认**本地终端起始位置的那个：

```bash
electerm -d ~/code/my-project
```

关于这个参数有两个注意点，都能在代码里看到：

- **配了启动会话时它会被跳过。** 只有当启动时没有任何东西要打开、且默认标签开着时，这个参数才会被采纳：

  ```js
  // src/client/store/load-data.js
  } else if (
    options.initFolder &&
    !(store.config.onStartSessions || []).length &&
    store.config.initDefaultTabOnStart
  ) {
    window.initFolder = options.initFolder
  }
  ```

  配了启动书签或启动工作区，`-d` 就会悄悄不再作用于默认标签。

- **它是有意不限于本地的。** `-d` 当初就是作为"ssh/本地终端的初始目录"加的，代码也体现了这一点：`window.initFolder` 是进程级的值，启动队列在用之前并不检查标签是不是本地，所以同一个 `cd` 会被排给任何没有自己起始目录的标签——**包括 SSH 标签**。它只是一条 `cd`，远端不存在的路径会无害地失败、shell 继续跑。由于这个值从不被清空，之后打开的那些没有自己起始目录的标签也会继承它。

另外那个 **start directory:local** 设置是另一个值（`startDirectoryLocal`）。它被读作 **SFTP** 窗格本地一侧的起始路径——`tab.startDirectoryLocal || config.startDirectoryLocal`——同时也是 `-d` 参数写进命令行打开的会话里的值。本地终端挑 `cd` 时并不看它。

## 8. 三个会咬你的点

**配好的启动列表会静默压过一切。** 一旦配了启动书签或启动工作区，默认标签和 `-d` 就都不再起作用。如果启动 electerm 不再打开你的本地 shell，先去查那个选择器。

**工作区里被删掉的书签会开出一个空位。** 启动走的是和手动加载同一个 `loadWorkspace`，包括里面那句 `if (!item) return`——指向一个已不存在书签的条目什么都不会打开，也不提示。

**`onStartSessions` 不是一种类型。** 数组是书签，字符串是工作区。这就是选择器两个标签互相清空的原因，也是为什么手工把配置改成 `onStartSessions: ["my-workspace"]` 会得到一个**一个标签都没有**的启动，而不是一个工作区。

## 接下来看

- [Electerm 工作区](/blogs/workspace-feature/cn/) —— 启动链路里工作区那个分支到底还原了什么。
- [Electerm 会话布局](/videos/electerm-session-layout/) —— 八种布局，以及默认标签为什么会变多个。
- [自定义数据目录](/blogs/custom-data-folder/cn/) —— 这些设置落在磁盘的哪里。
- [数据同步](/blogs/data-sync/cn/) —— 启动设置在多台机器之间怎么走。
