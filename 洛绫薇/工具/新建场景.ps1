<#
.SYNOPSIS
  场景构建：新建一个场景。
  定位卡 = 主人亲自写；身份卡 / 场景画像 = 工具生成（含卡指纹 / 会话 / 布局）；私有记忆 = 洛绫薇（本场景）维护。
.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File .\新建场景.ps1 -Name "工具链" -Icon "🔧" -Role "开发工具维护" -Desc "构建/依赖/工具链" -Target "工具链" -Color "#8b5cf6"
#>
param(
  [Parameter(Mandatory = $true)][string]$Name,
  [string]$Icon = '📁',
  [string]$Role = '',
  [string]$Desc = '',
  [string]$Target = '',
  [string]$Color = '#6b7280',
  [string]$Session = '（待绑定）',
  [int]$Order = 0
)

$ErrorActionPreference = 'Stop'
$ws = 'C:\Users\76927\Documents\deepseek-harness\default-workspace'
$sceneDir = Join-Path $ws "洛绫薇的记忆\框架\场景\$Name"
if (Test-Path $sceneDir) { throw "场景已存在: $sceneDir" }
New-Item -ItemType Directory -Force -Path $sceneDir | Out-Null

$utf8 = New-Object System.Text.UTF8Encoding($false)
function W($file, $content) {
  [System.IO.File]::WriteAllText((Join-Path $sceneDir $file), $content, $utf8)
}

$created = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
$sha1 = [System.Security.Cryptography.SHA1]::Create()
$fpBytes = $sha1.ComputeHash([System.Text.Encoding]::UTF8.GetBytes("$Name|$created"))
$fingerprint = (-join ($fpBytes | ForEach-Object { $_.ToString('x2') })).Substring(0, 12)

# --- 定位卡：只建骨架，主人亲自撰写 ---
W '定位卡.md' @"
# 场景 · $Name · 定位卡

> 【主人填写】本卡由主人亲自撰写；洛绫薇与工具只建骨架、不代填。

## 我是谁
（主人填写）

## 我负责什么
（主人填写）

## 边界
（主人填写）
"@

# --- 身份卡：工具生成（含卡指纹 / 会话 / 布局） ---
W '身份卡.md' @"
# 场景 · $Name · 身份卡

> 工具生成：卡指纹 / 会话 / 布局由工具写入。

## 身份
- 场景名：$Name
- 类型：项目
- 一句话：$Role

## 卡指纹
- 指纹：$fingerprint
- 生成时间：$created

## 会话
- 绑定会话：$Session

## 布局
- 图标：$Icon
- 颜色：$Color
- 顺序：$Order
- 目标：$Target
"@

# --- 场景画像：工具生成 ---
W '画像.md' @"
# 场景 · $Name · 画像

> 工具生成：随「自动归纳」更新。

## 卡指纹
- 指纹：$fingerprint

## 特征 / 状态
（待记录）

## 习惯 / 模式
（待记录）
"@

# --- 私有记忆：洛绫薇（本场景）维护，工具只建骨架 ---
W '记忆.md' @"
# 场景 · $Name · 记忆

> 私有记忆：由洛绫薇（本场景）维护，工具只建骨架；仅本场景可读写。
> 结构见 洛绫薇的记忆/框架/场景/私有记忆规范.md。

## 身份锚
- 场景名：$Name
- 卡指纹：$fingerprint
- 绑定会话：$Session

## 场景指针
- 项目：（待填）
- 记忆文件：洛绫薇的记忆/框架/场景/$Name/项目记忆.md
- 状态：（待填）
- 下一步：（待填）

## 最近归档
- （洛绫薇维护）
"@

W '项目记忆.md' @"
# 场景 · $Name · 项目记忆

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
"@

W '技能.md' @"
# 场景 · $Name · 技能

## 技能清单
- （待登记）
"@

Write-Output "六文件已建: $sceneDir"
Write-Output "定位卡：待主人填写；身份卡/画像：已由工具生成（指纹 $fingerprint）；私有记忆：洛绫薇维护"

# --- 更新场景索引 ---
$index = Join-Path $ws '洛绫薇的记忆\框架\共享\场景索引.md'
$row = "| $Name | ``洛绫薇的记忆/框架/场景/$Name/`` | $Role |"
$content = [System.IO.File]::ReadAllText($index, [System.Text.Encoding]::UTF8)
$idx = $content.IndexOf('| 客户交付 |')
if ($idx -ge 0) {
  $lineEnd = $content.IndexOf("`n", $idx)
  $content = $content.Substring(0, $lineEnd + 1) + $row + "`n" + $content.Substring($lineEnd + 1)
  [System.IO.File]::WriteAllText($index, $content, $utf8)
  Write-Output "场景索引已更新"
} else {
  Write-Output "警告：场景索引里没找到插入锚点（| 客户交付 |），请手动补一行"
}

Write-Output "场景构建完成: $Name"
