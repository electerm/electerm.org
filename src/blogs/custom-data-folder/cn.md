---
title: 'Electerm 自定义数据目录：用 DATA_PATH 指到任何地方'
description: 默认情况下 electerm 把书签、密码和设置放在和系统相关的目录里。只要设置 DATA_PATH 环境变量，就能把它们整体搬走——换到另一个磁盘、同步盘或随身 U 盘。默认位置、迁移步骤，以及 Windows、macOS、Linux 各自的配置方法。
date: 2026-09-24
tags: [数据目录, 备份, 便携, 同步, 技巧]
---

# Electerm 自定义数据目录：用 DATA_PATH 指到任何地方

书签、保存过的密码、快速命令、主题、触发器、同步配置——electerm 记住的所有东西都放在磁盘上的一个数据目录里。默认目录由操作系统决定，藏在用户目录深处。平时没感觉，关键时刻就碍事：`C:` 盘满了、想把数据放进 Dropbox、多台电脑共用一份配置、U 盘便携运行，或者想分开“工作”和“个人”两套配置。

解决方法只有一个环境变量：**`DATA_PATH`**。electerm 启动时如果发现它，就用它做数据根目录；没设置就回退到默认位置。机制就这一行：

```js
// src/app/lib/sqlite.js、src/app/lib/nedb.js、src/app/lib/storage-key.js
const appDataPath = process.env.DATA_PATH || resolve(appPath, 'electerm')
```

它下面的所有东西——`users/default_user/electerm.db`、`electerm_data.db`、`storage-key.enc`、会话日志——都会一起搬走。不用改注册表，不用改配置文件，不用重装。

> wiki 也有说明：[命令行使用 — DATA_PATH](https://github.com/electerm/electerm/wiki/Command-line-usage)。老讨论里看到的 `DB_PATH` 是旧名字，意思一样，现在请用 `DATA_PATH`。

## 1. 默认位置（没设 DATA_PATH 时）

| 系统 | 默认数据根目录 | 数据库实际位置 |
|---|---|---|
| macOS | `~/Library/Application Support/electerm` | `.../users/default_user/` |
| Linux | `~/.config/electerm` | `.../users/default_user/` |
| Windows（安装版） | `C:\Users\<你>\AppData\Roaming\electerm` | `...\users\default_user\` |
| Windows（便携版 `.tar.gz`） | `electerm.exe` 旁边的文件夹 | `...\electerm\users\default_user\` |

平时要备份、删库、排错，找的是每个用户自己的目录（和 [Troubleshoot wiki](https://github.com/electerm/electerm/wiki/Troubleshoot) 里写的一致）：

- macOS：`~/Library/Application Support/electerm/users/default_user`
- Linux：`~/.config/electerm/users/default_user`
- Windows：`C:\Users\<你>\AppData\Roaming\electerm\users\default_user`

里面有 `electerm.db` 和 `electerm_data.db`（v2+ 的数据库），以及密钥、日志、挂件数据。`DATA_PATH=/my/folder` 指定的是**数据根目录**，electerm 第一次启动会自动建 `/my/folder/users/default_user/...`。所以指到父目录就行，不要直接指到 `users` 里。

## 2. 什么时候值得换目录

- **系统盘满了**：把数据挪到 `D:\data\electerm` 或 `/mnt/data/electerm`。
- **云盘备份/多机同步**：指进 Dropbox、OneDrive、iCloud 云盘、群晖 Drive，多台电脑共用同一份书签（先把其它机器上的 electerm 关掉，见文末注意事项）。
- **U 盘便携**：程序和数据放一个 U 盘：`DATA_PATH=E:\electerm-data`，插上就走。
- **多套身份隔离**：`DATA_PATH=~/.electerm-work` 放工作，`DATA_PATH=~/.electerm-personal` 放生活，做两个快捷方式分别启动。
- **干净重装和排错**：用空目录启动一次，就能判断崩溃是不是旧数据引起的，还不碰原来的东西。

## 3. 搬迁旧数据（全平台通用，4 步）

1. **彻底退出 electerm**（托盘图标也要退——运行中的实例一直在写数据库）。
2. **整个数据根目录原样复制**到新位置，保持结构：
   ```bash
   # macOS 示例
   cp -r ~/Library/Application\ Support/electerm /Volumes/Data/electerm-data

   # Linux 示例
   cp -r ~/.config/electerm ~/Dropbox/electerm-data

   # Windows（PowerShell）
   xcopy "$env:APPDATA\electerm\*" "D:\data\electerm-data\" /E /I /H
   ```
3. **带上 `DATA_PATH` 启动一次**（下面分系统讲），确认书签都在。
4. 确认无误后，再删掉或改名旧目录。搬之前一定留备份——加密字段的钥匙（`storage-key.enc`）是跟着数据走的，钥匙丢了加密内容就读不出来了。

想回去很简单：不带 `DATA_PATH` 启动，就会用回默认目录。

## 4. Linux

临时试一次：

```bash
DATA_PATH=/mnt/data/electerm-data electerm
```

如果安装路径不在 `PATH` 里，写二进制完整路径。想永久生效，写进 shell 启动文件：

```bash
# ~/.bashrc 或 ~/.zshrc
export DATA_PATH="/mnt/data/electerm-data"
```

但图形界面的程序菜单不读 `.bashrc`。应用菜单图标要改 `.desktop` 文件（复制到 `~/.local/share/applications/` 再改）：

```ini
Exec=env DATA_PATH=/mnt/data/electerm-data /usr/bin/electerm %U
```

有些发行版还要跑 `update-desktop-database ~/.local/share/applications`。Flatpak/Snap 封装版可能屏蔽宿主环境变量——从终端启动验证最靠谱。

## 5. macOS

终端里临时试一次：

```bash
DATA_PATH=/Volumes/Data/electerm-data /Applications/electerm.app/Contents/MacOS/electerm
```

注意：`~/.zshrc` 里的 `export` 只对终端启动有效，**双击 Dock / Finder 启动 App 是读不到的**——macOS 会剥掉 GUI 程序的自定义环境变量。三选一：

- **永远从终端/脚本启动**，顺带还能做多套配置（最简单）。
- **Automator/快捷指令包一个启动器**：“运行 Shell 脚本”里放上面那一行，存到 `/Applications`，再拖到 Dock。
- **`launchctl setenv`**（重新登录后对整个会话生效，懂行再用）：
  ```bash
  launchctl setenv DATA_PATH /Volumes/Data/electerm-data
  # 撤销：launchctl unsetenv DATA_PATH
  ```

首次启动后去自定义目录下看到 `electerm.db` 生成了，就说明生效了。

## 6. Windows

命令提示符临时试一次：

```cmd
set DATA_PATH=D:\data\electerm-data
"C:\Program Files\electerm\electerm.exe"
```

PowerShell：

```powershell
$env:DATA_PATH = "D:\data\electerm-data"
& "C:\Program Files\electerm\electerm.exe"
```

永久生效两种做法：

1. `Win + R` → `sysdm.cpl` → 高级 → 环境变量，加**用户变量** `DATA_PATH` = `D:\data\electerm-data`。或者一条命令：
   ```cmd
   setx DATA_PATH "D:\data\electerm-data"
   ```
   （`setx` 之后要重启 electerm 和已打开的终端。）
2. 只想某个快捷方式生效：复制开始菜单的快捷方式，把目标改成：
   ```
   cmd /c "set DATA_PATH=D:\data\electerm-data && start "" "C:\Program Files\electerm\electerm.exe""
   ```

Windows 用户额外注意：

- 一定写**带盘符的绝对路径**。UNC 路径（`\\server\share`）和登录时还没连上的映射盘很容易失败，优先用本地磁盘。
- 便携版（`win-x64-portable.tar.gz`）默认数据就在 `electerm.exe` 旁边；但只要设了 `DATA_PATH`，就以它为准。
- 如果目录一直是空的，先查杀毒软件/勒索防护有没有拦 `electerm.exe` 写 Documents/OneDrive，先放行。

## 7. 验证生效

- 首次启动后，自定义目录下自动生成 `users/default_user/`（里面有 `electerm.db`、`electerm_data.db`）。
- 之前复制过来的书签、主题、历史记录都在。
- 从终端启动看一次 stderr：路径写错、建不出来会有报错，不会悄悄用回默认目录。

## 8. 30 秒注意事项

1. **先退出，一次只写一份**。不要两个 electerm 实例共用同一个 `DATA_PATH`，也不要开着两个实例让网盘两边同时同步。SQLite 受不了这个。
2. **只用绝对路径**。相对路径的解析基准不确定，GUI 启动尤其容易错。
3. **权限要够**。目录必须当前用户可读可写。“启动后是空的”头号原因就是挂载盘属主不对。
4. **先复制别剪切**。新位置稳定跑过一两次重启再删旧的。内置同步（WebDAV/gist）照常工作，只是换从新目录同步。
5. **空目录 = 全新开始**。这是特性（干净的测试配置），不是 bug。觉得“书签丢了”先查变量是不是拼错了——旧目录原封不动还在。

## 速查表

- 规则：设了 `DATA_PATH` 就用它；没设就用系统默认（`~/Library/Application Support/electerm`、`~/.config/electerm`、`%APPDATA%\electerm`）。
- 它指向**数据根目录**，`users/default_user/...` 由 electerm 自己拼。
- 临时：`DATA_PATH=/path/to/data electerm`（Linux/macOS），`$env:DATA_PATH="D:\data"; electerm.exe`（Windows）。
- 永久：shell rc / `.desktop`（Linux），包装启动器或 `launchctl setenv`（macOS），用户环境变量或专用快捷方式（Windows）。
- 迁移：退出 → 整个目录复制 → 带 `DATA_PATH` 启动 → 验证 → 删旧目录。

下一篇：[命令行使用 wiki](https://github.com/electerm/electerm/wiki/Command-line-usage) 看其它环境变量（`PROXY_*`、`NO_PROXY_SERVER`）；出问题就查 [Troubleshoot wiki](https://github.com/electerm/electerm/wiki/Troubleshoot)，默认路径都在那。
