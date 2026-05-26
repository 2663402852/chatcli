# ChatCLI

[English](README.md) | [中文](README_zh.md)

[![npm version](https://img.shields.io/npm/v/@xiami_master/chatcli.svg)](https://www.npmjs.com/package/@xiami_master/chatcli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)
[![CI](https://github.com/2663402852/chatcli/actions/workflows/ci.yml/badge.svg)](https://github.com/2663402852/chatcli/actions)

一款精美的终端 AI 聊天客户端，基于 Node.js + [Ink](https://github.com/vadimdemedes/ink)（React for CLI）构建。

支持所有 OpenAI 兼容 API —— OpenAI、Claude、DeepSeek、Ollama 等。

![Demo](https://github.com/2663402852/chatcli/raw/main/screenshot.png)

## 功能特性

- 💬 **多会话管理** — 组织和切换对话
- 🤖 **OpenAI 兼容 API** — 支持任意供应商（OpenAI、Anthropic、DeepSeek、Ollama 等）
- 📝 **Markdown 渲染** — 带语法高亮
- 🔍 **全文搜索** — 跨会话搜索历史记录
- 📋 **系统提示词预设** — 保存和切换提示词模板
- ⚙️ **多模型配置** — 内置向导管理模型
- 💾 **SQLite 本地存储** — 所有数据保存在本地
- 🔐 **API Key 加密存储**（AES-256-CBC）
- 📤 **导出聊天记录** — 导出为 Markdown 文件
- 🗑️ **会话管理** — 重命名、清空、删除会话

## 安装

```bash
npm install -g @xiami_master/chatcli
```

## 快速开始

```bash
# 启动 ChatCLI
chatcli

# 通过交互式向导配置第一个模型
/config model

# 开始聊天！
```

## 命令列表

输入 `/` 加命令名：

| 命令 | 别名 | 说明 |
|------|------|------|
| `/new` | `/n` | 新建会话 |
| `/sessions` | `/s`, `/history` | 查看历史会话 |
| `/models` | `/m` | 查看模型列表 |
| `/presets` | `/p` | 查看预设列表 |
| `/config` | `/c` | 配置新模型或预设 |
| `/search` | | 全文搜索历史 |
| `/use` | | 切换当前模型或预设 |
| `/rename` | `/r` | 重命名当前会话 |
| `/clear` | | 清空当前会话消息 |
| `/export` | | 导出当前会话为 Markdown |
| `/delete` | `/d`, `/del` | 删除当前会话 |
| `/help` | `/h`, `/?` | 显示帮助信息 |
| `/quit` | `/q`, `/exit` | 退出程序 |

## 快捷键

| 按键 | 操作 |
|------|------|
| `Enter` | 发送消息 / 执行命令 |
| `Tab` | 切换侧边栏焦点 |
| `Escape` | 关闭侧边栏 / 取消编辑 |
| `Ctrl+C` | 停止流式输出 / 退出 |
| `Ctrl+D` | 立即退出 |
| `Ctrl+L` | 新建会话 |
| `↑/↓` | 浏览输入历史 |

## 配置

默认数据库路径：`~/.chatcli/data.db`

### 添加新模型

```bash
# 交互式向导
/config model
```

向导会依次引导你填写：**名称 → API 地址 → API Key → 模型 ID**

### 常用 API 地址

| 服务商 | API 地址 |
|--------|----------|
| OpenAI | `https://api.openai.com/v1` |
| Anthropic | `https://api.anthropic.com` |
| OpenRouter | `https://openrouter.ai/api/v1` |
| DeepSeek | `https://api.deepseek.com` |
| 本地 Ollama | `http://localhost:11434/v1` |

### 预设

```bash
# 添加系统提示词预设
/config preset

# 查看和切换预设
/presets
```

## 安全

API Key 使用 **AES-256-CBC** 加密存储：

- 加密密钥存储在 `~/.chatcli/.encryption_key`（自动生成，权限 `chmod 600`）
- 数据库目录权限受限（`chmod 700`）
- 仅在 API 调用时解密
- 首次运行自动加密已有的明文 Key

## 技术栈

- [Ink](https://github.com/vadimdemedes/ink) — React for CLI
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — SQLite 存储
- [marked-terminal](https://github.com/mikaelbr/marked-terminal) — Markdown 渲染
- [chalk](https://github.com/chalk/chalk) — 终端颜色
- Node.js crypto — AES-256-CBC 加密

## 贡献

参见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证

[MIT](LICENSE) © [2663402852](https://github.com/2663402852)
