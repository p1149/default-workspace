# 共享层 · 可用 AI 参考

> 共享层 · 分区写 · 供主人 / 洛绫薇查阅的「在线 AI 服务」清单与 API 接入参考。
> **注意**：这些全是**在线服务**（需要联网），不是离线方案；离线仍用本地 Ollama `luolingwei`。
> **密钥安全**：本文件只写「申请入口 / 变量名」，**不写任何真实密钥**（依据全局 `AGENTS.md` 第 0 条）。

## 七个国产在线 AI

| # | 服务 | 官网 | API 地址（OpenAI 兼容） | 代表模型 | Cherry Studio |
|---|---|---|---|---|---|
| 1 | Kimi（月之暗面） | https://kimi.moonshot.cn/ | https://api.moonshot.cn/v1 | moonshot-v1-8k/32k/128k、kimi-k2 | ✅ 原生支持 Moonshot |
| 2 | 文心一言（百度） | https://yiyan.baidu.com/ | https://qianfan.baidubce.com/v2 | ernie-4.5、ernie-3.5 | ✅ 原生支持 百度千帆 |
| 3 | 通义千问（阿里） | https://tongyi.aliyun.com/qianwen/ | https://dashscope.aliyuncs.com/compatible-mode/v1 | qwen-max/plus/turbo、qwen3 | ✅ 原生支持 阿里云百炼 |
| 4 | 智谱清言（GLM） | https://chatglm.cn/ | https://open.bigmodel.cn/api/paas/v4 | glm-4.5、glm-4-flash | ✅ 原生支持 智谱 |
| 5 | DeepSeek | https://chat.deepseek.com/ | https://api.deepseek.com/v1 | deepseek-chat、deepseek-reasoner | ✅ 原生支持 DeepSeek |
| 6 | 腾讯元宝（混元） | https://yuanbao.tencent.com/chat | https://api.hunyuan.cloud.tencent.com/v1 | hunyuan-turbos 等 | ✅ 原生支持 腾讯混元 |
| 7 | 讯飞星火 | https://xinghuo.xfyun.cn/ | https://spark-api-open.xf-yun.com/v1 | Spark 4.0 Ultra 等 | ✅ 原生支持 讯飞星火 |

> API 地址以官方文档为准；模型名、价格会更新，接入前核对官网。

## 怎么接进 Cherry Studio
1. Cherry Studio → **设置 → 模型服务**；
2. 直接启用对应的**原生 provider**（Kimi / 千帆 / 通义 / 智谱 / DeepSeek / 混元 / 星火），填入**官方申请的 API Key**；
3. 或用「**自定义 OpenAI 兼容**」：Base URL 填上表地址、填入 Key、填模型名；
4. 保存 → 在对话界面选中该模型，即可对话。

## 备注
- 全部为**在线**；断网无效（断网用本地 `luolingwei`）。
- API Key 只保存在 Cherry Studio 的 provider 设置里（本地），**不要写进框架文件、不要提交**。
