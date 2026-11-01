<#
.SYNOPSIS
  完成 DSH 更新：安装器已把新版本解压到 DeepSeek Harness.new-*，
  这里杀旧进程 → 旧目录改名 .old → 新目录就位 → 拉起新 DSH。
  必须由独立进程/计划任务运行。
#>
$ErrorActionPreference = 'Stop'

$base = 'C:\Users\76927\AppData\Local\Programs'
$log = 'D:\dsh\archives\finish-dsh-update.log'

function Log([string]$m) {
  $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $m"
  Write-Output $line
  Add-Content -Path $log -Value $line
}

$new = Get-ChildItem $base -Directory -Filter 'DeepSeek Harness.new-*' -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $new) { Log '没有 DeepSeek Harness.new-* 目录，无需完成。'; exit 0 }

$dsh = Join-Path $base 'DeepSeek Harness'
$old = Join-Path $base 'DeepSeek Harness.old'

Log ('新版本目录: ' + $new.Name)
Get-Process 'DeepSeek Harness' -ErrorAction SilentlyContinue | Stop-Process -Force
Log '已终止 DSH'
Start-Sleep -Seconds 3

if (Test-Path $old) { Remove-Item $old -Recurse -Force -ErrorAction SilentlyContinue }
Move-Item $dsh $old
Log '旧版本已移到 DeepSeek Harness.old'
Move-Item $new.FullName $dsh
Log '新版本已就位'
Start-Sleep -Seconds 2
Start-Process -FilePath (Join-Path $dsh 'DeepSeek Harness.exe')
Log '已启动新 DSH'
