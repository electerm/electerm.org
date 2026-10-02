---
title: 'Electerm 工作区：把一套布局和里面的会话存下来，一键还原'
description: 工作区保存的是分屏布局加上每个窗格里的书签，所以一个 2x2 的生产机网格可以一键回来——保存、加载、删除分别怎么走，什么会被记下来、什么不会，以及怎么让 electerm 启动时直接打开某个工作区。
date: 2026-10-02
tags: [工作区, 布局, 分屏, 效率, 运维, 工作流]
videos: [electerm-workspace, electerm-session-layout, electerm-open-bookmarks-on-startup, electerm-bookmark-operations]
featureVideo: electerm-workspace
bannerScript: banner.js
---

# Electerm 工作区：把一套布局和里面的会话存下来，一键还原

每天早上同一套动作：打开 electerm，切到 2x2 布局，然后按顺序把 `web-01`、`web-02`、`db-01`、`cache-01` 塞进四个窗格。这事谈不上难，也谈不上有意思——就是几次点击加一次切布局，而你已经重复了几百遍。

**工作区（Workspace）** 就是 electerm 对这件事的回答：一个具名的预设，同时记住**布局**和布局里打开的那些连接。点一下，窗口就变回那副样子。

上面的横幅就是这个功能的一整个循环：先搭出 2x2 网格，从布局下拉里存成 `prod-web`，再点 `prod-web`，看网格回来。

## 1. 工作区到底存了什么

保存工作区不会快照你的终端回滚内容，也不会保存 shell 状态。它只记两件事——布局，以及哪个书签在哪个窗格里：

```js
// src/client/store/workspace.js
getCurrentWorkspaceState () {
  const { layout, tabs } = store
  const tabsByBatch = {}
  for (const tab of tabs) {
    const batch = tab.batch || 0
    if (!tabsByBatch[batch]) tabsByBatch[batch] = []
    if (tab.srcId) {
      tabsByBatch[batch].push({
        srcId: tab.srcId,
        sshSftpSplitView: tab.sshSftpSplitView
      })
    }
  }
  return { layout, tabsByBatch }
}
```

所以一个存下来的工作区就是个小对象：

```json
{
  "id": "wk1a2b3c",
  "name": "prod-web",
  "layout": "c2x2",
  "tabsByBatch": {
    "0": [{ "srcId": "bm-web01", "sshSftpSplitView": false }],
    "1": [{ "srcId": "bm-web02", "sshSftpSplitView": false }],
    "2": [{ "srcId": "bm-db01", "sshSftpSplitView": true }],
    "3": [{ "srcId": "bm-cache01", "sshSftpSplitView": false }]
  },
  "createdAt": 1759363200000,
  "updatedAt": 1759363200000
}
```

有三个细节值得记住：

- **`layout`** 是八个布局键之一——`c1`（单窗格）、`c2`、`c3`（分列）、`r2`、`r3`（分行）、`c2x2`（网格）、`c1r2`（右两行）、`r1c2`（下两列）。跟布局菜单用的是同一套键。
- **`tabsByBatch`** 以窗格序号（`tab.batch`）为键，值是一个**数组**——所以一个窗格可以叠好几个标签页，工作区记得哪个在最前面。
- **`sshSftpSplitView`** 是按标签页存的，所以一个拆成"终端 + SFTP"的窗格会照样拆着回来。这个字段比工作区功能本身晚（`#4418`，v3.15.120）——更早存的工作区里没有这个字段，读出来就是"不拆分"。

## 2. 什么不会被存下来

上面那个 `if (tab.srcId)` 判断就是全部答案：**只有从书签打开的标签页会被记下来。**

| 标签页的来源 | 会被保存吗 |
|---|---|
| 侧边栏里的书签 | 会——按书签 id 存 |
| 快速连接 | 不会 |
| 本地终端 / "新建标签" | 不会 |
| 网页、VNC、RDP、Spice、串口标签 | 不会 |
| SFTP 标签 | 只作为书签标签的分屏另一半 |

原因在于工作区存的是**引用**，不是连接本身。书签 id 是稳定的，所以还原就是"把书签 X 打开到 2 号窗格"。快速连接没有 id 可指，也就无从还原。

实际影响是：如果你的日常配置里有本地 shell，也给它建个书签（没有 host 的书签就是一个完全合法的本地终端书签），它就能像别的连接一样进工作区。

## 3. 保存

入口不在设置里，而是在**标签栏右侧的布局下拉**。那个图标显示的是你**当前**的布局，旁边带一个下拉箭头——2x2 布局就显示 2x2 的网格图标。

1. 先设好想要的布局（同一个下拉的 **layout** 标签）。
2. 把想要的书签按想要的窗格位置打开。
3. 再打开下拉，切到 **Workspaces** 标签。
4. 点列表最上面那个整行宽的 **save** 按钮。
5. 在弹窗里选 **Save as new** 起个名字，或者选 **overwrite** 再从下拉里挑一个已有工作区。

`Save as new` 永远新建一条、带新 id。`overwrite` 会保留目标条目的 id **和名字**——这条路径下输入框里的名字是被忽略的，因为代码直接把原来的名字传了进去：

```js
// src/client/components/tabs/workspace-save-modal.jsx
const ws = workspaces.find(w => w.id === selectedId)
window.store.saveWorkspace(ws?.name || name, selectedId)
```

两条路径都会更新 `updatedAt`，所以被覆盖的工作区不会悄悄跑到"最新在前"的位置——列表顺序就是集合里的顺序，新条目追加在后面。

## 4. 加载

在列表里点一个工作区，就这样——没有确认弹窗，也没有撤销。

底层 `loadWorkspace()` 按顺序做四件事：

```js
// src/client/store/workspace.js — loadWorkspace()
store.removeTabs(() => true)          // 1. 关掉所有已打开的标签
store.setLayout(layout)               // 2. 切换分屏布局
for (const [batchStr, tabInfos] of Object.entries(tabsByBatch)) {
  const batch = parseInt(batchStr, 10)
  for (const tabInfo of tabInfos) {
    if (tabInfo.srcId) {
      window.openTabBatch = batch    // 3. 指定目标窗格
      store.onSelectBookmark(tabInfo.srcId)
      if (tabInfo.sshSftpSplitView !== undefined) {
        store.updateTab(store.activeTabId, {   // 4. 恢复分屏状态
          sshSftpSplitView: tabInfo.sshSftpSplitView
        })
      }
    }
  }
}
```

`window.openTabBatch` 就是"把新标签塞进指定窗格"的机制：`addTab` 会读它（`batch: window.openTabBatch ?? store.currentLayoutBatch`），读完就清掉。每个窗格上那个小 `+` 按钮也是靠它知道自己属于哪个窗格。

第 1 步带来两个行为，各会让人惊讶一次：

- **加载是破坏性的。** 当前打开的一切会先被关掉——包括本来不属于任何工作区的标签。如果你正打到第三条命令，点工作区之前先另存一下。
- **工作区是预设，不是快照。** 加载它永远得到同一个结果，跟你现在开着什么无关。它不会合并。

## 5. 删除

把鼠标悬在一个工作区行上，右侧会淡入一个删除图标。点它，确认 `delete?` 弹窗，条目就没了（`deleteWorkspace` → `delItem`）。删除工作区不会碰它引用的书签——只删预设。

## 6. 让 electerm 启动时直接打开某个工作区

这才是工作区真正回本的地方。在 **设置 → 通用** 靠上的位置，有一节标题是 **open bookmarks on startup**，它自己也有两个标签：

- **bookmarks** —— 一棵可勾选的树，勾上启动时要打开的书签（和分组）。
- **Workspaces** —— 单选你存过的工作区。

在那里选一个工作区，electerm 启动时就会加载它：同样的布局、同样的窗格、同样的会话，你还没碰鼠标就已经到位了。底层这个设置是一个值、两种形状——书签 id 的数组，或者工作区 id 字符串——启动代码按类型分支：

```js
// src/client/store/load-data.js — openInitSessions()
const onStartSessions = store.config.onStartSessions
if (typeof onStartSessions === 'string' && onStartSessions) {
  store.loadWorkspace(onStartSessions)   // 工作区 id
} else {
  const arr = Array.isArray(onStartSessions) ? onStartSessions : []
  for (const s of arr) store.onSelectBookmark(s)   // 书签 id
  if (!arr.length && store.config.initDefaultTabOnStart) store.initFirstTab()
}
```

选择器里那两个标签互斥，正是因为这个——切换标签会清空另一边的值。整条启动链路另有一篇： [Electerm 启动时到底会打开什么](/blogs/startup-behavior/cn/)。

## 7. 工作区存在哪，怎么跟着走

工作区是 electerm 本地数据库里一个普通的集合（`settingMap.workspaces`），和书签、主题放在一起。也就是说：

- 它包含在**数据同步**里——`webdav-sync.js` 会把 `workspaces.json` 和 `workspaces.order.json` 跟书签一起同步，所以笔记本上存的工作区会出现在台式机上。
- 它包含在**导入导出**里，也包含在同步对比弹窗里，那个弹窗把 `workspaces` 单列一行。
- 只要你保留数据目录，重装也还在——见 [迁移 Electerm 的数据目录](/blogs/custom-data-folder/cn/)。

## 8. 三个会咬你的点

**书签被删了，会留下一个安静的洞。** `onSelectBookmark` 开头就是 `if (!item) return`——工作区里指向一个已不存在书签的条目什么都不会打开，也不给任何提示，窗格就那么空着。如果一个工作区还原后少了一个窗格，先去查那个书签还在不在。

**覆盖不会改名。** 如上所述，`overwrite` 复用已存的名字。想用同一个布局换个名字，用 **Save as new**。

**工作区只管书签标签。** 它不是会话恢复功能。如果你想在重新加载后拿回**终端状态**（回滚内容、当前目录），那是另一个设置 `restoreTerminalSessionOnReload`，作用在你当时那个标签上，而不是某个存好的布局。

## 接下来看

- [Electerm 启动时到底会打开什么](/blogs/startup-behavior/cn/) —— 工作区接入的那条启动链路。
- [终端与 SFTP 分屏](/blogs/terminal-sftp-split-view/cn/) —— 工作区同时存下的每窗格分屏状态。
- [书签速连](/blogs/bookmark-quick-connect/cn/) —— 每个工作区条目都指向一个书签。
- [Electerm 数据同步](/blogs/data-sync/cn/) —— 工作区如何在多台机器之间移动。

这个功能的上游 wiki 页是 [Workspace Feature](https://github.com/electerm/electerm/wiki/Workspace-Feature)。读的时候注意一处：它"在设置里管理工作区"那一节描述了一个设置 → 工作区标签页，而当前代码里并不存在——`openWorkspaceSettings()` 在 `src/client/store/workspace.js` 里定义了但从未被调用，设置弹窗也没有 Workspaces 标签。工作区请从标签栏的布局下拉里管理。
