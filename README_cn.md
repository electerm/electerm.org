[English](./README.md)

<h1 class="aligncenter">
    <a href="https://electerm.org">
        <img src="https://github.com/electerm/electerm-resource/raw/master/static/images/electerm.png", alt="electerm" />
    </a>
</h1>

# electerm.org

electerm 官方网站的代码仓库，线上地址：[https://electerm.org](https://electerm.org)。

本仓库用于构建并维护 electerm 的官方主页，提供产品介绍、各平台下载入口、主题市场、使用视频等展示内容，并支持多语言访问。

## 关于 electerm

electerm 是一款开源的终端 / SSH / SFTP / FTP / Telnet / 串口 / RDP / VNC / Spice 客户端，支持 Linux、macOS、Windows、Android、HarmonyOS 与 iOS 等平台。

除主流的 Windows / macOS / Linux / Android 外，electerm 还支持 HarmonyOS、iOS，以及较老的系统，如 Ubuntu 18、Windows 7、macOS 10+，以及 UOS、麒麟、龙架构（LoongArch，新旧世界）等国产 Linux 发行版。

## 核心特性

- 可作为终端 / 文件管理器，或 SSH / SFTP / FTP / Telnet / 串口 / RDP / VNC / Spice 客户端使用
- 支持 Windows 7+（X64/ARM64）、HarmonyOS、Android、iOS、macOS 10.15+（X64/arm64）、Linux（X64/arm64/Loong64）等，甚至兼容 glibc 2.17+ 的老系统
- 全局快捷键切换窗口显隐（类似 guake，默认 `ctrl + 2`）
- 多平台支持（Linux / macOS / Windows）
- 多语言支持（含中、英、日、韩、俄、西、法等十余种语言）
- 双击直接编辑远程小文件
- 公钥 + 密码认证
- 支持 Zmodem（rz、sz）与 Trzsz（trz/tsz）
- 支持 SSH 隧道、全局 / 会话代理
- 终端背景图、透明窗口
- 快捷命令、UI / 终端主题
- 书签 / 主题 / 快捷命令可同步至 GitHub / Gitee 私密 Gist、WebDAV、自定义服务器或 electerm 云
- 集成 AI 助手，辅助命令建议、脚本编写、解释选中内容、创建书签与主题
- 支持 MCP（Model Context Protocol）组件，便于 AI 助手与外部工具集成
- 支持深链（deep link），如 `ssh://user@host:22`、`telnet://192.168.2.31:34554`
- 支持命令行调用

## 子项目与相关链接

- 官网 / 下载：[https://electerm.org](https://electerm.org)
- 主题在线编辑、实时预览与分享：[https://theme.electerm.org](https://theme.electerm.org)
- 在线演示：[https://demo.electerm.org](https://demo.electerm.org)
- electerm 在线版（云端免费）：[https://cloud.electerm.org](https://cloud.electerm.org)
- electerm AI：[https://ai.electerm.org](https://ai.electerm.org)
- electerm-web（浏览器端，含移动端）：[https://github.com/electerm/electerm-web](https://github.com/electerm/electerm-web)
- electerm-android（安卓端）：[https://github.com/electerm/electerm-android](https://github.com/electerm/electerm-android)
- electerm-harmony（鸿蒙端）：[https://github.com/electerm/electerm-harmony](https://github.com/electerm/electerm-harmony)
- electerm-ios（iOS 端）：[https://github.com/electerm/electerm-ios](https://github.com/electerm/electerm-ios)
- Docker 部署：[https://github.com/electerm/electerm-web-docker](https://github.com/electerm/electerm-web-docker)
- 多语言包：[https://github.com/electerm/electerm-locales](https://github.com/electerm/electerm-locales)
- 应用市场
  - Apple App Store：[https://apps.apple.com/cn/app/electerm/id6792971552](https://apps.apple.com/cn/app/electerm/id6792971552)
  - 华为应用市场：[https://appgallery.huawei.com/app/detail?id=org.electerm.electerm](https://appgallery.huawei.com/app/detail?id=org.electerm.electerm)
  - Microsoft Store：[https://www.microsoft.com/store/apps/9NCN7272GTFF](https://www.microsoft.com/store/apps/9NCN7272GTFF)
  - Snap Store：[https://snapcraft.io/electerm](https://snapcraft.io/electerm)
- 软件源
  - deb 源：[https://repos.electerm.org/deb](https://repos.electerm.org/deb)
  - rpm 源：[https://repos.electerm.org/rpm](https://repos.electerm.org/rpm)

## 下载与安装

- macOS：`brew install --cask electerm`
- Linux（snap）：`sudo snap install electerm --classic`
- Windows：Microsoft Store、winget（`winget install electerm.electerm`）、scoop
- npm：`npm i -g electerm`
- 各平台安装包与详细步骤见官网 [https://electerm.org](https://electerm.org)

## 许可证

MIT
