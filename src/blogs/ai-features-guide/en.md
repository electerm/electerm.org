---
title: AI Features in Electerm - Command Help, Smart Bookmarks, Themes and Agent Mode
description: Tour electerm's AI integration — any OpenAI-compatible model, free ai.electerm.org API, AI command suggestions, explain-selection, AI-generated bookmarks, AI themes, and agent mode that runs tasks in the terminal.
date: 2026-09-01
tags: [ai, llm, agent-mode, bookmarks, themes, productivity]
videos: [electerm-ai-command-generation, electerm-use-ai-to-create-bookmarks, electerm-theme-settings-and-editing, electerm-quick-commands]
---

# AI Features in Electerm

Electerm treats AI as a terminal coworker, not a chatbot bolted on the side. Configure **any** LLM API once, then use it for command help, bookmark generation, theme design, and autonomous multi-step tasks — all from the AI chat side panel, without leaving your sessions.

Base docs: [AI Configuration Guide](https://github.com/electerm/electerm/wiki/AI-model-config-guide), [Create Bookmark by AI](https://github.com/electerm/electerm/wiki/Create-bookmark-by-AI), [system prompt for any LLM chat](https://github.com/electerm/electerm/wiki/system-prompt-you-can-use-in-any-LLM-chat-to-create-electerm-bookmark-data), [MCP Widget Usage Guide](https://github.com/electerm/electerm/wiki/MCP-Widget-Usage-Guide).

> **Security note**: descriptions you send to a third-party AI API travel over the internet and may be logged by the provider. Never paste real passwords, private keys, or API secrets into AI prompts unless you run a local/trusted model.

Related videos:

- [Electerm AI Command Generation](/videos/electerm-ai-command-generation/)
- [Electerm Use AI to Create Bookmarks](/videos/electerm-use-ai-to-create-bookmarks/)

## 1. Connect any model in 2 minutes

Electerm speaks three LLM wire formats, so almost every provider works:

- OpenAI **Chat Completions** (`/chat/completions`) — default
- OpenAI **Responses** (`/responses`)
- Anthropic **Messages** (`/messages`)

Built-in **presets** fill URL/model for OpenAI, DeepSeek, OpenRouter, Gemini (OpenAI-compat endpoint), Groq, Together, Mistral, xAI/Grok, Perplexity, Moonshot/Kimi, SiliconFlow, AtlasCloud and more. You only add the API key. Advanced knobs: custom auth header (`Authorization: Bearer` / `x-api-key` / ...), system role, response language, proxy (`socks5://...`), config history (last 20), test-connection button, local suggestion cache.

**Free option**: [ai.electerm.org](https://ai.electerm.org) gives electerm users a free API (`https://ai.electerm.org/api/ai` + `/chat/completions`). Sign in with GitHub → copy key → paste into electerm AI settings → Save → open the side panel. It is run by the electerm developer on a free-tier account, so heavy use may hit limits — then plug your own key from Mistral/OpenRouter/etc. ([free-llm list](https://github.com/cheahjs/free-llm-api-resources)).

Full field reference: [AI Configuration Guide](https://github.com/electerm/electerm/wiki/AI-model-config-guide).

## 2. AI-assisted commands

The daily driver:

- **Generate**: describe the goal in plain language ("find the 10 largest docker images and prune dangling ones, explain each flag") → paste-ready command with a short explanation.
- **Explain selection**: highlight cryptic output or a one-liner from Stack Overflow → AI explains what it does before you run it.
- **Fix errors**: paste the failing command + stderr → corrected version.
- **Script writing**: multi-line bash/python snippets with markdown formatting, honoring your configured system role ("terminal expert, brief explanations, markdown").

Suggestions are cached locally to save API calls. Set response **language** once and every answer follows it.

## 3. AI-driven bookmark creation

Bookmarks have ~40 fields (tunnels, hops, X11, encodings, run-scripts...). Instead of filling forms, describe the machine:

```text
SSH to 192.168.0.10 as admin, enable X11, forward remote port 5900
to local 5900, start in /home/admin, use the ssh-agent, and add a
tunnel 127.0.0.1:8080 → remote 10.0.0.5:80.
```

Click **Create Bookmark by AI** → Generate → review the pretty-printed JSON (edit / copy / download) → Confirm. Arrays create **multiple bookmarks in batch**. Prefer ChatGPT/Claude's website? Use the [portable system prompt](https://github.com/electerm/electerm/wiki/system-prompt-you-can-use-in-any-LLM-chat-to-create-electerm-bookmark-data) or the hosted [bookmark generator](https://ai.electerm.org/bookmark-generator/) — same schema, no install.

Video: [Electerm Use AI to Create Bookmarks](/videos/electerm-use-ai-to-create-bookmarks/). Guide: [Create Bookmark by AI](https://github.com/electerm/electerm/wiki/Create-bookmark-by-AI).

## 4. AI theme customization

Describe a vibe — "solarized dark with amber accents, high-contrast cursor, 14px JetBrains Mono" — and let the model draft the theme JSON, then fine-tune in the visual theme editor. Import community themes from the iTerm2 collection or publish yours at [theme.electerm.org](https://theme.electerm.org) (live preview + AI creation built in).

Video: [Electerm Theme Settings and Editing](/videos/electerm-theme-settings-and-editing/).

## 5. Agent mode: AI that runs tasks in the terminal

Chat answers text; **agent mode acts**. Give a goal ("upgrade node 18→20 on staging-web-02, run tests, roll back on failure"), and the agent plans shell steps, runs them in the terminal, reads output, and continues — with your approval gates. Combined with electerm's batch execution, one goal can fan out across many hosts. Start with read-only recon tasks, then graduate to mutating runs once you trust the loop.

## 6. AI assistant + MCP widgets

The side-panel **AI assistant** stays docked next to your sessions: ask follow-ups while a long command runs, summarize logs, draft commit messages from `git diff`. Power users can extend it via the **MCP (Model Context Protocol) widget** — expose external tools and context sources to the assistant. Setup: [MCP Widget Usage Guide](https://github.com/electerm/electerm/wiki/MCP-Widget-Usage-Guide).

## Practical setup recipe

1. AI settings → Preset = your provider → paste key → Test Connection → Save.
2. System role: `Terminal expert, provide commands for different OS, explain usage briefly, use markdown format`.
3. Language = your language. Proxy only if your network needs it.
4. Pin the AI panel; try: generate → explain-selection → bookmark-from-text → theme draft → agent recon task.
5. Clear the suggestion cache if answers go stale.

## Where next

- Back to basics: [Introducing Electerm](/blogs/electerm-introduction/)
- Connections: [SSH in Electerm](/blogs/ssh-features-guide/)
- Setup: [Install Electerm everywhere](/blogs/install-electerm/)
- Reference: [AI Configuration Guide](https://github.com/electerm/electerm/wiki/AI-model-config-guide) · [Quick Command Templates](https://github.com/electerm/electerm/wiki/quick-command-templates) · [Batch Operation](https://github.com/electerm/electerm/wiki/batch-operation)
