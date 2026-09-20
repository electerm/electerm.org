---
title: 'ai.electerm.org：electerm 里的免费 AI，不用自己买 key'
description: ai.electerm.org 是给 electerm 用户准备的免费 AI 服务——用 GitHub 登录拿一个 key 填进桌面版，或者干脆在 electerm online 里直接用，完全不需要 key。还有那套在免费额度用完时自动顶上的共享 key 池。
date: 2026-09-20
tags: [ai, 免费, api key, 大模型, agent 模式, 云端]
videos: [electerm-ai-command-generation, electerm-use-ai-to-create-bookmarks, electerm-usage-demo, electerm-theme-settings-and-editing]
bannerScript: banner.js
---

# ai.electerm.org：electerm 里的免费 AI，不用自己买 key

electerm 的 AI 功能有一个烦人的前置条件：你得先有一个 API key。挑一家服务商、注册账号、找到账单页、生成 key、粘进设置表单，然后祈祷你注册的那个免费额度下个月还在。

[**ai.electerm.org**](https://ai.electerm.org) 就是绕开这一整段的路。它是为 electerm 用户跑的一个免费 AI 接口，而且直接接到了应用里——预设项本来就在下拉列表里；而在 [cloud.electerm.org](https://cloud.electerm.org) 上，你连 key 都不用填。

这篇讲的是这个服务本身：它是什么、在两个地方怎么打开、擅长做什么，以及免费额度到哪里为止。

> **先把最实的一句话放前面**：这是一位开发者自掏腰包、在一台小 VPS 上、用免费额度的 AI 账号跑起来的服务。它不是企业级服务，没有可用性承诺，也确实会撞到上限。下面所有内容都是在这个前提下写的——包括"免费额度用完怎么办"那一节。

## 它到底是什么

|  |  |
|---|---|
| **地址** | [ai.electerm.org](https://ai.electerm.org) |
| **登录方式** | GitHub OAuth——就是你在 electerm online 用的那个账号 |
| **费用** | 免费 |
| **接口** | `https://ai.electerm.org/api/ai` + `/chat/completions` |
| **协议格式** | OpenAI Chat Completions，所以任何兼容 OpenAI 的客户端都能接，不只 electerm |
| **支持** | electerm 桌面版、[cloud.electerm.org](https://cloud.electerm.org)、electerm-web |
| **谁在出钱** | 一位开发者，用免费额度账号，加上社区捐出来的 key |

进这个服务有两道门，走哪道取决于你在用哪个 electerm。

## 第一道门：桌面版，四步

桌面版需要一个 key，因为是你自己的机器直接跟服务通信。

1. 在 [ai.electerm.org](https://ai.electerm.org) **用 GitHub 登录**——点 **Get Started**，授权，就完了。没有注册表单，也不用再编一个密码。
2. 在个人资料页**复制你的 API key**。
3. **打开 electerm 的 AI 设置**——AI 侧边面板底部那个齿轮图标（或者设置里的 AI 分区）会打开 **AI Config** 对话框。
4. **选预设，粘贴。** 预设下拉在对话框右上角。`ai.electerm.org` 排在很靠前的位置，因为 electerm 自己把它注入到了列表里——你不是在照着某篇博客手打 URL，你点的是随应用一起发出来的那一项。

选中预设之后，表单会自己填好：

```text
Name      ai.electerm.org
API URL   https://ai.electerm.org/api/ai
Path      /chat/completions
Model     free
Auth      Authorization: Bearer
```

你只需要再补上 key。然后点 **Test connection**——它会真的发一次请求，在你还来得及后悔之前告诉你这个 key 到底能不能用——再点 **Save**。

有个细节值得知道：这个 key 的有效期是 120 年。你不会有机会续期。

不管你把接口指向哪家服务商，配置流程都是一样的——只有名称、URL 和模型不一样。AI 生成命令的完整演示在本文末尾的视频指南里。

## 第二道门：electerm online，完全不用 key

在 [cloud.electerm.org](https://cloud.electerm.org) 上，你已经用 GitHub 登录过了，而这个服务用的就是同一个 GitHub 账号。所以没有任何东西需要配置：

1. 打开 [cloud.electerm.org](https://cloud.electerm.org)，登录。
2. 打开 AI 侧边面板。
3. 没了。直接问它。

这一版适合直接丢给一个这辈子从没配过大模型的人。它也是能在手机上、在浏览器里、在一台什么也装不了的机器上用的那一版。

## 你拿它到底能干什么

AI 面板就停靠在你的会话旁边，而这个免费接口给的是完整功能，没有哪一项被锁在付费墙后面：

- **生成命令。** 用自然语言说清楚你要干什么，拿回一条可以直接粘贴的命令，附带各参数含义的简短解释。
- **解释选中内容。** 选中一段看不懂的输出——或者从 Stack Overflow 抄来的一行命令——先让它告诉你这是干什么的，再决定要不要执行。
- **修复报错。** 把失败的命令和 stderr 一起贴进去，拿回修正版。
- **写脚本。** 多行 bash 或 Python，markdown 格式输出。
- **用一句话创建书签。** 书签有大约四十个字段。与其填表，不如把那台机器描述一遍。视频：[Electerm 使用 AI 创建书签](/videos/electerm-use-ai-to-create-bookmarks/)。
- **起草主题。** 描述一个配色感觉，让模型产出主题 JSON，再在可视化编辑器里微调。视频：[Electerm 主题设置和编辑](/videos/electerm-theme-settings-and-editing/)。
- **Agent 模式。** 把面板从 **Ask** 切到 **Agent**，它会规划 shell 步骤、执行、读输出、继续往下做——每一步都由你放行。

回答是 markdown 格式，代码块上带两个动作：**复制**，和**在终端里运行**。第二个才是 AI 面板真正有用的原因——命令直接进当前会话，而不只是给你看。它顺手会剥掉空行和 `#` 注释，所以一段带注释解释的命令块，执行的正好是它描述的那些命令，不多不少。

## 不用 electerm 也能用

这个服务并不只能从应用里访问。网站上还有三个页面，本身就值得收藏：

**[/chat/](https://ai.electerm.org/chat/)**——浏览器里的聊天窗口。登录之前就能看到界面长什么样；真要聊天需要 GitHub 登录。当你想在一台没装 electerm 的机器上问一个终端问题时，这个页面很顺手。

**[/bookmark-generator/](https://ai.electerm.org/bookmark-generator/)**——贴一段描述，或者贴别的应用导出的书签数据，它会返回可直接导入的 electerm 书签 JSON。导入路径在所有版本上都一样：**Bookmarks** → 书签面板里的 **≡** 菜单 → **Import** → 选中那个 JSON 文件。如果你要从别的客户端迁移、又不想手打四十台主机，这个页面就是发给你的。

**[/share/](https://ai.electerm.org/share/)**——下面单独讲，因为这是整个设计里最聪明的一块。

## 共享 key 池，这才是巧妙的地方

一个靠个人免费额度账号撑起来的免费服务，有一个显而易见的死法：token 撞上速率限制，所有人一起报错。

ai.electerm.org 的解法是把 key 汇成一个池子。如果你手上有闲置的免费额度 key——Mistral、Google AI Studio、OpenRouter、Groq、Cerebras、NVIDIA NIM、Together、SiliconFlow，或者任何兼容 OpenAI 的接口——都可以粘进 [/share/](https://ai.electerm.org/share/)，它就会加入池子。规则定得挺合理：

- key 在**入库之前会被真实测试**——服务会用它拉一遍模型列表，并跑一次真实的对话补全。用不了的 key 会被拒。
- 你的 key 只在**内置 key 被限流（429）时**才会被用到。它是备胎，不是替代品。
- 认证失效（401/403）的 key 会被**自动停用**。
- 每个账号最多五个有效 key，你随时可以撤掉自己的。
- key 存在服务端，**永远不会完整显示出来**。

于是那个死法就变成了：主 token 用完了，electerm 自动切到别人捐的 key 上，你的问题照样有答案。分享的人越多，越没人会注意到限制的存在。

如果你手上有用不着的免费 key，这就是你能给这个服务做的最有用的一件事。

## 把边界说清楚

在把任何敏感东西放到它附近之前，先读这一段。

- **它是免费的，所以它是有限的。** 服务跑在免费额度的 AI 账号上。你猛用就会撞上限。撞上了就换上自己的 key——预设项就是干这个的，同一个设置对话框接受任何服务商。
- **不要把机密放进提示词。** 你输入的内容会发到第三方 AI 服务商那里，并且可能被记录下来。不要放密码、私钥、API token、客户数据。这条对所有大模型都成立，只是当面板离一个活的 shell 只有一个按键的距离时，更容易忘。
- **AI 会出错。** 生成出来的命令只是一个建议。在生产机器上按回车之前，先读一遍。
- **没有任何保证。** 一位开发者、一台小 VPS、免费额度账号。如果某台主机需要的是一个你绝不会敲进别人笔记本的密码，那就用自己的服务商或者本地模型。

这些都不构成"别用"的理由——它们说明的是一笔好交易，只是边界看得见。用它擅长的事：每天那些"这条命令是干什么的""这句话该怎么写"的活，在任何一台机器上，不用打开账单页。

## 一分钟上手

1. [ai.electerm.org](https://ai.electerm.org) → **Get Started** → 用 GitHub 登录。
2. 在个人资料页复制 key。
3. electerm → AI 设置 → **Presets** → `ai.electerm.org` → 粘贴 key → **Test connection** → **Save**。
4. 打开 AI 面板，就着你正在看的那个会话问点什么。

或者跳过前三步，直接用 [cloud.electerm.org](https://cloud.electerm.org)——那边你已经登录了。

## 接着看

- 功能总览：[Electerm 的 AI 功能](/blogs/ai-features-guide/cn/)
- 参考文档：[AI model config guide](https://github.com/electerm/electerm/wiki/AI-model-config-guide) · [用 AI 创建书签](https://github.com/electerm/electerm/wiki/Create-bookmark-by-AI) · [MCP widget 指南](https://github.com/electerm/electerm/wiki/MCP-Widget-Usage-Guide)
- 浏览器版：[Electerm Online](/blogs/electerm-online/cn/)
- 安装：[在各平台安装 electerm](/blogs/install-electerm/cn/) · 从零开始：[electerm 介绍](/blogs/electerm-introduction/cn/)
