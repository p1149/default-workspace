<#
.SYNOPSIS
  登记一次性计划任务，N 秒后静默完成 DSH 更新。
#>
param([int]$DelaySeconds = 5)

$script = Join-Path $PSScriptRoot 'finish-dsh-update.ps1'
if (-not (Test-Path $script)) { throw "找不到 finish-dsh-update.ps1: $script" }

$name = 'LuolingweiFinishDSHUpdate'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ('-NoProfile -ExecutionPolicy Bypass -File "' + $script + '"')
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddSeconds($DelaySeconds)
$settings = New-ScheduledTaskSettingsSet -Hidden
Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null

Write-Output "已登记完成更新任务 $name（约 $DelaySeconds 秒后执行）。"
Write-Output "日志: D:\dsh\archives\finish-dsh-update.log"
