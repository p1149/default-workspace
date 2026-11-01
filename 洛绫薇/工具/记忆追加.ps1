<#
.SYNOPSIS
  记忆追加 —— 给 洛绫薇的记忆/框架/洛绫薇的记忆.md 追加一条「当前状态」。
.DESCRIPTION
  规则第十五条：记忆单写者。本脚本 = 主会话的写入通道，带文件锁 + UTF-8 无 BOM + 重试。
  用法（执行策略禁止直接跑 .ps1，故用 IEX）：
    $env:MEM_TEXT   = '要追加的内容'
    $env:MEM_AUTHOR = '洛绫薇主会话'      # 可选
    Invoke-Expression ([IO.File]::ReadAllText('<本文件>', [Text.Encoding]::UTF8))
#>
$ErrorActionPreference = 'Stop'

$Path = 'C:\Users\76927\Documents\deepseek-harness\default-workspace\洛绫薇的记忆\框架\洛绫薇的记忆.md'
$Section = '## 当前状态（最近一次会话）'
$Text = $env:MEM_TEXT
$Author = if ($env:MEM_AUTHOR) { $env:MEM_AUTHOR } else { '洛绫薇主会话' }
if (-not $Text) { throw 'MEM_TEXT 为空，未写入' }

$lockPath = [IO.Path]::Combine([IO.Path]::GetDirectoryName($Path), '.memory.lock')
$deadline = (Get-Date).AddSeconds(8)
$stream = $null
while ($null -eq $stream) {
  try { $stream = [IO.File]::Open($lockPath, 'OpenOrCreate', 'ReadWrite', 'None') }
  catch {
    if ((Get-Date) -gt $deadline) { throw '记忆文件被占用超过 8 秒，写入取消（文件未改）' }
    Start-Sleep -Milliseconds 150
  }
}

try {
  $lines = [IO.File]::ReadAllLines($Path, [Text.Encoding]::UTF8)
  $start = -1; $end = $lines.Count
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i].Trim() -eq $Section) { $start = $i; continue }
    if ($start -ge 0 -and $i -gt $start -and $lines[$i] -match '^## ') { $end = $i; break }
  }
  if ($start -lt 0) { throw "找不到小节：$Section" }

  $stamp = (Get-Date).ToString('yyyy-MM-dd HH:mm')
  $entry = "- **$stamp（$Author）**：$Text"

  $out = New-Object System.Collections.Generic.List[string]
  for ($i = 0; $i -le $start; $i++) { $out.Add($lines[$i]) }
  $out.Add('')
  $out.Add($entry)
  for ($i = $start + 1; $i -lt $end; $i++) { if ($lines[$i].Trim() -ne '') { $out.Add($lines[$i]) } }
  $out.Add('')
  for ($i = $end; $i -lt $lines.Count; $i++) { $out.Add($lines[$i]) }

  [IO.File]::WriteAllLines($Path, $out.ToArray(), [Text.UTF8Encoding]::new($false))
  'OK 已追加 · 当前 ' + [math]::Round((Get-Item $Path).Length / 1KB, 1) + ' KB'
}
finally {
  if ($stream) { $stream.Dispose() }
  Remove-Item $lockPath -Force -ErrorAction SilentlyContinue
}
