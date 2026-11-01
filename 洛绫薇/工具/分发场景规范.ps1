<#
.SYNOPSIS
  分发场景规范：把现有场景的 身份卡 / 记忆 / 项目记忆 升级到新结构
  （身份卡含卡指纹/会话/布局；记忆=身份锚+场景指针+最近归档；项目记忆=7字段摘要+确认候选）。
  旧内容保留在「## 历史（迁移前）」下，不丢失。
#>
param()

$ErrorActionPreference = 'Stop'
$ws = 'C:\Users\76927\Documents\deepseek-harness\default-workspace'
$utf8 = New-Object System.Text.UTF8Encoding($false)

$scenes = @(
  @{ Name = '自我复盘'; Icon = '🔍'; Color = '#7c3aed'; Target = '复盘';      Role = '自我复盘 / 回顾总结';          Order = 0 },
  @{ Name = '本地电脑'; Icon = '💻'; Color = '#0891b2'; Target = '本机维护';  Role = '本地电脑清理 / 体检';         Order = 1 },
  @{ Name = '底层改造'; Icon = '⚙️'; Color = '#d97706'; Target = 'harness';   Role = 'DSH 引擎 / harness 底层改造'; Order = 2 },
  @{ Name = '客户交付'; Icon = '📦'; Color = '#16a34a'; Target = '客户';      Role = '客户项目交付';                Order = 3 }
)

function Write-File($path, $content) {
  [System.IO.File]::WriteAllText($path, $content, $utf8)
}

foreach ($s in $scenes) {
  $name = $s.Name
  $dir = Join-Path $ws "洛绫薇的记忆\框架\场景\$name"
  if (-not (Test-Path $dir)) { Write-Output "跳过（不存在）: $name"; continue }

  $created = (Get-Item $dir).CreationTime.ToString('yyyy-MM-dd HH:mm:ss')
  $sha1 = [System.Security.Cryptography.SHA1]::Create()
  $fpBytes = $sha1.ComputeHash([System.Text.Encoding]::UTF8.GetBytes("$name|$created"))
  $fp = (-join ($fpBytes | ForEach-Object { $_.ToString('x2') })).Substring(0, 12)

  # 1. 身份卡
  $identity = @"
# 场景 · $name · 身份卡

> 工具生成：卡指纹 / 会话 / 布局由工具写入。

## 身份
- 场景名：$name
- 类型：项目
- 一句话：$($s.Role)

## 卡指纹
- 指纹：$fp
- 生成时间：$created

## 会话
- 绑定会话：（待绑定）

## 布局
- 图标：$($s.Icon)
- 颜色：$($s.Color)
- 顺序：$($s.Order)
- 目标：$($s.Target)
"@
  Write-File (Join-Path $dir '身份卡.md') $identity

  # 2. 记忆（保留旧内容到「历史（迁移前）」）
  $memPath = Join-Path $dir '记忆.md'
  $oldMem = if (Test-Path $memPath) { Get-Content $memPath -Raw -Encoding UTF8 } else { '' }
  $mem = @"
# 场景 · $name · 记忆

> 私有记忆：由洛绫薇（本场景）维护，工具只建骨架；仅本场景可读写。
> 结构见 洛绫薇的记忆/框架/场景/私有记忆规范.md。

## 身份锚
- 场景名：$name
- 卡指纹：$fp
- 绑定会话：（待绑定）

## 场景指针
- 项目：（待填）
- 记忆文件：洛绫薇的记忆/框架/场景/$name/项目记忆.md
- 状态：（待填）
- 下一步：（待填）

## 最近归档
- （洛绫薇维护）

## 历史（迁移前）
$oldMem
"@
  Write-File $memPath $mem

  # 3. 项目记忆（7 字段摘要 + 确认候选，旧内容进历史）
  $pmPath = Join-Path $dir '项目记忆.md'
  $oldPm = if (Test-Path $pmPath) { Get-Content $pmPath -Raw -Encoding UTF8 } else { '' }
  $pm = @"
# 场景 · $name · 项目记忆

> 项目记忆：只放 **7 字段摘要 + 确认候选**；细节回真实项目看。
> 流程见 洛绫薇的记忆/框架/场景/写回链规范.md（自动归纳 → owner 确认 → 写回）。

## 7 字段摘要
| # | 字段 | 内容 |
|---|---|---|
| 1 | 项目 | （待填） |
| 2 | 状态 | （待填） |
| 3 | 产物 | （待填） |
| 4 | 证据 | （待填） |
| 5 | 事实源头 | （待填） |
| 6 | 下一步 | （待填） |
| 7 | 确认 | （待填：owner + 时间） |

## 确认候选
| # | 候选内容 | 来源 | owner 决定 | 写回时间 |
|---|---|---|---|---|
| — | （暂无） | | | |

## 历史（迁移前）
$oldPm
"@
  Write-File $pmPath $pm

  Write-Output "已分发: $name（指纹 $fp）"
}

Write-Output '场景规范分发完成。'
