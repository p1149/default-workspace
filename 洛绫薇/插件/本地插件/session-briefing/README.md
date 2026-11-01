# session-briefing · 会话开场简报

> 场景「底层改造」定位卡第 ① 项：**会话开场自动注入简报**。
> 纯 Host 插件，零 `@deepseek-ai` 依赖，fail-open，只对 workspace 内主会话注入一次。

## 一、它做什么

每个会话在**第一次准备步骤**时，往请求消息末尾注入一条 user 上下文（带来源标记
`source.kind = "session-briefing"`、`form = "snapshot"`），内容是从工作区现读现拼的简报：

| 块 | 来源 | 说明 |
|---|---|---|
| 全局须知（原话） | `框架/共享/参考.md` → `一、全局须知` | 只认主人与洛绫薇原话 |
| 场景与归档 | `框架/共享/场景索引.md` 表格 / `框架/场景/` 目录 | 场景清单 + 最新交接归档文件名 |
| 任务看板 | `框架/共享/任务看板.md` | 待办 + 最近 2 条回执 + 通知 |
| 健康摘要 · 待关注 | `框架/共享/健康摘要.md` | 只带「待关注」 |
| 记忆 · 当前状态 | `框架/洛绫薇的记忆.md` → `当前状态` | 快照，不读全量 |
| 开场必读顺序 | 固定文案 | 法则 → 规则 → 记忆 → 参考 → 看板 → 健康 → 最新归档 |

真实输出约 **1.5k 字符**（≈ 600–800 token），`maxChars` 可调。

## 二、原理（照着 DSH 官方 `time-context` 插件写）

```js
ctx.on('agent/pre-step', async (payload, next) => {
  const decision = await next()
  // ……判断 workspace / 是否已注入 / 组装简报……
  return { ...decision, messages: [...decision.messages, 简报消息] }
}, { prepend: true })
```

- 注入的消息由本插件自造：`{ id, role: 'user', content: [{type:'text',text}], source: { kind: 'session-briefing', form: 'snapshot', sections: [{ name, text }] } }`。
- 「模型可见 ⟺ 已记日志」：消息进会话日志，重放/审计可见。
- **去重**：会话历史里已有 `source.kind === 'session-briefing'` 的 `user/message` 即视为已开场；内存 Set 做快路径。
- **豁免**：`origin === 'subagent'` 或 `delegationDepth > 0` 的子代理会话不注入；`cwd` 不在 `workspace` 内不注入。

## 三、配置（`cordis.patch.yml` 里生效）

| 键 | 默认 | 说明 |
|---|---|---|
| `enabled` | `true` | `false` = 不注册监听 |
| `workspace` | 插件目录上一级 | 只对这一目录下的主会话注入 |
| `maxChars` | `2400` | 简报总字符上限（超出按节截断） |
| `boardReceipts` | `2` | 带几条最近完成回执 |
| `sceneChars` / `boardChars` / `healthChars` / `memoryChars` / `referenceChars` | 240 / 700 / 320 / 700 / 320 | 各节独立上限 |
| `files.*` | 见 `index.js` DEFAULTS | 各简报来源文件（相对 workspace） |

## 四、fail-open 与边界

- 读文件失败、组装失败、注入失败：**只写 stderr（`warn`），原样返回决策**，不阻断会话。
- 文件读不到时对应块直接省略；全空则**不注入**（不会塞一条空简报）。
- 不改会话历史、不删消息、不碰 profile。

## 五、验证

```powershell
cd session-briefing
node --check index.js                      # 期望 exit 0
node test\briefing.test.mjs                # 期望「OK: session-briefing 单测全部通过（14 项）」exit 0
```

单测覆盖：注入时机 / 同会话去重 / 子代理豁免 / workspace 过滤 / reject 放行 / 跨重启历史去重 / fail-open / 字符截断 / eligible。

## 六、安装（本轮只建包，**未安装**）

```powershell
# 1) 先拍快照（底层回滚铁律）
powershell -NoProfile -ExecutionPolicy Bypass -File .\底层回滚\snapshot.ps1 -Label before-enable-briefing

# 2) 用 DSH 的 plugin_manager install_bundle 安装（不要手改 profile 文件）
#    GUI：Plugins → 安装本地 bundle → 选 session-briefing/
#    装完需重启 DSH 才加载新代码

# 3) 验证：新会话开场应看到一条「【洛绫薇 · 会话开场简报】」上下文卡片
```

回退：`dsh plugin --profile desktop remove @local/session-briefing`，或从 `底层回滚/snapshots/<时间>-before-enable-briefing/` 恢复 profile。
