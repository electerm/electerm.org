---
title: Electerm AI 功能 — 命令辅助、智能书签、主题与 Agent 模式
description: 逛一遍 electerm 的 AI 集成——任意 OpenAI 兼容模型、免费 ai.electerm.org 接口、AI 命令建议、选中解释、AI 生成书签、AI 主题，以及在终端里直接干活的 agent 模式。
date: 2026-09-01
tags: [ai, 大模型, agent模式, 书签, 主题, 提效]
videos: [electerm-ai-command-generation, electerm-use-ai-to-create-bookmarks, electerm-theme-settings-and-editing, electerm-quick-commands]
---

# Electerm AI 功能

Electerm 把 AI 当终端搭子，而不是侧边栏挂个聊天框。配一次**任意** LLM 接口，就能在 AI 聊天侧栏里做命令辅助、书签生成、主题设计，乃至自主多步任务——全程不离开你的会话。

基础文档：[AI Configuration Guide](https://github.com/electerm/electerm/wiki/AI-model-config-guide)、[Create Bookmark by AI](https://github.com/electerm/electerm/wiki/Create-bookmark-by-AI)、[任意 LLM 对话可用的 system prompt](https://github.com/electerm/electerm/wiki/system-prompt-you-can-use-in-any-LLM-chat-to-create-electerm-bookmark-data)、[MCP Widget Usage Guide](https://github.com/electerm/electerm/wiki/MCP-Widget-Usage-Guide)。

> **安全提醒**：发给第三方 AI 接口的描述会经过互联网，可能被服务商记录。别在 prompt 里粘真实密码、私钥、API 密钥，除非你用的是本地/可信模型。

相关视频：

- [Electerm AI 命令生成](/videos/electerm-ai-command-generation/)
- [Electerm 用 AI 创建书签](/videos/electerm-use-ai-to-create-bookmarks/)

## 1. 两分钟接任意模型

electerm 会三种 LLM 通信格式，几乎所有服务商开箱即用：

- OpenAI **Chat Completions**（`/chat/completions`）——默认
- OpenAI **Responses**（`/responses`）
- Anthropic **Messages**（`/messages`）

内置**预设**一键填好 OpenAI、DeepSeek、OpenRouter、Gemini（OpenAI 兼容端点）、Groq、Together、Mistral、xAI/Grok、Perplexity、Moonshot/Kimi、SiliconFlow、AtlasCloud 等的 URL/模型，你只填 API key。高级项：自定义认证头（`Authorization: Bearer` / `x-api-key` / …）、system role、回答语言、代理（`socks5://…`）、配置历史（最近 20 条）、测试连接、本地建议缓存。

**免费选择**：[ai.electerm.org](https://ai.electerm.org) 给 electerm 用户提供免费 API（`https://ai.electerm.org/api/ai` + `/chat/completions`）。GitHub 登录 → 复制 key → 粘进 electerm AI 设置 → 保存 → 打开侧栏即用。这是开发者用免费额度自费维护的，用量大了可能限流——那就去 Mistral/OpenRouter 等注册自己的免费 key（[free-llm 列表](https://github.com/cheahjs/free-llm-api-resources)）。

完整字段说明：[AI Configuration Guide](https://github.com/electerm/electerm/wiki/AI-model-config-guide)。

## 2. AI 辅助命令

日常最高频：

- **生成**：用人话描述目标（"找出最大的 10 个 docker 镜像并清理 dangling，解释每个参数"）→ 直接可粘的命令 + 简短解释。
- **选中解释**：框住看不懂的输出或网上抄的一行命令 → AI 先讲明白再决定跑不跑。
- **修报错**：粘失败的命令 + stderr → 给修正版。
- **写脚本**：多行 bash/python 片段，markdown 排版，遵守你设的 system role（"终端专家，简要解释，markdown"）。

建议本地有缓存，省 API 调用。回答**语言**设一次，之后全按它来。

## 3. AI 生成书签

书签有 40 来个字段（隧道、跳转、X11、编码、启动脚本……），表单一个个填太累，直接描述机器：

```text
SSH 连 192.168.0.10，用户名 admin，开 X11，
远端 5900 转发到本地 5900，起始目录 /home/admin，用 ssh-agent，
再加隧道 127.0.0.1:8080 → 远端 10.0.0.5:80。
```

点**通过 AI 创建书签** → 生成 → 检查格式化 JSON（可改/复制/下载）→ 确认。返回数组就是**批量建多个书签**。习惯用 ChatGPT/Claude 网页版？拿[便携 system prompt](https://github.com/electerm/electerm/wiki/system-prompt-you-can-use-in-any-LLM-chat-to-create-electerm-bookmark-data)过去，或直接用托管的[书签生成器](https://ai.electerm.org/bookmark-generator/)——同一套 schema，免安装。

视频：[Electerm 用 AI 创建书签](/videos/electerm-use-ai-to-create-bookmarks/)。指南：[Create Bookmark by AI](https://github.com/electerm/electerm/wiki/Create-bookmark-by-AI)。

## 4. AI 定制主题

描述感觉——"solarized dark 底 + 琥珀点缀、高对比光标、14px JetBrains Mono"——让模型先起草主题 JSON，再去可视化主题编辑器微调。社区主题可从 iTerm2 配色库导入，做好了发到 [theme.electerm.org](https://theme.electerm.org)（自带实时预览 + AI 创建）。

视频：[Electerm 主题设置与编辑](/videos/electerm-theme-settings-and-editing/)。

## 5. Agent 模式：会动手干活的 AI

聊天只动嘴，**agent 模式动手**。给个目标（"把 staging-web-02 的 node 18 升到 20，跑测试，失败回滚"），agent 规划 shell 步骤，在终端里执行、读输出、继续——关键节点要你确认。叠加 electerm 的批量执行，一个目标可以扇出到多台主机。先从只读的侦察任务练手，信任了再放开变更操作。

## 6. AI 助手 + MCP 组件

**AI 助手**停靠在会话旁边：长命令跑着的时候追问、总结日志、拿 `git diff` 起草 commit message。进阶玩家可用 **MCP（Model Context Protocol）组件**给助手接外部工具与上下文源。配置：[MCP Widget Usage Guide](https://github.com/electerm/electerm/wiki/MCP-Widget-Usage-Guide)。

## 上手配方

1. AI 设置 → 预设选服务商 → 粘 key → 测试连接 → 保存。
2. System role：`终端专家，给出不同系统的命令，简要解释用法，markdown 格式`。
3. 语言选你的语言。网络需要才填代理。
4. 置顶 AI 面板，依次试：生成 → 选中解释 → 自然语言建书签 → 起草主题 → agent 侦察任务。
5. 回答过时就清一下建议缓存。

## 下一步

- 回顾基础：[Electerm 介绍](/blogs/electerm-introduction/cn/)
- 连接篇：[Electerm SSH 全解](/blogs/ssh-features-guide/cn/)
- 安装篇：[全平台安装 Electerm](/blogs/install-electerm/cn/)
- 参考：[AI Configuration Guide](https://github.com/electerm/electerm/wiki/AI-model-config-guide) · [Quick Command Templates](https://github.com/electerm/electerm/wiki/quick-command-templates) · [Batch Operation](https://github.com/electerm/electerm/wiki/batch-operation)
