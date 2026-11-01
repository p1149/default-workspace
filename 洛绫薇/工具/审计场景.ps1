<#
.SYNOPSIS
  场景审计：检查场景文件结构是否符合规范（构建 / 私有记忆 / 写回链）。
.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File .\审计场景.ps1 -Scene 自我复盘
  powershell -NoProfile -ExecutionPolicy Bypass -File .\审计场景.ps1 -All
#>
param(
  [string]$Scene = '',
  [switch]$All
)

$ErrorActionPreference = 'Stop'
$ws = 'C:\Users\76927\Documents\deepseek-harness\default-workspace'

if ($All) {
  $scenes = @(Get-ChildItem (Join-Path $ws '洛绫薇的记忆\框架\场景') -Directory | Select-Object -ExpandProperty Name)
} elseif ($Scene) {
  $scenes = @($Scene)
} else {
  throw '用法: .\审计场景.ps1 -Scene <场景名> 或 -All'
}

$totalFail = 0
foreach ($n in $scenes) {
  $dir = Join-Path $ws "洛绫薇的记忆\框架\场景\$n"
  if (-not (Test-Path $dir)) { Write-Output "跳过（不存在）: $n"; continue }

  $results = New-Object System.Collections.Generic.List[object]
  foreach ($f in '定位卡', '身份卡', '画像', '记忆', '项目记忆', '技能') {
    $results.Add([pscustomobject]@{ Check = "文件 $f.md"; Pass = (Test-Path (Join-Path $dir "$f.md")) })
  }

  $id = Get-Content (Join-Path $dir '身份卡.md') -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
  $results.Add([pscustomobject]@{ Check = '身份卡有 卡指纹/会话/布局'; Pass = (($id -match '指纹：') -and ($id -match '## 会话') -and ($id -match '## 布局')) })

  $mem = Get-Content (Join-Path $dir '记忆.md') -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
  $results.Add([pscustomobject]@{ Check = '私有记忆有 身份锚 + 场景指针'; Pass = (($mem -match '## 身份锚') -and ($mem -match '## 场景指针')) })

  $pm = Get-Content (Join-Path $dir '项目记忆.md') -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
  $results.Add([pscustomobject]@{ Check = '项目记忆有 7 字段摘要'; Pass = ($pm -match '7 字段摘要') })

  $pos = Get-Content (Join-Path $dir '定位卡.md') -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
  $results.Add([pscustomobject]@{ Check = '定位卡已由主人填写（无【主人填写】占位）'; Pass = ($pos -notmatch '【主人填写】') })

  $fail = @($results | Where-Object { -not $_.Pass }).Count
  $totalFail += $fail

  Write-Output "=== 场景: $n ==="
  $results | Format-Table -AutoSize | Out-String | Write-Output
  if ($fail -eq 0) { Write-Output '结果: 全部通过 [OK]' } else { Write-Output "结果: $fail 项未通过 [WARN]" }
  Write-Output ''
}

if ($totalFail -eq 0) { Write-Output '审计总结: 全部通过 [OK]' } else { Write-Output "审计总结: 共 $totalFail 项未通过 [WARN]" }
