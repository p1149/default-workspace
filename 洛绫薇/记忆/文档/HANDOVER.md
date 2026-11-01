# 交接文档 —— DeepSeek Harness 架构分析

## 概况

- 交接日期:2026-10-29(北京时间)
- 会话内容:分析工作区 `deepseek-harness/` 项目代码结构,产出一张 Mermaid 架构图,并制作离线预览页。
- 项目结论:DSH 是插件化 AI 智能体运行平台(pnpm monorepo),所有功能都是 Cordis 插件、可插拔,没有特权核心;连主循环、工具注册、会话记录本身都是插件。

## 交付物

| 文件 | 说明 |
|---|---|
| diagram/index.html | 架构图离线预览页,双击用浏览器打开,可滚轮缩放、拖拽移动 |
| diagram/mermaid.min.js | 本地渲染库(mermaid 11.17.2),保证离线可用 |
| diagram/architecture.mmd | 架构图纯 Mermaid 源码,可直接粘贴到支持 Mermaid 的平台 |
| HANDOVER.md | 本文件 |

## 架构图要点(给不懂代码的人)

1. 五扇门(蓝):网页 / 桌面 / 命令行 dsh / Python 包 / ACP 自动化接口,殊途同归。
2. 装配车间(黄):Profile(配置清单)决定装哪些 Bundle(零件包),每次启动现装一棵"插件树"。
3. 大脑(橙):Agent Loop(总指挥)循环"问模型 → 用工具 → 再问";Session 记下每一步;Tools 登记所有工具;LLM 适配器负责和大模型对话。
4. 能力插件(绿):对外连接 / 操作电脑 / 协作工作流 / 安全与数据,四组均可插拔。
5. 外部世界(灰):大模型 API、互联网、你的电脑、第三方 MCP 工具。
6. 地基(棕):自带 Cordis 框架、原生加速 native、Python 运行时、文档站、基准测试。

## 目录与图中模块的对应关系

| 真实目录 | 图中角色 |
|---|---|
| apps/cli、apps/web、apps/desktop | 使用入口:dsh 命令、网页、桌面应用 |
| packages/bundle/ | 零件包(web-app、headless、sdk-app、acp-app 等) |
| packages/core/、packages/boot/ | 大脑:agent-loop、session、tools、llm、app-boot |
| packages/ 其余分组 | 能力插件(llm、shell、sandbox、fs、mcp、subagent、skill 等) |
| python/sdk、python/sdk-runtime | Python 门及其运行时 |
| vendor/(cordis 等) | 自带插件框架地基 |
| native/system | 原生加速模块 |
| website/、benchmarks/、docs/ | 文档站、性能体检、说明手册 |

依据来源:deepseek-harness/AGENTS.md(仓库布局)、deepseek-harness/docs/architecture.md(插件树与运行原理)。

## 后续可选事项

- 补充"一次对话完整旅程"时序图(消息如何从输入走到模型再到工具)
- 导出 PNG / SVG 高清图
- 仓库自带 `pnpm run verify-mermaid` 可校验 Mermaid 语法
