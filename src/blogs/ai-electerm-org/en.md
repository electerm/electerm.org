---
title: 'ai.electerm.org: Free AI in Electerm, No Key to Buy'
description: ai.electerm.org is a free AI service for electerm users — sign in with GitHub for a key you paste into electerm desktop, or use the AI panel in electerm online with no key at all. Plus the shared key pool that keeps it alive when the free tokens run out.
date: 2026-09-20
tags: [ai, free, api-key, llm, agent-mode, cloud]
videos: [electerm-ai-command-generation, electerm-use-ai-to-create-bookmarks, electerm-usage-demo, electerm-theme-settings-and-editing]
bannerScript: banner.js
---

# ai.electerm.org: Free AI in Electerm, No Key to Buy

Electerm's AI features have one annoying prerequisite: an API key. You have to pick a provider, make an account, find the billing page, generate a key, paste it into a settings form, and hope the free tier you signed up for is still free next month.

[**ai.electerm.org**](https://ai.electerm.org) is the shortcut past all of that. It is a free AI endpoint run for electerm users, and it is wired into the app itself — the preset is already in the dropdown, and on [cloud.electerm.org](https://cloud.electerm.org) there is no key to enter at all.

This post is about the service: what it is, how to turn it on in the two places it works, what it does well, and where the free tier ends.

> **The honest headline first**: this is one developer paying for free-tier AI accounts out of his own pocket, on a small VPS. It is not an enterprise service, it has no uptime guarantee, and it can hit its limits. Everything below is written with that in mind — including a section on what to do when the free tokens run out.

## What it actually is

|  |  |
|---|---|
| **URL** | [ai.electerm.org](https://ai.electerm.org) |
| **Sign-in** | GitHub OAuth — the same account you already use for electerm online |
| **Cost** | Free |
| **Endpoint** | `https://ai.electerm.org/api/ai` + `/chat/completions` |
| **Wire format** | OpenAI Chat Completions — so it drops into any OpenAI-compatible client, not just electerm |
| **Works with** | electerm desktop, [cloud.electerm.org](https://cloud.electerm.org), electerm-web |
| **Who pays** | One developer, on free-tier AI accounts, with keys the community donates |

Two doors lead into it, and which one you use depends on which electerm you are running.

## Door one: electerm desktop, four steps

On the desktop app you need a key, because your machine is talking to the service directly.

1. **Sign in with GitHub** at [ai.electerm.org](https://ai.electerm.org) — click **Get Started**, authorise, done. No registration form, no password to invent.
2. **Copy your API key** from your profile page.
3. **Open AI settings in electerm** — the gear icon at the bottom of the AI side panel (or the AI section in Settings) opens the **AI Config** dialog.
4. **Pick the preset and paste.** The preset dropdown lives at the top right of the dialog. `ai.electerm.org` sits near the top of it, because electerm injects it into the list itself — you are not typing a URL from a blog post, you are clicking the entry that shipped with the app.

Selecting the preset fills the form for you:

```text
Name      ai.electerm.org
API URL   https://ai.electerm.org/api/ai
Path      /chat/completions
Model     free
Auth      Authorization: Bearer
```

All you add is the key. Then press **Test connection** — it makes a real call and tells you whether the key works before you commit it — and **Save**.

One detail worth knowing: the key is issued with a 120-year expiry. You are not going to be renewing it.

The setup is the same regardless of which provider you point it at — only the name, URL and model change. There is a walkthrough of AI command generation in the video guides at the end of this post.

## Door two: electerm online, no key at all

On [cloud.electerm.org](https://cloud.electerm.org) you are already signed in with GitHub, and the service is the same GitHub account. So there is nothing to configure:

1. Open [cloud.electerm.org](https://cloud.electerm.org) and sign in.
2. Open the AI side panel.
3. That is it. Ask it something.

This is the version to hand to someone who has never configured an LLM in their life. It is also the version that works from a phone, in a browser, on a machine where you cannot install anything.

## What you actually do with it

The AI panel is docked next to your sessions, and the free endpoint gives you the whole feature set — nothing is held back behind a paid tier:

- **Generate commands.** Describe the goal in plain language; get a paste-ready command with a short explanation of the flags.
- **Explain a selection.** Highlight output you do not recognise — or a one-liner you copied from Stack Overflow — and ask what it does before you run it.
- **Fix a failure.** Paste the command and its stderr; get the corrected version back.
- **Write scripts.** Multi-line bash or Python, formatted in markdown.
- **Create bookmarks from a description.** Bookmarks have about forty fields. Describe the machine instead of filling in the form. Video: [Electerm Use AI to Create Bookmarks](/videos/electerm-use-ai-to-create-bookmarks/).
- **Draft a theme.** Describe a palette and let the model produce the theme JSON, then fine-tune it in the visual editor. Video: [Electerm Theme Settings and Editing](/videos/electerm-theme-settings-and-editing/).
- **Agent mode.** Switch the panel from **Ask** to **Agent** and it plans shell steps, runs them, reads the output, and continues — with your approval gates.

Answers come back as markdown, and code blocks carry two actions: **copy**, and **run in terminal**. That second one is the reason the AI panel is useful rather than decorative — the command goes straight into the active session. It strips blank lines and `#` comments on the way, so a commented explanation block runs as the commands it describes and nothing else.

## The same thing, without electerm

The service is not only reachable from the app. Three pages on the site are worth bookmarking on their own:

**[/chat/](https://ai.electerm.org/chat/)** — a chat window in the browser. You can see the interface before signing in; chatting needs the GitHub login. Useful when you want to ask a terminal question from a machine that has no electerm on it.

**[/bookmark-generator/](https://ai.electerm.org/bookmark-generator/)** — paste a description, or another app's bookmark data, and get electerm bookmark JSON back, ready to import. The import path is the same on every version: **Bookmarks** → the **≡** menu in the bookmark panel → **Import** → pick the JSON file. This is the page to send to someone who is migrating from another client and does not want to re-type forty hosts.

**[/share/](https://ai.electerm.org/share/)** — more on this below, because it is the most interesting part of the design.

## The shared key pool, which is the clever bit

A free service funded by one person's free-tier accounts has an obvious failure mode: the token hits its rate limit and everyone gets an error.

ai.electerm.org handles that by pooling keys. If you have a spare free-tier API key — Mistral, Google AI Studio, OpenRouter, Groq, Cerebras, NVIDIA NIM, Together, SiliconFlow, or any OpenAI-compatible endpoint — you can paste it into [/share/](https://ai.electerm.org/share/) and it joins the pool. The rules are sensible:

- The key is **tested before it is stored** — the service lists models from it and runs a real chat completion. A key that does not work is rejected.
- Your key is only used **when the built-in key is rate-limited (429)**. It is a fallback, not a replacement.
- A key that stops authenticating (401/403) is **switched off automatically**.
- Up to five active keys per account, and you can remove yours at any time.
- Keys are stored server-side and **never displayed in full**.

So the failure mode becomes: the primary token runs out, electerm falls over to a key someone else donated, and your question gets answered anyway. The more people share, the less anyone notices the limits.

If you have a free key you are not using, that is the single most useful thing you can contribute to this service.

## Being straight about the limits

Read this part before you put anything sensitive near it.

- **It is free, so it is finite.** The service runs on free-tier AI accounts. You will hit limits if you hammer it. When you do, plug in your own key — that is what the presets are for, and the same settings dialog takes any provider.
- **Do not put secrets in the prompt.** Whatever you type goes to a third-party AI provider and may be logged there. No passwords, no private keys, no API tokens, no customer data. This applies to every LLM you use, not just this one — it is just easier to forget when the panel is one keystroke away from a live shell.
- **The AI can be wrong.** A generated command is a suggestion. Read it before you press Enter on a production box.
- **No guarantee of anything.** One developer, a small VPS, free-tier accounts. If a host needs credentials you would not type into someone else's laptop, use your own provider or a local model.

None of that makes the service a bad deal — it makes it a good deal with visible edges. Use it for what it is good at: the daily "what does this command do" and "how do I phrase this" work, from any machine, without a billing page.

## Getting started in one minute

1. [ai.electerm.org](https://ai.electerm.org) → **Get Started** → sign in with GitHub.
2. Copy the key from your profile page.
3. electerm → AI settings → **Presets** → `ai.electerm.org` → paste the key → **Test connection** → **Save**.
4. Open the AI panel and ask it something about the session you are looking at.

Or skip steps 1–3 entirely and use [cloud.electerm.org](https://cloud.electerm.org), where you are already signed in.

## Where next

- The feature tour: [AI Features in Electerm](/blogs/ai-features-guide/)
- Reference: [AI model config guide](https://github.com/electerm/electerm/wiki/AI-model-config-guide) · [Create bookmark by AI](https://github.com/electerm/electerm/wiki/Create-bookmark-by-AI) · [MCP widget guide](https://github.com/electerm/electerm/wiki/MCP-Widget-Usage-Guide)
- The browser version: [Electerm Online](/blogs/electerm-online/)
- Install: [Install Electerm everywhere](/blogs/install-electerm/) · Back to basics: [Introducing Electerm](/blogs/electerm-introduction/)
