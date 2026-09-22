---
title: Electerm MCP Server - 让 AI 助手直接操作你的终端、书签和 SFTP
description: Electerm 内置 MCP Server 组件，把标签页、命令执行、书签、SFTP 与文件传输封装成 Model Context Protocol 工具，默认监听 http://127.0.0.1:30837/mcp，用 Claude、脚本或任何 MCP 客户端都能安全地自动化你的终端舰队。
date: 2026-09-22
tags: [mcp, ai, automation, sftp, api, agent-mode]
bannerScript: banner.js
---

# Electerm MCP Server：给 AI 助手一个终端

Electerm 的 AI 侧边栏已经能 *聊* 命令，而 **MCP Server 组件** 更进一步：让 AI 助手或脚本 *操作* electerm——列出标签页、执行命令并拿结构化结果、打开 SSH 连接、管理书签、通过 SFTP 浏览远端文件，全部走开放的 [Model Context Protocol](https://modelcontextprotocol.io)。

完整参数手册：[MCP Widget Usage Guide](https://github.com/electerm/electerm/wiki/MCP-Widget-Usage-Guide)。

> **状态提醒**：该组件仍在积极开发中，工具名与选项可能变化。本文对照 `src/app/widgets/widget-mcp-server.js` 与 `src/client/store/mcp-handler.js` 的实现编写。

## 1. 你能得到什么

- 本地 HTTP 入口，默认 `http://127.0.0.1:30837/mcp`，讲 MCP Streamable HTTP（JSON-RPC 2.0 + SSE，支持 `2025-11-25` / `2025-06-18` / `2024-11-05`）。
- **35+ 工具**，按组开关：终端控制、直接开标签页、书签、书签分组、SFTP + trzsz/rzsz 传输、设置（默认关闭，需手动启用）。
- 真正的 **exec 通道**：`execute_electerm_command` 直接返回 `{ stdout, stderr, exitCode, durationMs, timedOut, truncated, mode }`，日常命令不再需要解析终端滚动区。
- **长任务支持**（MCP Tasks 扩展）：`wait=false` → 用 `tasks/get` 轮询、用 `tasks/cancel` 终止。
- 为终端而生的 **安全模型**：默认只绑本地回环、可选 Bearer API Key、默认拒绝跨域、命令黑白名单、危险 tab 字段先剥离再送渲染进程。

典型用法：“把 20 台 staging 的磁盘查一遍并总结”、“打开 prod 书签 tail 日志”、“用 SFTP 审计远端 `/etc/nginx` 是否漂移”、“从 CMDB 导出批量建 50 个书签”。

## 2. 60 秒启动

1. 打开 Electerm → **Widgets（组件）**面板 → 选择 **MCP Server**。
2. 保持默认（`host 127.0.0.1`，`port 30837`），建议设置 **API key**（见第 6 节）。按需开关 `enableBookmarks / enableBookmarkGroups / enableSftp`，想开机自启就打开 `autoRun`。
3. 点 **Run**，看到 `MCP Server is running at http://127.0.0.1:30837/mcp` 即成功。

用 curl 烟测一下：

```bash
curl -N -X POST http://127.0.0.1:30837/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize",
       "params":{"protocolVersion":"2024-11-05","capabilities":{},
       "clientInfo":{"name":"smoke","version":"1.0.0"}}}'
# → event: message
# → data: {"jsonrpc":"2.0","id":1,"result":{"serverInfo":{"name":"electerm-mcp-server","version":"1.0.0"},...}}
# 把响应头里的 `mcp-session-id` 带到后续请求。
```

再列出工具：

```bash
curl -N -X POST http://127.0.0.1:30837/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'mcp-session-id: <SESSION_ID>' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

任何支持 Streamable HTTP 的 MCP 客户端指向同一 URL 即可，配置形如：

```json
{
  "mcpServers": {
    "electerm": { "url": "http://127.0.0.1:30837/mcp" }
  }
}
```

## 3. 原理（30 秒版）

```
MCP 客户端 ──POST /mcp (SSE)──▶ Express ──▶ McpServer + 工具注册表
                                            ──▶ Electron IPC（mcp-request / mcp-response）
                                            ──▶ 渲染进程 store（mcp-handler.js）──▶ 标签页 / SSH / SFTP
```

HTTP 服务与工具注册表在主进程，真正的标签页、终端、SFTP 会话在渲染进程，每次工具调用都经 IPC 转发。所以没有窗口时会快速失败（`No active window`），窗口重载不影响服务端。

## 4. 工具巡礼：常用的就这些

### 执行优先，别去刮滚动区

非交互命令（`git status`、`docker ps`、`df -h`、`npm test`）优先用 **`execute_electerm_command`**：

```json
{
  "name": "execute_electerm_command",
  "arguments": { "command": "df -h / | tail -1", "timeoutMs": 30000 }
}
// → { "stdout": "...", "stderr": "", "exitCode": 0,
//     "durationMs": 212, "timedOut": false, "mode": "exec" }
```

SSH 标签页走专用 exec 通道，有真实退出码；其他标签页降级为哨兵 PTY 捕获（`mode: "pty"`，stderr 合并）。需要 TTY 的命令（颜色、`sudo` 密码提示）显式传 `"mode": "pty"`。`vim` / `top` / `ssh` 这类交互程序则用下面的 send/read 组合。

### 终端发送 / 读取（交互与监控）

- `list_electerm_tabs`、`get_electerm_active_tab`、`switch_electerm_tab`、`close_electerm_tab`、`reload_electerm_tab`、`duplicate_electerm_tab`、`open_electerm_local_terminal`
- `send_electerm_terminal_command`（`command`，可选 `tabId`，`inputOnly` 表示只输入不回车）
- `get_electerm_terminal_output`（`lines`，默认 50）、`get_electerm_terminal_selection`
- `wait_for_electerm_terminal_idle`——发送命令后等输出静默（约 4 秒无数据）再返回缓冲区
- `get_electerm_terminal_status`——轻量非阻塞检查：`running | idle | password-prompt` + 最后 20 行
- `cancel_electerm_terminal_command`——给卡住的命令发 Ctrl+C

### 直连开标签页（不用先建书签）

`open_electerm_tab_ssh`、`open_electerm_tab_telnet`、`open_electerm_tab_serial`、`open_electerm_tab_local` 与建书签同构，一次调用即连上。

### 书签与分组

`list_electerm_bookmarks`（支持服务端 `bookmarkKeyword` 过滤）、`get_electerm_bookmark`、`add_electerm_bookmark_ssh/telnet/serial/local`、`edit_electerm_bookmark`、`delete_electerm_bookmark`、`open_electerm_bookmark`，以及 `list/add_electerm_bookmark_group`。“把资产清单导入成书签”正好用它。

### SFTP 与文件传输

`electerm_sftp_list`、`electerm_sftp_stat`、`electerm_sftp_read_file`、`electerm_sftp_del_file_or_folder`、`electerm_sftp_upload`、`electerm_sftp_download`，以及 `electerm_sftp_transfer_list/history` 和 `electerm_zmodem_upload/download`（trzsz 的 `trz/tsz` 或 rzsz 的 `rz/sz`，远端必须装好对应协议）。

### 设置（默认关闭）

`get_electerm_settings`——`enableSettings: false` 时不可用，需手动开启。

## 5. 三个实战配方

**集群巡检。** `list_electerm_tabs` 枚举标签页，逐个 `execute_electerm_command { command: "uptime; df -h / | tail -1; free -m | head -2" }`，让模型汇总异常机器。

**日志排障。** `open_electerm_bookmark { id }` → `send_electerm_terminal_command { command: "journalctl -p err -S today --no-pager | tail -50" }` → `wait_for_electerm_terminal_idle` → 模型解释报错并起草修复命令。

**免手动 ssh 的配置审计。** 对多台机器 `electerm_sftp_read_file { remotePath: "/etc/nginx/nginx.conf" }` → diff → 输出漂移报告。大文件或目录改走 `electerm_sftp_download`。

## 6. 安全模型：暴露到网络前必读

- **绑定 + 鉴权**：默认只绑回环。设置 `apiKey` 后客户端必须带 `Authorization: Bearer <key>`，否则每个 `/mcp` 请求都 `401`。
- **CORS 默认拒绝**：不配允许来源就没有通配 `Access-Control-Allow-Origin`，网页默认够不着。
- **命令门禁**：内置黑名单常开，拦经典作死操作（`rm -rf /`、`rm -rf ~`、fork 炸弹、`dd of=/dev/...`、`mkfs`、裸盘重定向、`sudo rm`、`curl|sh` / `wget|bash` 变体）。再用 `commandBlacklist` 加自己的正则（每行一条）；填了 `commandWhitelist` 即切换为白名单模式。
- **形状清洗**：`exec*`、`setEnv`、`runScripts` 与渲染进程内部字段（`batch`、`status`、`pane` 等）在进渲染进程前会被剥掉，伪造的书签/标签载荷既不能夹带自执行，也撞不坏布局。
- **爆炸半径上限**：`execTimeoutMs`（默认 120 秒，上限 600 秒）与 `execMaxOutputBytes`（默认约 200 KB，超长截尾）约束每次执行；`taskTtlMs` 约束后台任务保留时长。

但仍要强调：无鉴权 + 绑公网 + 宽白名单 = 以 *你的身份* 远程执行代码。请保持回环绑定、用上 API key，先从只读提示词玩起。

## 7. 长命令做成可轮询任务

编译、迁移、慢机器上的 `npm install`，调用时加 `wait=false`（客户端须声明 `io.modelcontextprotocol/tasks` 扩展）：

```json
{ "name": "execute_electerm_command",
  "arguments": { "command": "./migrate.sh --env prod", "wait": false } }
// → { "task": { "taskId": "...", "status": "working", ... } }
```

用 `tasks/get` 轮询、`tasks/cancel` 终止（会杀掉底层后台进程并清理远端临时 log/pid/exit 文件）。客户端不支持任务时服务端会明确报错，提示改用 `wait=true`。

## 下一步

- 手册：[MCP Widget Usage Guide](https://github.com/electerm/electerm/wiki/MCP-Widget-Usage-Guide) · [AI 模型配置指南](https://github.com/electerm/electerm/wiki/AI-model-config-guide)
- 本站：[Electerm AI 功能全览](/blogs/ai-features-guide/) · [SSH 全攻略](/blogs/ssh-features-guide/) · [Electerm 介绍](/blogs/electerm-introduction/)
- 源码：`src/app/widgets/widget-mcp-server.js`、`src/app/mcp/server/{mcp,streamableHttp,tasks}.js`、`src/client/store/mcp-handler.js`——欢迎提 PR 与新工具想法。
