---
title: '让 electerm 在终端里直接运行——新增的 electerm 命令，装进 PATH'
description: 新增的设置可以把 electerm 命令装进 PATH，Windows、macOS、Linux 都支持。本文说明各平台实际写了什么、为什么 macOS 用的是一个小包装脚本、怎么手动安装，以及怎么撤销。
date: 2026-10-05
tags: [命令行, PATH, macos, windows, linux, 效率, 技巧]
---

# 让 electerm 在终端里直接运行——新增的 electerm 命令，装进 PATH

你开着一个终端，想连某台机器。electerm 就在 `/Applications` 里，或者在 `%LOCALAPPDATA%` 下面，切个窗口再点几下就能用——但每次你都会想：这本来就该是一条命令。

现在它就是了。**设置 → 通用 → Install electerm command to PATH → Install。**

```sh
electerm                      # 打开应用
electerm user@example.com     # 打开应用并连接
```

功能本身就这么简单。下面要说的是「把一条命令加进 PATH」在每个平台上到底意味着什么——三种不同的机制，其中一个大概和你想的不一样。

## 它实际写了什么

三个平台，三种完全不同的机制。这不是猜的：设置里那一行会告诉你它用了哪个目录。

| 平台 | 创建什么 | 位置 |
|---|---|---|
| **macOS** | 一个很小的**包装脚本** —— 刻意*不用*符号链接 | `/usr/local/bin`、`/opt/homebrew/bin`、`~/.local/bin`、`~/bin` 中第一个可写的 |
| **Linux** | 名为 `electerm` 的**符号链接** | `/usr/local/bin`、`~/.local/bin`、`~/bin` 中第一个可写的 |
| **Linux（AppImage）** | 指向**你启动的那个 `.AppImage` 文件**的符号链接 | 同上 |
| **Windows** | **完全不创建文件** —— 把包含 `electerm.exe` 的目录追加到*用户* `PATH` | `HKCU\Environment` |

几个实际用起来会碰到的细节：

- **如果这些目录都不存在或不可写，electerm 会创建 `~/.local/bin`**，并提示你它还不在 `PATH` 里，方便你自己加上。
- **AppImage 那种情况不能忽略。** AppImage 运行在临时的 squashfs 挂载点上（`/tmp/.mount_electermXXXX`）。指向那里的符号链接只能生效一次。所以 electerm 链接的是 `$APPIMAGE`——你真正双击的那个文件。
- **在 Windows 上不写任何启动文件**，因为没什么可写的：安装程序已经把 `electerm.exe` 放在某处了，缺的只是那个目录不在 `PATH` 上。改*用户* `PATH` 不需要管理员权限，而且 electerm 用的是 `[Environment]::SetEnvironmentVariable` 而不是 `setx`——`setx` 会在 1024 字符处悄悄截断 `PATH`，还会展开 `%VAR%` 引用，用这种方式丢掉几条路径实在很不划算。
- **它是幂等的，可以放心重复执行。** 再次安装会以原子方式重写该条目（先写临时文件，再 rename 覆盖目标），因此不会出现命令短暂消失的时刻。electerm 只会替换它自己创建的条目。

## 为什么 macOS 用的是脚本

在 macOS 上，这个条目是一个很小的 shell 脚本，而不是符号链接：

```sh
#!/bin/sh
# electerm command wrapper
# launch electerm through its real path so it can find its Helper apps
unset ELECTRON_RUN_AS_NODE
exec "/Applications/electerm.app/Contents/MacOS/electerm" "$@"
```

两个原因，都是为了让应用能被正确启动，而不只是能被找到：

- **Electron 通过自身可执行文件的路径来定位 Helper 进程。** 所以这条命令必须直接执行 bundle 内部那个真实路径的二进制文件，也就是 `exec` 那一行做的事。VS Code 用的也是同样的形式：`/usr/local/bin/code` 是脚本，不是符号链接。
- **`unset` 那一行会清掉 `ELECTRON_RUN_AS_NODE`。** 从其他 Electron 应用里启动的终端——比如 IDE 的集成终端——会导出这个变量，而看到它的 Electron 二进制会启动 Node 运行时而不是应用本身。清掉它，意味着无论你从哪个终端运行 `electerm`，行为都一致。

如果你想自己手动装，就用同一个脚本：

```sh
sudo tee /usr/local/bin/electerm >/dev/null <<'EOF'
#!/bin/sh
unset ELECTRON_RUN_AS_NODE
exec "/Applications/electerm.app/Contents/MacOS/electerm" "$@"
EOF
sudo chmod 755 /usr/local/bin/electerm
```

## Installed、Outdated、Blocked

设置里那一行会告诉你当前状态，每种状态都有确切含义：

| 标签 | 含义 |
|---|---|
| **Installed** | 命令已存在，并指向当前应用。 |
| **Outdated** | 命令存在，但指向别处——你移动或重装了 electerm。再点一次 Install 就会重新指向。 |
| **Not installed** | 该路径下还没有东西。 |
| **Blocked** | 该路径被占用，且不是 electerm 创建的。electerm 不会动它。 |

**Blocked** 是其中最值得说的一种，而且是刻意设计的。`/usr/local/bin` 里一个名叫 `electerm`、但不是 electerm 写的文件，是你的文件，不是我们的。直接覆盖会是很讨厌的意外，所以 electerm 会停下来、原样不动。遇到 Blocked，请自己把那个条目删掉再装一次。

**Uninstall** 只会移除 electerm 创建的条目。在 Windows 上它会把那个目录从用户 `PATH` 里拿掉。

## 只有打包版本才能安装

如果你是从源码运行 electerm，这一行会显示一段说明而不是按钮。这不是功能缺失：在未打包的运行环境里，`process.execPath` 是 Electron 二进制而不是 electerm，装上去只会让你的 `electerm` 命令指向裸 Electron，把你本想创建的那条命令弄坏。这个设置会拒绝这么做。

Windows 还有一个细节：**已经打开的**终端会保留旧的 `PATH`，直到你新开一个。electerm 会广播环境变更，但并非所有 shell 都会响应。

## 接下来看什么

- [如何安装并配置 electerm](/blogs/install-electerm/cn/)——如果你还没装应用，这篇覆盖所有系统，包括 Android 和 iOS。
- [Command line usage](https://github.com/electerm/electerm/wiki/Command-line-usage)——命令有了之后能用的一切：连接主机、`-tp` 指定 telnet/RDP/VNC/serial、批量操作文件、`DATA_PATH`。
- [Install electerm command](https://github.com/electerm/electerm/wiki/Install-electerm-command)——这个功能的 wiki 页面，包含三个平台的手动命令。
