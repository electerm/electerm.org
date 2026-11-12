---
title: 'Same model name, different weights: when a cheap API relay breaks electerm’s agent'
description: The model id in an OpenAI-compatible request is a string you send, not a promise about the weights that answer it. electerm’s agent ships 26 tool schemas and needs tool_calls back; a relay can answer chat perfectly and fail every agent turn. A real case, the three failure shapes, a 40-line probe you can run, and what the result does and does not prove.
date: 2026-11-12
tags: [ai, llm, agent, api, tool-calling]
bannerScript: banner.js
---

# Same model name, different weights

Chat mode is a text test. Agent mode is a schema test, and the two are not
interchangeable: an endpoint can answer "explain this `docker ps` output" beautifully all day and
still be unable to run a single step of an agent task. We hit exactly that — the same model id, two
sellers, one of them works and one of them cannot call a tool. The id is only a string in a request
body; everything electerm does with it is a guess.

If you have not used agent mode yet, read
[AI features in electerm](/blogs/ai-features-guide/) first. This post is about what happens when the
model behind the API is not the model on the label.

## 1. What one agent turn puts on the wire

Compare the two code paths. Chat asks for a string:

```
buildRequest(fmt, { model, messages: requestMessages, stream: useStream })
```

Agent asks for structured behaviour, and pays for it up front:

```
buildRequest(fmt, { model, messages, tools, stream: false })
```

`tools` is `agentTools` — the 26 functions electerm can execute on your behalf. Measured from
`src/client/components/ai/agent-tools.js`:

| Measure | Value |
| --- | --- |
| tools | **26** |
| serialized schema | **33,342 bytes** |
| tokens, by electerm's own estimator | **~9,500** (33,342 ÷ 3.5 chars/token) |
| largest two | `open_tab` 12,834 B, `add_bookmark` 12,827 B — **77%** of the payload |
| iterations per run | up to **150** |

Those two big schemas are not hand-written: they are generated at runtime from `bookmarkSchemas` with
`z.toJSONSchema()`, one branch per bookmark type — ssh, telnet, serial, vnc, rdp, ftp, web, local,
spice, nine in all. So the model is not reading a flat list of arguments; it is reading a
discriminated union and has to pick the right branch before it fills in a single field.

The 26 tools, grouped:

| Group | Tools | What the model must get right |
| --- | --- | --- |
| Terminal | `send_terminal_command`, `get_terminal_output`, `get_terminal_status`, `cancel_terminal_command`, `set_terminal_keepalive` | `command` is a string; `tabId` is optional, and omitting it means "the active tab" |
| Tabs | `open_local_terminal`, `list_tabs`, `get_active_tab`, `switch_tab`, `close_tab` | ids are opaque; no arithmetic, no guessing |
| Bookmarks | `list_bookmarks`, `open_bookmark`, `add_bookmark`, `open_tab` | the union again: `type` plus that type's own fields |
| SFTP | `sftp_list`, `sftp_stat`, `sftp_read_file`, `sftp_del`, `sftp_upload`, `sftp_download`, `sftp_transfer_list`, `sftp_transfer_history` | `remotePath` vs `localPath` — swapping them deletes the wrong file |
| Background | `run_background_command`, `get_background_task_status`, `get_background_task_log`, `cancel_background_task` | a `taskId` threaded across turns |

None of this is exotic. All of it is schema-following, and schema-following is the first thing that
degrades when a smaller model stands in for a bigger one.

## 2. Three ways it breaks, and what you see

The loop is small enough to read in one sitting (`src/client/components/ai/agent.js`). It is also
unforgiving: there is exactly one way to continue, and several ways to stop.

| What you see in the panel | What the loop did | Where |
| --- | --- | --- |
| A fluent answer, no tool card, no command run | `if (!assistantMessage.tool_calls?.length) return` — treated as the final answer | `agent.js` |
| A tool card whose arguments are `{}` | `JSON.parse(toolCall.function.arguments)` threw, `args = {}` | `agent.js` |
| `Unknown agent tool: xyz` | the `default` branch of `executeToolCall` throws, the message goes back as the tool result | `agent-tools.js` |
| The same tool, again and again, same error | that error is a normal `role: 'tool'` message; the model retries until 150 iterations | `agent.js` |
| An `Error:` line instead of an answer | `result.error` is appended to the response and the run ends | `ai.js` |

The first row is the one that fools people, because nothing looks broken. electerm does not require
`content` to be empty when tools are called — a model may explain itself and call a tool in the same
turn, and electerm will show both. But if `tool_calls` is absent, the run is over: the prose becomes
the answer, and the terminal never moves.

That is also why "it works in chat" is not evidence. Chat sends no `tools` at all, so a relay that
drops the field — or a model with no function-calling training — fails silently instead of loudly.

## 3. The case

The same model id, two endpoints, one prompt:

> Which terminal tabs are open right now? Use a tool.

On the cheap relay, agent mode accepted the request, billed it, and answered in prose. The answer was
specific and plausible — it named the command it would run and explained what it expected to find.
electerm showed it as the final answer, because that is what it was: a `message` with no
`tool_calls`. Nothing ran.

On a first-party endpoint, same id, same tools, same system prompt, the first turn came back as a
tool call, the tab list came back as a tool result, and the second turn used it. Nothing about the
prompt changed between the two runs.

We cannot prove from the outside which weights answered the cheap endpoint. We can prove the contract
failed, in the only place that matters: the response did not carry the one field that makes the loop
continue.

## 4. Why one id can be two different models

There is no signature on an OpenAI-compatible request. `"model": "deepseek-v4"` is a free-form
string; whatever sits behind `/chat/completions` decides what to do with it.

Start with the boring explanation, because it covers most cases: an open-weight model has many
legitimate hosts. The weights can be byte-identical while the serving stack is not — quantization
level, sampler defaults, context cap, max output, and above all the adapter that turns a tool call
into JSON. That alone is enough to make the same id pass chat and fail agent.

That leaves several honest — and one dishonest — ways for the same id to mean different weights:

- **Routing.** An aggregator picks a backend per request: cheapest first, another provider on
  failure, a smaller sibling when the big one is rate-limited. Under load the same id gets a
  different model, and a chat answer rarely shows it.
- **Quantization.** Self-hosted weights at 4-bit are "the model" by name and visibly weaker at
  structured output. Cheap per-token pricing usually means something like this.
- **Distillation.** A small model fine-tuned on a big model's outputs imitates the voice, not the
  contract. It will write a convincing `tool_calls`-shaped JSON block *as prose* — which is exactly
  what a fenced code block in `content` is.
- **Rewriting.** A gateway that translates between protocols (chat ↔ responses ↔ messages) may drop
  `tools` or mangle the union schema. This is a bug, not fraud, and it looks identical from the panel.
- **Renaming.** Sellers publish ids the upstream does not have — suffixes like `-pro`, `-max`,
  `-turbo`. The name is the seller's, so the weights are too.

The reverse also happens: the real model behind an invented id. Then electerm's own id-based guesses
misfire. Two places do that:

```
// src/app/lib/ai-format.js — only for ids matching /deepseek/i
const REASONING_HISTORY_MODEL = /deepseek/i

// src/app/lib/ai-context.js — "No provider publishes the window over the API,
// and relays rename models freely, so this is only a starting point"
const MODEL_CONTEXT_WINDOWS = [[/deepseek-v4/, 1000000], …]
```

A renamed DeepSeek never gets the `reasoning_content` placeholder its thinking mode requires, and a
non-DeepSeek wearing the id gets a `reasoning_content` field it may reject. The context-window table
is a guess for the same reason, which is why **Context length** in the AI config always wins over it.

None of this is a reason to distrust relays as a category. Most are honest passthroughs. It is a
reason to test the thing you actually depend on, which is not the chat answer.

## 5. A probe you can run in a minute

Save this as `probe-tool-calls.mjs`, point it at any OpenAI-compatible base URL. It sends two of
electerm's real tools (`list_tabs`, `send_terminal_command`; the schemas are the app's, the
descriptions are shortened to fit here), then feeds a tool result back and asks for a second turn —
because a model that tool-calls once and cannot read a `role: 'tool'` message breaks on turn two,
where electerm actually lives.

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

Read the output, not the label:

- `tool_calls: 0` — the endpoint is a chat endpoint. Agent mode will never work on it.
- `tool_calls: 1` but `content` also holds a JSON block — you are looking at a model imitating the
  shape in prose. electerm reads `tool_calls` only; the block is decoration.
- turn 2 fails or answers "I don't have that information" — the endpoint loses `role: 'tool'`, which
  is half of every agent run.
- `prompt_tokens` far below or above what you sent — a different tokenizer, or a different prompt.
  electerm shows the provider's own `usage.prompt_tokens` next to its estimate for this reason.

What it does not prove: that the weights are what the seller claims. A model can pass this probe and
still be a smaller one that happens to handle three tools well. What it does prove is narrower and
more useful: **this endpoint can, or cannot, do the job you are about to give it.**

## 6. If you are already stuck

- Switch the composer from **Ask** to **Agent** and ask for something read-only:
  *"List my open tabs and tell me which one is active."* One tool call is enough to separate the two
  kinds of endpoint.
- If the run ends in prose with no tool card, stop looking at electerm. The response had no
  `tool_calls`; nothing in the app can invent one.
- If a card shows empty arguments, the model emitted unparseable JSON — that is the model, not the
  tool.
- Set **Context length** to the real value for the model you believe you are talking to. It only
  affects electerm's own warnings and auto-compress threshold; it cannot fix a model that is not
  there.
- Keep auto-compress on for long runs. Every turn re-sends those 33 KB of schema, and a run that
  grows past the window dies with a provider error, not a tool error.

A relay is a fine way to run electerm's agent — as long as you tested the part you depend on. The
label is a string. The tool call is the evidence.
