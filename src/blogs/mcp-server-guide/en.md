---
title: Electerm MCP Server - Let AI Assistants Drive Your Terminals, Bookmarks and SFTP
description: Electerm's built-in MCP Server widget exposes tabs, commands, bookmarks, SFTP and file transfer as Model Context Protocol tools at http://127.0.0.1:30837/mcp - connect Claude, scripts or any MCP client and automate your terminal fleet safely.
date: 2026-09-22
tags: [mcp, ai, automation, sftp, api, agent-mode]
bannerScript: banner.js
---

# Electerm MCP Server: Give Your AI Assistant a Terminal

Electerm already has an AI side panel that *talks* about commands. The **MCP Server widget** goes one step further: it lets an AI assistant or script *operate* electerm — list tabs, run commands and read structured results, open SSH connections, manage bookmarks, browse remote files over SFTP — through the open [Model Context Protocol](https://modelcontextprotocol.io).

Full reference: [MCP Widget Usage Guide](https://github.com/electerm/electerm/wiki/MCP-Widget-Usage-Guide).

> **Status note**: the widget is under active development. Tool names and options may change — this post tracks the implementation in `src/app/widgets/widget-mcp-server.js` and `src/client/store/mcp-handler.js`.

## 1. What you get

- A local HTTP endpoint, default `http://127.0.0.1:30837/mcp`, speaking MCP Streamable HTTP (JSON-RPC 2.0 + SSE, protocol versions `2025-11-25`, `2025-06-18`, `2024-11-05`).
- **35+ tools**, grouped and toggleable: terminal control, direct tab opening, bookmarks, bookmark groups, SFTP + trzsz/rzsz transfer, settings (opt-in).
- A real **exec channel**: `execute_electerm_command` returns `{ stdout, stderr, exitCode, durationMs, timedOut, truncated, mode }` — no terminal-buffer scraping for everyday commands.
- **Long-task support** via the MCP Tasks extension (`wait=false` → poll with `tasks/get`, stop with `tasks/cancel`).
- A **safety model** built for terminals: localhost bind, optional Bearer API key, locked-down CORS, command blacklist/whitelist, dangerous tab props stripped before they reach the renderer.

Typical uses: "check disk on 20 staging boxes and summarize", "open my prod bookmarks and tail logs", "audit remote `/etc/nginx` via SFTP and report drift", "provision 50 bookmarks from a CMDB export".

## 2. Start it in 60 seconds

1. Open Electerm → **Widgets** panel → select **MCP Server**.
2. Keep defaults (`host 127.0.0.1`, `port 30837`) or set an **API key** (recommended, see §6). Toggle `enableBookmarks / enableBookmarkGroups / enableSftp` to taste. Enable `autoRun` if you want it on every launch.
3. Click **Run**. The widget reports e.g. `MCP Server is running at http://127.0.0.1:30837/mcp`.

Smoke-test with curl:

```bash
curl -N -X POST http://127.0.0.1:30837/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize",
       "params":{"protocolVersion":"2024-11-05","capabilities":{},
       "clientInfo":{"name":"smoke","version":"1.0.0"}}}'
# → event: message
# → data: {"jsonrpc":"2.0","id":1,"result":{"serverInfo":{"name":"electerm-mcp-server","version":"1.0.0"},...}}
# Copy the `mcp-session-id` response header into follow-up calls.
```

Then list tools:

```bash
curl -N -X POST http://127.0.0.1:30837/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'mcp-session-id: <SESSION_ID>' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

Point any Streamable-HTTP-capable MCP client at the same URL. Example client config shape:

```json
{
  "mcpServers": {
    "electerm": { "url": "http://127.0.0.1:30837/mcp" }
  }
}
```

## 3. How it works (30-second architecture)

```
MCP client ──POST /mcp (SSE)──▶ Express ──▶ McpServer + Tool Registry
                                            ──▶ Electron IPC (mcp-request / mcp-response)
                                            ──▶ renderer store (mcp-handler.js) ──▶ tabs / ssh / sftp
```

The main process owns the HTTP server and tool registry; every tool call is forwarded over IPC to the renderer, which actually owns tabs, terminals and SFTP sessions. That is why the server keeps working across window reloads but fails fast with `No active window` when electerm has no window open.

## 4. Tool tour: the ones you will actually use

### Execute, don't scrape

Prefer **`execute_electerm_command`** for non-interactive work (`git status`, `docker ps`, `df -h`, `npm test`):

```json
{
  "name": "execute_electerm_command",
  "arguments": { "command": "df -h / | tail -1", "timeoutMs": 30000 }
}
// → { "stdout": "...", "stderr": "", "exitCode": 0,
//     "durationMs": 212, "timedOut": false, "mode": "exec" }
```

On SSH tabs it uses a dedicated exec channel with real exit codes; elsewhere it falls back to sentinel-based PTY capture (`mode: "pty"`, stderr merged). Pass `"mode": "pty"` explicitly for TTY-needy commands (colors, `sudo` prompts). For interactive programs (`vim`, `top`, `ssh` itself) use the send/read pair below instead.

### Terminal send / read (interactive + monitoring)

- `list_electerm_tabs`, `get_electerm_active_tab`, `switch_electerm_tab`, `close_electerm_tab`, `reload_electerm_tab`, `duplicate_electerm_tab`, `open_electerm_local_terminal`
- `send_electerm_terminal_command` (`command`, optional `tabId`, `inputOnly` for typing without Enter)
- `get_electerm_terminal_output` (`lines`, default 50), `get_electerm_terminal_selection`
- `wait_for_electerm_terminal_idle` — wait until output stops (~4 s quiet) after a send, then return the buffer
- `get_electerm_terminal_status` — lightweight non-blocking check: `running | idle | password-prompt` + last 20 lines
- `cancel_electerm_terminal_command` — sends Ctrl+C to a stuck command

### Open connections directly (no bookmark needed)

`open_electerm_tab_ssh`, `open_electerm_tab_telnet`, `open_electerm_tab_serial`, `open_electerm_tab_local` take the same schemas as bookmark creation. One call → connected tab.

### Bookmarks and groups

`list_electerm_bookmarks` (supports server-side `bookmarkKeyword` filtering), `get_electerm_bookmark`, `add_electerm_bookmark_ssh/telnet/serial/local`, `edit_electerm_bookmark`, `delete_electerm_bookmark`, `open_electerm_bookmark`, plus `list/add_electerm_bookmark_group`. Ideal for "import my inventory as bookmarks" automation.

### SFTP and file transfer

`electerm_sftp_list`, `electerm_sftp_stat`, `electerm_sftp_read_file`, `electerm_sftp_del_file_or_folder`, `electerm_sftp_upload`, `electerm_sftp_download`, plus `electerm_sftp_transfer_list/history` and `electerm_zmodem_upload/download` (trzsz `trz/tsz` or rzsz `rz/sz` — the remote side must have the chosen protocol installed).

### Settings (opt-in)

`get_electerm_settings` — disabled by default (`enableSettings: false`).

## 5. Three recipes

**Fleet health check.** Loop tabs with `list_electerm_tabs`, run `execute_electerm_command { command: "uptime; df -h / | tail -1; free -m | head -2" }` per tab, have the model summarize outliers.

**Log triage.** `open_electerm_bookmark { id }` → `send_electerm_terminal_command { command: "journalctl -p err -S today --no-pager | tail -50" }` → `wait_for_electerm_terminal_idle` → model explains the failures and drafts the fix.

**Config audit without ssh-ing by hand.** `electerm_sftp_read_file { remotePath: "/etc/nginx/nginx.conf" }` across hosts → diff → report drift. Binary or large trees go through `electerm_sftp_download` instead.

## 6. Safety model: read this before exposing anything

- **Bind + auth**: default bind is loopback only. Set an `apiKey` and clients must send `Authorization: Bearer <key>` — every `/mcp` request is rejected with `401` otherwise.
- **CORS is deny-by-default**: no wildcard `Access-Control-Allow-Origin` unless you explicitly configure an allowed origin. Browser pages can't reach the server unless you let them.
- **Command gates**: a built-in blacklist always blocks the classic foot-guns (`rm -rf /`, `rm -rf ~`, fork bombs, `dd of=/dev/...`, `mkfs`, raw-disk redirects, `sudo rm`, `curl|sh` / `wget|bash` variants). Add your own newline-separated regexes via `commandBlacklist`; set `commandWhitelist` to flip into allow-list mode.
- **Shape sanitizing**: `exec*`, `setEnv`, `runScripts` and renderer-internal props (`batch`, `status`, `pane`, …) are stripped from MCP-supplied tab args, so a crafted bookmark/tab payload can't smuggle auto-exec content or crash the layout.
- **Blast radius knobs**: `execTimeoutMs` (default 120 s, cap 600 s) and `execMaxOutputBytes` (default ~200 KB, tail-truncated) bound every exec call; `taskTtlMs` bounds background-task retention.

Still: no auth + network bind + broad whitelist = remote code execution as *you*. Keep it on loopback, use an API key, start with read-only prompts.

## 7. Long-running commands as pollable tasks

For compiles, migrations, or `npm install` on a slow box, call with `wait=false` (requires a client that declares the `io.modelcontextprotocol/tasks` extension):

```json
{ "name": "execute_electerm_command",
  "arguments": { "command": "./migrate.sh --env prod", "wait": false } }
// → { "task": { "taskId": "...", "status": "working", ... } }
```

Poll with `tasks/get`, cancel with `tasks/cancel` (kills the underlying background process and cleans remote temp log/pid/exit files). Without task support the server returns a clear error telling you to use `wait=true`.

## Where next

- Reference: [MCP Widget Usage Guide](https://github.com/electerm/electerm/wiki/MCP-Widget-Usage-Guide) · [AI Configuration Guide](https://github.com/electerm/electerm/wiki/AI-model-config-guide)
- On this site: [AI Features in Electerm](/blogs/ai-features-guide/) · [SSH in Electerm](/blogs/ssh-features-guide/) · [Introducing Electerm](/blogs/electerm-introduction/)
- Source: `src/app/widgets/widget-mcp-server.js`, `src/app/mcp/server/{mcp,streamableHttp,tasks}.js`, `src/client/store/mcp-handler.js` — PRs and tool ideas welcome.
