<#
.SYNOPSIS
  洛绫薇 · 会话档案库一键备份：新建批次 + MANIFEST + SHA256SUMS + 追加 INDEX。
.DESCRIPTION
  档案库：D:\dsh\archives\洛绫薇-会话档案\（规则见其 README.md）
  每批次 = 一个时间戳目录，含 sessions\ + storages-session_projcache\ + workspace/schedule + 清单。
  只进不改：已存在同名批次会报错退出。
.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\备份会话档案.ps1
  powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\备份会话档案.ps1 -Label 升级前
#>
param([string]$Label = '')

$ErrorActionPreference = 'Stop'
$archive = 'D:\dsh\archives\洛绫薇-会话档案'
$storages = Join-Path $env:USERPROFILE '.dsh\storages'
$srcSessions = Join-Path $env:USERPROFILE '.dsh\sessions'
$srcCache = Join-Path $storages 'session_projcache'

if (-not (Test-Path $archive)) { New-Item -ItemType Directory -Force -Path $archive | Out-Null }

$stamp = Get-Date -Format 'yyyyMMdd_HHmm'
$name = if ($Label) { "$stamp-$Label" } else { $stamp }
$batch = Join-Path $archive "批次\$name"
if (Test-Path $batch) { throw "批次已存在，不覆盖（只进不改）: $batch" }
New-Item -ItemType Directory -Force -Path $batch | Out-Null

robocopy $srcSessions (Join-Path $batch 'sessions') /E /NFL /NDL /NJH /NJS /R:1 /W:1 | Out-Null
$rc1 = $LASTEXITCODE
robocopy $srcCache (Join-Path $batch 'storages-session_projcache') /E /NFL /NDL /NJH /NJS /R:1 /W:1 | Out-Null
$rc2 = $LASTEXITCODE
foreach ($f in 'workspace.json', 'schedule.json') {
  $src = Join-Path $storages $f
  if (Test-Path $src) { Copy-Item $src $batch -Force }
}

$files = Get-ChildItem $batch -Recurse -File | Where-Object { $_.Name -notin @('MANIFEST.txt', 'SHA256SUMS.txt') } | Sort-Object FullName
$rows = foreach ($file in $files) {
  $h = (Get-FileHash $file.FullName -Algorithm SHA256).Hash
  '{0}  {1,10}  {2}' -f $h, $file.Length, $file.FullName.Substring($batch.Length + 1).Replace('\', '/')
}
$totalMB = [math]::Round(($files | Measure-Object Length -Sum).Sum / 1MB, 2)
$header = @(
  '洛绫薇 · 会话记录全量备份',
  "batch   : $name",
  "created : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
  "source  : $srcSessions + $srcCache",
  "size    : $totalMB MB (uncompressed)",
  'note    : DSH 运行中备份时，当前活跃会话日志在复制后仍会写入，不代表最终态',
  'restore : 停 DSH 后，把 sessions\ 内容复制回 ~\.dsh\sessions\；storages-session_projcache\ 复制回 ~\.dsh\storages\session_projcache\',
  '',
  'SHA256                                                            SIZE  PATH'
)
[System.IO.File]::WriteAllText(
  (Join-Path $batch 'MANIFEST.txt'),
  ($header + $rows) -join "`r`n",
  (New-Object System.Text.UTF8Encoding($false))
)
($rows -replace '^(\w+)\s+\d+\s+', '$1  ') | Set-Content (Join-Path $batch 'SHA256SUMS.txt') -Encoding ASCII

$indexFile = Join-Path $archive 'INDEX.md'
$line = "| ``$name`` | $(Get-Date -Format 'yyyy-MM-dd HH:mm') | sessions + session_projcache + workspace/schedule | $($files.Count) | $totalMB MB | 见 MANIFEST | $Label |"
Add-Content -Path $indexFile -Value $line -Encoding UTF8

Write-Output "批次已建: $batch"
Write-Output ("robocopy rc: sessions=$rc1 cache=$rc2（0-7 为成功）")
Write-Output ("文件数: " + $files.Count + " / 大小: " + $totalMB + " MB")
Write-Output "已追加索引: $indexFile"
