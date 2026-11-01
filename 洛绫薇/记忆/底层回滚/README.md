# 底层回滚（引擎 + 底层 + 界面 + Host 插件）

洛绫薇的底层改动**回滚机制**：每次动底层前拍快照，出问题一键回滚。

## 四层（2026-10-30 补 host 层）
| 层 | 内容 | 回滚方式 |
|---|---|---|
| **引擎** | DSH profile 配置（模型 / provider / 插件行）+ `~/.dsh/AGENTS.md` + `profile/package.json` / `pnpm-lock.yaml` | 从快照复制回 profile |
| **底层** | 工作区 `AGENTS.md` + git commit | 按快照 commit 恢复工作区 |
| **界面** | UI 插件目录（scenes-panel / remote-control / sidebar-* / top-nav / web-browser / image-edits / ai-evolution） | 从快照复制回工作区 |
| **Host** | Host 侧插件目录（llm-ollama / memory-inject / session-briefing；`session-rotation` 已于 2026-10-30 删除） | 从快照复制回工作区（junction 安装的源码即生效） |

> 为什么补 host 层：2026-10-30 体检发现 Host 插件改坏了**不在任何快照层**，属回滚盲区。

## ⚠ 2026-11-01 07:36 修正（目录重构后原脚本失效）

- 本地插件已在 2026-11-01 04:5x 重构为 `界面插件/`（界面侧）与 `插件/`（Host 侧）两个容器目录，**旧的按平铺名字拍快照会静默拍空**。
- 已把 `snapshot.ps1` 的清单改为**按容器整体拍**：`ui` 层含 `界面插件/`，`host` 层含 `插件/`；旧的平铺名字保留，兼容老快照。
- `restore.ps1` 无需改：它按 `ui\<name>` / `host\<name>` 还原到工作区同名目录，容器目录天然对得上。
- 同日补齐另外两个空档：① 看门狗的 `D:\dsh\archives\dsh-profile-good\` 已存入 `package.json` / `cordis.patch.yml` / `cordis.yml`（此前为空，启动回滚是空转）；② 会话档案库 `D:\dsh\archives\洛绫薇-会话档案\` 已建首个批次。
- **仍未做**：`restore.ps1` 的端到端演练（会覆盖现役，需专程做一次受控演练）。

## 用法
> 注意：本机执行策略禁止运行未签名脚本，所以用 `-ExecutionPolicy Bypass` 调用。

```powershell
# 拍快照（改动前）
powershell -NoProfile -ExecutionPolicy Bypass -File .\snapshot.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\snapshot.ps1 -Label before-model-switch
powershell -NoProfile -ExecutionPolicy Bypass -File .\snapshot.ps1 -Scope host

# 列出快照
powershell -NoProfile -ExecutionPolicy Bypass -File .\restore.ps1 -List

# 回滚到某个快照
powershell -NoProfile -ExecutionPolicy Bypass -File .\restore.ps1 -Snapshot 20261030_094155-initial
powershell -NoProfile -ExecutionPolicy Bypass -File .\restore.ps1 -Snapshot <名> -Scope host
```

## 说明
- 快照存在 `底层回滚/snapshots/<时间[-标签]>/`；
- 回滚前**会先把当前状态再拍一个 `pre-restore` 快照**（防误操作）；
- 引擎配置（模型 / 插件）改完**需重启 DSH** 才生效；
- Host 插件源码改动**需重启 DSH** 才加载新代码；
- 底层工作区文件可另用 `git checkout <commit> -- .` 精确恢复（快照里记了 commit）。

## 配套：洛绫薇会话档案库

- **重要底层动作前**，除了拍快照，还要拍一批会话档案：`tools\备份会话档案.ps1 -Label <原因>`。
- 档案库位置：`D:\dsh\archives\洛绫薇-会话档案\`（规则见其 `README.md`，只进不改、有批次索引）。
- 分工：**本目录**管 profile / 插件 / 配置 / 界面 / Host 源码；**档案库**管会话记录（sessions / projcache / 映射 / 定时）。两者互补。
- **不挂定时任务**（主人 2026-10-30 20:2x 明定），按需手动执行。

## 目录
```
底层回滚/
├── README.md
├── snapshot.ps1      # 拍快照（engine / lowlevel / ui / host）
├── restore.ps1       # 回滚 / 列快照
└── snapshots/        # 快照（自动生成）
```
