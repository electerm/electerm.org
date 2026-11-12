---
title: '同一个模型名，未必是同一套权重：便宜中转为什么跑不动 electerm 的 agent'
description: OpenAI 兼容请求里的 model 字段只是你发出去的一串字符，不是对方权重的承诺。electerm 的 agent 每次请求都带 26 个工具 schema，必须拿回 tool_calls 才能继续；一个中转可以聊天聊得毫无破绽，却每一步 agent 都失败。本文给出真实案例、三种失败形态、四十行可直接跑的探测脚本，以及结果能证明什么、不能证明什么。
date: 2026-11-12
tags: [ai, llm, agent, api, tool-calling]
bannerScript: banner.js
---

# 同一个模型名，未必是同一套权重

聊天模式考的是文字，agent 模式考的是 schema，两者不能互相替代：一个端点可以把「这段
`docker ps` 输出是什么意思」答得很漂亮，却一步 agent 任务都跑不动。我们就撞上了这种情况 ——
同一个模型名，两家卖，一家能跑，一家连工具都调不出来。id 只是请求体里的一串字符，electerm
用它做的每一次推断，都是猜。

如果还没用过 agent 模式，先看
[electerm 的 AI 功能](/blogs/ai-features-guide/cn/)。这一篇讲的是：API 背后的模型，和标签上的
模型不是同一个时，会发生什么。

## 1. 一次 agent 请求，到底发了什么

对比两条代码路径。聊天要一个字符串：

```
buildRequest(fmt, { model, messages: requestMessages, stream: useStream })
```

agent 要的是结构化行为，并且先把成本付在前面：

```
buildRequest(fmt, { model, messages, tools, stream: false })
```

`tools` 就是 `agentTools` —— electerm 能替你执行的 26 个函数。以下数字量自
`src/client/components/ai/agent-tools.js`：

| 项目 | 数值 |
| --- | --- |
| 工具数 | **26** |
| 序列化后的 schema | **33,342 字节** |
| 按 electerm 自己的估算器算的 token | **约 9,500**（33,342 ÷ 3.5 字符/token） |
| 最大的两个 | `open_tab` 12,834 B、`add_bookmark` 12,827 B —— 占 **77%** |
| 单次运行最多迭代 | **150** |

这两个大 schema 不是手写的：运行时由 `bookmarkSchemas` 经 `z.toJSONSchema()` 生成，每种书签
类型一个分支 —— ssh、telnet、serial、vnc、rdp、ftp、web、local、spice，一共九种。也就是说模型
面对的不是一张扁平参数表，而是一个可辨识联合（discriminated union）：先选对分支，才轮到填字段。

26 个工具，按组：

| 组 | 工具 | 模型必须做对的事 |
| --- | --- | --- |
| 终端 | `send_terminal_command`、`get_terminal_output`、`get_terminal_status`、`cancel_terminal_command`、`set_terminal_keepalive` | `command` 是字符串；`tabId` 可选，不填表示「当前 tab」 |
| Tab | `open_local_terminal`、`list_tabs`、`get_active_tab`、`switch_tab`、`close_tab` | id 是不透明的，不能算、不能猜 |
| 书签 | `list_bookmarks`、`open_bookmark`、`add_bookmark`、`open_tab` | 又是那个联合：`type` 加上该类型自己的字段 |
| SFTP | `sftp_list`、`sftp_stat`、`sftp_read_file`、`sftp_del`、`sftp_upload`、`sftp_download`、`sftp_transfer_list`、`sftp_transfer_history` | `remotePath` 和 `localPath` 弄反，就是删错文件 |
| 后台任务 | `run_background_command`、`get_background_task_status`、`get_background_task_log`、`cancel_background_task` | `taskId` 要跨轮次传递 |

这些都不冷门。但它们全是 schema 遵循能力 —— 而这恰好是小模型顶替大模型时，最先退化的一项。

## 2. 三种坏法，以及你会看到什么

循环本身很短，一屏就能读完（`src/client/components/ai/agent.js`）。它也很不宽容：继续下去的
路只有一条，停下来的路有好几条。

| 面板里看到的 | 循环做了什么 | 位置 |
| --- | --- | --- |
| 一段流畅的回答，没有工具卡片，什么都没执行 | `if (!assistantMessage.tool_calls?.length) return` —— 当成最终答案 | `agent.js` |
| 有工具卡片，但参数是 `{}` | `JSON.parse(toolCall.function.arguments)` 抛错，`args = {}` | `agent.js` |
| `Unknown agent tool: xyz` | `executeToolCall` 的 `default` 分支抛错，错误当成工具结果回传 | `agent-tools.js` |
| 同一个工具、同一个错误，反复调用 | 那个错误只是一条普通的 `role: 'tool'` 消息，模型一路重试到 150 次 | `agent.js` |
| `**Error:** 400 … tools` | 端点直接把请求拒了 | `ai.js` |

第一行最容易骗人，因为看起来什么都没坏。工具调用时 electerm 并不要求 `content` 为空 —— 模型
可以一边解释一边调工具，两样都会显示。但只要 `tool_calls` 缺席，这一轮就结束了：那段文字成了
答案，终端一动不动。

这也正是「聊天能用」不算证据的原因。聊天模式的请求里根本没有 `tools`，所以一个把该字段丢掉的
中转、或者一个没训练过 function calling 的模型，不会报错，只会安静地失败。

## 3. 那个案例

同一个模型名，两个端点，同一句提示词：

> 现在开着哪些终端 tab？用工具查。

在那个便宜中转上，agent 模式接了请求、也计了费，然后回了一段散文。回答具体得像真的：它说出了
自己准备执行哪条命令，还描述了预期会看到什么。electerm 把它当成最终答案显示出来 —— 因为它确实
是：一条没有 `tool_calls` 的 `message`。什么都没跑。

换成官方端点，同一个 id、同一批工具、同一个 system prompt，第一轮就返回工具调用，tab 列表作为
工具结果回来，第二轮用上了它。两次运行之间，提示词一个字都没改。

我们无法从外部证明那个便宜端点背后是哪套权重。我们能证明的是契约失败，而且失败在唯一关键的
地方：响应里没有那个让循环继续下去的字段。

## 4. 为什么一个 id 能对应两套权重

OpenAI 兼容请求上没有签名。`"model": "deepseek-v4"` 是自由字符串，`/chat/completions` 背后
是谁，就由谁决定怎么处理它。

先说最无聊的那个解释，因为它能覆盖大多数情况：开放权重的模型有很多完全合法的托管方。权重可以
一个字节都不差，而服务栈不是 —— 量化等级、采样默认值、上下文上限、最大输出，以及最关键的、
把工具调用变成 JSON 的那层适配。光这一条，就足够让同一个 id 聊天能用、agent 不能用。

除此之外，同一个 id 对应不同权重，还有几种「说得过去」的方式，和一种说不过去的：

- **路由**。聚合型中转按请求挑后端：先挑最便宜的，失败换一家，大模型限流时退到小一号的兄弟
  模型。同一个 id，不同时刻是不同模型 —— 而聊天回答基本看不出来。
- **量化**。自托管权重跑 4-bit，名字上仍然是「那个模型」，结构化输出上明显更弱。按 token 单价
  低到离谱，通常意味着这类东西。
- **蒸馏**。拿大模型的输出微调一个小模型，学的是语气，不是契约。它会写出一段很像
  `tool_calls` 的 JSON 当成**正文**发给你 —— 也就是 `content` 里的一个代码块。
- **改写**。网关在协议之间翻译（chat ↔ responses ↔ messages），可能把 `tools` 丢掉或者把联合
  schema 搅乱。这是 bug 不是欺诈，但从面板上看一模一样。
- **改名**。卖家发布上游根本没有的 id —— 后缀 `-pro`、`-max`、`-turbo`。名字是卖家的，权重自然
  也是。

反过来也成立：一个真模型挂在一个编造的 id 后面。这时 electerm 自己那些「按 id 猜」的地方就会
猜歪。有两处：

```
// src/app/lib/ai-format.js —— 只对匹配 /deepseek/i 的 id 生效
const REASONING_HISTORY_MODEL = /deepseek/i

// src/app/lib/ai-context.js —— 「没有 provider 通过 API 公布窗口，而中转会随便改名，
// 所以这只是一个起点」
const MODEL_CONTEXT_WINDOWS = [[/deepseek-v4/, 1000000], …]
```

一个被改名的 DeepSeek 拿不到它 thinking 模式要求的 `reasoning_content` 占位符；一个顶着
deepseek id 的非 DeepSeek 反而会收到它可能拒收的 `reasoning_content` 字段。上下文窗口那张表
同理只是猜，所以 AI 配置里的 **Context length** 永远优先于它。

这不是说中转这一类都不能用 —— 大多数是老实透传的。它说的是：你该测的是你真正依赖的那部分，
而不是聊天回答。

## 5. 一分钟能跑完的探测

存成 `probe-tool-calls.mjs`，指向任意 OpenAI 兼容的 base URL。它发 electerm 的两个真实工具
（`list_tabs`、`send_terminal_command`；schema 是应用的，描述为了排版缩短了），然后把工具结果
喂回去再要第二轮 —— 因为只会调一次工具、读不懂 `role: 'tool'` 消息的模型，会死在第二轮，而
electerm 恰恰活在第二轮。

```js
// node probe-tool-calls.mjs <base-url> <api-key> [model]
const [base, key, model = 'deepseek-v4'] = process.argv.slice(2)

// two real electerm tools, schema shape intact, descriptions shortened
const tools = [
  { type: 'function', function: {
    name: 'list_tabs',
    description: 'List all open terminal tabs.',
    parameters: { type: 'object', properties: {} }
  } },
  { type: 'function', function: {
    name: 'send_terminal_command',
    description: 'Send a command to a tab; return its output.',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'shell command' },
        tabId: { type: 'string', description: 'omit for active tab' }
      },
      required: ['command']
    }
  } }
]

async function post (messages) {
  const url = base.replace(/\/+$/, '') + '/chat/completions'
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + key
    },
    body: JSON.stringify({ model, stream: false, messages, tools })
  })
  return JSON.parse(await res.text())
}

const messages = [
  {
    role: 'system',
    content: 'You are inside electerm, a terminal client. Use tools.'
  },
  {
    role: 'user',
    content: 'Which terminal tabs are open right now? Use a tool.'
  }
]

const first = await post(messages)
const msg = first.choices[0].message
const calls = msg.tool_calls || []
console.log('tool_calls:', calls.length)
console.log('content:', JSON.stringify(msg.content))
if (!calls.length) process.exit(1)

const toolMessage = {
  role: 'tool',
  tool_call_id: calls[0].id,
  content: '{"tabs":[{"id":"tab-1"}]}'
}
const second = await post([...messages, msg, toolMessage])
const answer = second.choices[0].message
console.log('turn 2:', JSON.stringify(answer).slice(0, 200))
console.log('prompt_tokens:', first.usage && first.usage.prompt_tokens)
```

看输出，别看标签：

- `tool_calls: 0` —— 这是个聊天端点。agent 模式永远不会在它上面能用。
- `tool_calls: 1`，但 `content` 里还有一段 JSON —— 你看到的是模型在正文里模仿格式。electerm
  只读 `tool_calls`，那段 JSON 是装饰。
- 第二轮挂了，或者回答「我不知道」 —— 端点丢了 `role: 'tool'`，而它占每次 agent 运行的一半。
- `prompt_tokens` 和你发出去的差得离谱 —— 换了个 tokenizer，或者换了个 prompt。electerm 把
  provider 自己的 `usage.prompt_tokens` 和自己的估算并排显示，就是这个原因。

它证明不了什么：证明不了权重就是卖家说的那个。一个模型可以过这个探测，仍然是个刚好能处理三个
工具的小模型。它能证明的东西更窄，也更有用：**这个端点能不能干你接下来要给它的活。**

## 6. 已经卡住的话

- 把输入框的分段控件从 **Ask** 切到 **Agent**，问一件只读的事：
  *「列出我开着的 tab，告诉我哪个是当前 tab」*。一次工具调用就足够区分两种端点。
- 如果这一轮以散文结束、没有工具卡片，别再看 electerm 了。响应里没有 `tool_calls`，应用里没有
  任何东西能把它变出来。
- 如果卡片上的参数是空的，是模型吐了无法解析的 JSON，不是工具坏了。
- 把 **Context length** 设成你相信自己正在对话的那个模型的真实值。它只影响 electerm 自己的
  警告和自动压缩阈值，治不了一个根本不存在的模型。
- 长任务开着自动压缩。每一轮都要重发那 33 KB schema，跑到超出窗口时会以 provider 报错收场，
  而不是工具报错。

用中转跑 electerm 的 agent 完全没问题 —— 前提是你测过你依赖的那部分。标签是字符串，工具调用
才是证据。
