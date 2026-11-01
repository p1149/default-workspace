<#
.SYNOPSIS
  登记一次性计划任务，N 秒后显示倒计时并重启 DSH。
.EXAMPLE
  .\restart-dsh-countdown-schedule.ps1 -DelaySeconds 5 -Countdown 5
#>
param([int]$DelaySeconds = 3, [int]$Countdown = 5)

$script = Join-Path $PSScriptRoot 'restart-dsh-countdown.ps1'
if (-not (Test-Path $script)) { throw "找不到 restart-dsh-countdown.ps1: $script" }

$name = 'LuolingweiRestartCountdown'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ('-NoProfile -ExecutionPolicy Bypass -File "' + $script + '" -Seconds ' + $Countdown)
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddSeconds($DelaySeconds)
Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Force | Out-Null

Write-Output "已登记倒计时重启任务 $name（$DelaySeconds 秒后显示 $Countdown 秒倒计时）。"
Write-Output "日志: D:\dsh\archives\restart-dsh.log"
