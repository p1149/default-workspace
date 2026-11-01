<#
.SYNOPSIS
  客户目录：新建 / 列出客户工作目录（规范见 D:\workspaces\客户\README.md）。
.DESCRIPTION
  一个客户 = 一个目录（客户卡 + 00_需求 / 01_方案 / 02_源码 / 03_交付 / 04_记录）。
  新建后自动在「客户登记表」追加一行；密码/敏感信息不落盘，联系人只写代称。
.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File .\新建客户目录.ps1 -Customer ACME-001
.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File .\新建客户目录.ps1 -List
#>
param(
  [string]$Customer = '',
  [string]$Root = 'D:\workspaces\客户',
  [switch]$List
)

$ErrorActionPreference = 'Stop'
$utf8 = New-Object System.Text.UTF8Encoding($false)
function WriteText([string]$file, [string]$content) { [System.IO.File]::WriteAllText($file, $content, $utf8) }
function ReadText([string]$file) { [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8) }
function EnsureDir([string]$p) { if (-not (Test-Path $p)) { New-Item -ItemType Directory -Force -Path $p | Out-Null } }

$subs = @('00_需求', '01_方案', '02_源码', '03_交付', '04_记录')
EnsureDir $Root

# --- 列出客户 ---
if ($List) {
  $dirs = Get-ChildItem $Root -Directory | Where-Object { $_.Name -ne '_模板' } | Sort-Object Name
  if (-not $dirs) {
    Write-Output '暂无客户目录'
  } else {
    foreach ($c in $dirs) {
      $card = Join-Path $c.FullName '客户卡.md'
      if (Test-Path $card) {
        $state = ((ReadText $card) -split "`r?`n" | Where-Object { $_ -match '当前状态' } | Select-Object -First 1) -replace '^-\s*', ''
      } else {
        $state = '（缺客户卡）'
      }
      $t = $c.LastWriteTime.ToString('yyyy-MM-dd HH:mm')
      Write-Output ("{0}  |  {1}  |  {2}" -f $c.Name, $t, $state)
    }
  }
  exit 0
}

# --- 新建客户 ---
if (-not $Customer) { throw '请用 -Customer <代号> 指定客户代号（或 -List 列出）' }
if ($Customer -notmatch '^[A-Za-z0-9][A-Za-z0-9_\-]{0,31}$') {
  throw "客户代号不合法: $Customer（只能字母/数字/下划线/短横，1-32 位，且不以 _ 开头）"
}

$dst = Join-Path $Root $Customer
if (Test-Path $dst) { throw "客户目录已存在: $dst" }

EnsureDir (Join-Path $Root '_模板')
foreach ($d in $subs) { EnsureDir (Join-Path (Join-Path $Root '_模板') $d) }

New-Item -ItemType Directory -Force -Path $dst | Out-Null
foreach ($d in $subs) { EnsureDir (Join-Path $dst $d) }

$stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'

# --- 客户卡（模板替换） ---
$tplCard = Join-Path (Join-Path $Root '_模板') '客户卡.md'
if (Test-Path $tplCard) {
  $card = ReadText $tplCard
} else {
  $card = "# 客户卡 · {{客户代号}}`n`n## 基本信息`n- 客户代号：{{客户代号}}`n- 客户名称（可模糊）：（待填）`n- 联系人（代称）：（待填）`n- 建档时间：{{建档时间}}`n`n## 状态`n- 当前状态：建档`n- 下一步：（待填）`n"
}
$card = $card.Replace('{{客户代号}}', $Customer).Replace('{{建档时间}}', $stamp)
WriteText (Join-Path $dst '客户卡.md') $card

# --- 客户登记表（占位行替换 / 追加） ---
$regPath = Join-Path $Root '客户登记表.md'
if (-not (Test-Path $regPath)) {
  $reg = "# 客户登记表`n`n| 客户代号 | 客户名称（可模糊） | 状态 | 目录 | 负责 | 建档时间 | 最近更新 |`n|---|---|---|---|---|---|---|`n"
} else {
  $reg = ReadText $regPath
}
$row = "| $Customer | （待填） | 建档 | " + '`' + $dst + '`' + " | 客户交付 | $stamp | $stamp |"
$placeholder = (($reg -split "`r?`n") | Where-Object { $_ -like '| — |*' } | Select-Object -First 1)
if ($placeholder) {
  $reg = $reg.Replace($placeholder, $row)
} else {
  $reg = $reg.TrimEnd() + "`n" + $row + "`n"
}
WriteText $regPath $reg

Write-Output "客户目录已建: $dst"
Write-Output "客户卡: $(Join-Path $dst '客户卡.md')（状态：建档，待填范围 / 验收）"
Write-Output "登记表已更新: $regPath"
Write-Output "提示：客户真实信息能模糊就模糊，联系人只写代称；构建产物去 D:\dsh\builds\$Customer\"
