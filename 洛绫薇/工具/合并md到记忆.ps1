# 把所有 md 刷新进 洛绫薇的记忆/框架/洛绫薇的记忆.md 的「第二部分」
# 2026-11-01 08:1x 主人令：**「以后所有 md 都放在洛绫薇的记忆里」** —— 长期规则。
# 用法：powershell -NoProfile -ExecutionPolicy Bypass -File .\合并md到记忆.ps1 [-Label 说明]
# 说明：第二部分每次**整体重建**（= 当前磁盘全部 md 的快照），不叠加、不重复膨胀；
#       2026-11-01 14:2x 主人令「A 和 C 一起做」→ ① 排除 archive\（历史归档不抄）；② 备份只留 10 份。
#       活记忆部分（# 第二部分 之前）保持原样，绝不被覆盖。
param([string]$Label = '')
$ErrorActionPreference = 'Stop'
$root = 'C:\Users\76927\Documents\deepseek-harness\default-workspace'
$mem  = Join-Path $root '洛绫薇的记忆\框架\洛绫薇的记忆.md'
$tmp  = Join-Path $env:TEMP 'luolingwei-memory-refresh.md'
$selfRel = '洛绫薇的记忆\框架\洛绫薇的记忆.md'
$backupDir = 'D:\dsh\archives\mem-refresh'
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

# 0. 先备份当前记忆（每次刷新都留一份，便于回退）
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$bk = Join-Path $backupDir ("before-$stamp.md")
Copy-Item $mem $bk -Force

# 0b. 备份只保留最近 10 份（2026-11-01 14:2x 主人令「A 和 C 一起做」的 C 项）
$keep = 10
$olds = @(Get-ChildItem $backupDir -Filter 'before-*.md' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending)
if ($olds.Count -gt $keep) {
    $drop = @($olds[$keep..($olds.Count - 1)])
    foreach ($d in $drop) { Remove-Item $d.FullName -Force }
    '清理旧备份：{0} 份 / {1} MB（保留最近 {2} 份）' -f $drop.Count, [math]::Round((($drop | Measure-Object Length -Sum).Sum) / 1MB, 2), $keep
}

# 1. 取活记忆部分（# 第二部分 之前）
$lines = [System.IO.File]::ReadAllLines($mem, [System.Text.Encoding]::UTF8)
$mark = -1
for ($i = 0; $i -lt $lines.Count; $i++) { if ($lines[$i].StartsWith('# 第二部分')) { $mark = $i; break } }
if ($mark -lt 1) { throw '找不到「# 第二部分」标记，拒绝继续（保护活记忆）' }
$cut = $mark
while ($cut -gt 0 -and $lines[$cut].Trim() -ne '---') { $cut-- }
if ($cut -le 0) { $cut = $mark }
$live = $lines[0..($cut - 1)]

# 2. 收集：工作区全部 md，排除引擎自带 / node_modules / .git / 本文件自身
$files = @(Get-ChildItem $root -Recurse -File -Filter *.md -ErrorAction SilentlyContinue | ForEach-Object {
  $rel = $_.FullName.Substring($root.Length + 1)
  $skip = $false
  if ($rel.StartsWith('deepseek-harness\', [StringComparison]::OrdinalIgnoreCase)) { $skip = $true }
  if ($rel -like '*\node_modules\*') { $skip = $true }
  if ($rel.StartsWith('.git\', [StringComparison]::OrdinalIgnoreCase)) { $skip = $true }
  if ($rel -eq $selfRel) { $skip = $true }
  # 2026-11-01 14:2x 主人令「A 和 C 一起做」的 A 项：历史归档不抄进记忆
  # 理由：archive 原件在磁盘上、另有 INDEX 可查，抄进来等于同一份内容存两遍，且体积只涨不跌
  if ($rel.StartsWith('洛绫薇的记忆\框架\archive\', [StringComparison]::OrdinalIgnoreCase)) { $skip = $true }
  # 2026-11-02 可移植包「洛绫薇\」是复制品（含整份记忆副本），不进记忆第二部分，避免重复膨胀
  if ($rel.StartsWith('洛绫薇\', [StringComparison]::OrdinalIgnoreCase)) { $skip = $true }
  if (-not $skip) { [pscustomobject]@{ Rel = $rel; Info = $_ } }
} | Sort-Object Rel)
$total = ($files | ForEach-Object { $_.Info.Length } | Measure-Object -Sum).Sum

# 3. 重建第二部分
$sw = New-Object System.IO.StreamWriter($tmp, $false, (New-Object System.Text.UTF8Encoding($false)))
try {
  foreach ($l in $live) { $sw.WriteLine($l) }
  $sw.WriteLine('')
  $sw.WriteLine('---')
  $sw.WriteLine('')
  $sw.WriteLine('# 第二部分 · 全部 md 合并（' + $files.Count + ' 个 · 刷新于 ' + (Get-Date -Format 'yyyy-MM-dd HH:mm') + '）')
  $sw.WriteLine('')
  $sw.WriteLine('> **长期规则（2026-11-01 主人令）**：「合并 md 文件到洛绫薇的记忆，**以后所有 md 都放在洛绫薇的记忆里**」。')
  $sw.WriteLine('> 本部分 = 工作区内全部 `.md` 的**快照**（' + $files.Count + ' 个 / ' + [math]::Round($total/1MB,2) + ' MB）；每次刷新**整体重建**，不叠加、不重复膨胀。')
  $sw.WriteLine('> 排除：引擎自带 `deepseek-harness\`、`node_modules\`、`.git\`、`洛绫薇的记忆\框架\archive\`（历史归档只留原件 + INDEX）、以及本文件自身。刷新入口：`tools\合并md到记忆.ps1`。')
  $sw.WriteLine('> 备份保留：`D:\dsh\archives\mem-refresh\` 只留最近 10 份（2026-11-01 14:2x 主人令）。')
  $sw.WriteLine('> 阅读边界：开场只读活记忆部分；本部分用 `grep` 按需检索。每次刷新前自动备份到 `D:\dsh\archives\mem-refresh\`。')
  if ($Label) { $sw.WriteLine('> 本次刷新说明：' + $Label) }
  $sw.WriteLine('')
  $sw.WriteLine('## 目录（按路径排序）')
  $sw.WriteLine('')
  $i = 0
  foreach ($f in $files) { $i++; $sw.WriteLine(('{0}. `{1}` — {2} KB' -f $i, $f.Rel, [math]::Round($f.Info.Length/1KB,1))) }
  $i = 0
  foreach ($f in $files) {
    $i++
    $text = [System.IO.File]::ReadAllText($f.Info.FullName, [System.Text.Encoding]::UTF8)
    if ($text.Length -gt 0 -and $text[0] -eq [char]0xFEFF) { $text = $text.Substring(1) }
    $sw.WriteLine('')
    $sw.WriteLine('---')
    $sw.WriteLine('')
    $sw.WriteLine(('## [{0}] {1}' -f $i, $f.Rel))
    $sw.WriteLine('')
    $sw.WriteLine(('> 源文件：`{0}` · {1} B · 最后修改 {2}' -f $f.Rel, $f.Info.Length, $f.Info.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss')))
    $sw.WriteLine('')
    $sw.Write($text)
    if (-not $text.EndsWith("`n")) { $sw.WriteLine('') }
  }
}
finally { $sw.Dispose() }

Copy-Item $tmp $mem -Force
Remove-Item $tmp -Force
'已刷新第二部分：' + $files.Count + ' 个 md / ' + [math]::Round($total/1MB,2) + ' MB'
'记忆总大小：' + [math]::Round((Get-Item $mem).Length/1MB,2) + ' MB'
'刷新前备份：' + $bk
