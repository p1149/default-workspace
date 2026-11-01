<#
.SYNOPSIS
  登记一次性计划任务，在 N 秒后静默重启 DSH。
  计划任务用 wscript.exe 跑 restart-dsh-hidden.vbs（隐藏控制台，无窗口闪），
  再由 VBS 静默拉起 restart-dsh.ps1。计划任务独立于 DSH 进程树，杀 DSH 不影响它。
.EXAMPLE
  .\restart-dsh-schedule.ps1 -DelaySeconds 5
#>
param([int]$DelaySeconds = 5)

$vbs = Join-Path $PSScriptRoot 'restart-dsh-hidden.vbs'
if (-not (Test-Path $vbs)) { throw "找不到 restart-dsh-hidden.vbs: $vbs" }

$name = 'LuolingweiRestartDSH'
$action = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument ('"' + $vbs + '"')
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddSeconds($DelaySeconds)
$settings = New-ScheduledTaskSettingsSet -Hidden
Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null

Write-Output "已登记静默重启任务 $name（约 $DelaySeconds 秒后执行，无控制台窗口）。"
Write-Output "日志: D:\dsh\archives\restart-dsh.log"
