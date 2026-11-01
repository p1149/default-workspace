<#
.SYNOPSIS
  任务看板「通知」助手：给目标场景的绑定会话发一条「请读任务看板、领取工作」的消息。
.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File .\notify-scene.ps1 -Scene 底层改造
#>
param(
  [Parameter(Mandatory = $true)][string]$Scene,
  [string]$Message = ''
)

$ErrorActionPreference = 'Stop'
$ws = 'C:\Users\76927\Documents\deepseek-harness\default-workspace'
$card = Join-Path $ws "洛绫薇的记忆\框架\场景\$Scene\身份卡.md"
if (-not (Test-Path $card)) { throw "找不到场景身份卡: $card" }

$text = [System.IO.File]::ReadAllText($card, [System.Text.Encoding]::UTF8)
$m = [regex]::Match($text, '绑定会话[：:]\s*`?(session-[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})')
if (-not $m.Success) {
  Write-Output "场景「$Scene」未绑定会话（身份卡里没有 session id）——无法通知。"
  exit 2
}
$sessionId = $m.Groups[1].Value

if ([string]::IsNullOrWhiteSpace($Message)) {
  $Message = "「任务看板 → $Scene」：请读 洛绫薇的记忆/框架/共享/任务看板.md，领取待办里属于「$Scene」的工作；领取后在任务看板「领取」栏标记，干完写「完成回执」。"
}

$body = @{ sessionId = $sessionId; message = $Message } | ConvertTo-Json -Compress
$bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)
Write-Output ("通知场景「$Scene」的会话 " + $sessionId)
try {
  $r = Invoke-RestMethod -Uri 'http://127.0.0.1:7123/api/notify' -Method Post -Body $bodyBytes -ContentType 'application/json; charset=utf-8' -TimeoutSec 10
  Write-Output ("通知已送达: " + ($r | ConvertTo-Json -Compress))
} catch {
  Write-Output ("通知失败: " + $_.Exception.Message)
  exit 1
}
