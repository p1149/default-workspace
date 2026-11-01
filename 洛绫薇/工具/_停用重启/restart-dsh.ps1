<#
.SYNOPSIS
  重启 DSH（洛绫薇用）。先等 2 秒、杀 DeepSeek Harness、等 3 秒、重新拉起。
  必须由「独立进程」或「计划任务」运行：否则杀掉 DSH 时会把本脚本一起带走。
.PARAMETER DryRun
  只打印将做什么，不真的杀/起。
#>
param([switch]$DryRun)

$dshExe = 'C:\Users\76927\AppData\Local\Programs\DeepSeek Harness\DeepSeek Harness.exe'
$logDir = 'D:\dsh\archives'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir 'restart-dsh.log'

function Log([string]$m) {
  $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $m"
  Write-Output $line
  Add-Content -Path $log -Value $line
}

Log "重启脚本启动（DryRun=$DryRun）"

if ($DryRun) {
  Log "DryRun：将终止 'DeepSeek Harness' 进程，并在 3 秒后重新拉起 $dshExe"
  return
}

Start-Sleep -Seconds 2
Get-Process 'DeepSeek Harness' -ErrorAction SilentlyContinue | Stop-Process -Force
Log '已终止 DSH'
Start-Sleep -Seconds 3
Start-Process -FilePath $dshExe
Log '已重新启动 DSH'
