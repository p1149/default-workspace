<#
.SYNOPSIS
  自动归纳辅助：收集「真实项目」输入 → 生成候选清单草稿（**不写入正式记忆**）。
  洛绫薇据此提炼候选 → 主人确认 → 写回项目记忆。
.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File .\归纳候选.ps1 -Scene "底层改造" -Project "D:\dsh\builds\bt-control"
#>
param(
  [Parameter(Mandatory = $true)][string]$Scene,
  [string]$Project = ''
)

$ErrorActionPreference = 'Stop'
$ws = 'C:\Users\76927\Documents\deepseek-harness\default-workspace'
$sceneDir = Join-Path $ws "洛绫薇的记忆\框架\场景\$Scene"
if (-not (Test-Path $sceneDir)) { throw "找不到场景: $sceneDir" }

$out = New-Object System.Collections.Generic.List[string]
$out.Add("# 归纳候选草稿（场景：$Scene · $(Get-Date -Format 'yyyy-MM-dd HH:mm')）")
$out.Add('')
$out.Add('> 工具只收集输入、**不写正式记忆**。洛绫薇提炼候选 → 主人确认 → 写回项目记忆。')
$out.Add('')

# 1. 场景现有记忆（只读）
foreach ($f in '记忆.md', '项目记忆.md') {
  $p = Join-Path $sceneDir $f
  if (Test-Path $p) {
    $out.Add("## 现有 $f")
    $out.Add('```')
    $out.Add((Get-Content $p -Encoding UTF8 -Raw))
    $out.Add('```')
    $out.Add('')
  }
}

# 2. 真实项目输入
if ($Project) {
  $out.Add("## 真实项目：$Project")
  if (Test-Path $Project) {
    $items = Get-ChildItem $Project -ErrorAction SilentlyContinue | Select-Object -First 40
    $out.Add('| 名称 | 类型 | 大小 |')
    $out.Add('|---|---|---|')
    foreach ($i in $items) {
      $kind = if ($i.PSIsContainer) { '目录' } else { '文件' }
      $out.Add("| $($i.Name) | $kind | $($i.Length) |")
    }
    $readme = Join-Path $Project 'README.md'
    if (Test-Path $readme) {
      $out.Add('')
      $out.Add('### README（前 40 行）')
      $out.Add('```')
      $out.Add(((Get-Content $readme -Encoding UTF8 | Select-Object -First 40) -join "`n"))
      $out.Add('```')
    }
  } else {
    $out.Add('（路径不存在）')
  }
  $out.Add('')
}

# 3. 候选清单模板（洛绫薇提炼后填）
$out.Add('## 候选清单（洛绫薇提炼）')
$out.Add('')
$out.Add('| # | 候选内容 | 来源（真实项目） | 建议写回 | owner 决定 |')
$out.Add('|---|---|---|---|---|')
$out.Add('| 1 | （待提炼） | | 项目记忆 → 状态 | 待确认 |')
$out.Add('')

$file = Join-Path $sceneDir ('归纳候选-' + (Get-Date -Format 'yyyyMMdd_HHmmss') + '.md')
[System.IO.File]::WriteAllText($file, ($out -join "`n"), (New-Object System.Text.UTF8Encoding($false)))
Write-Output "候选草稿已生成: $file"
