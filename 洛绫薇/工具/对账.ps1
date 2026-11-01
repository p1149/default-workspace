# 对账.ps1 - 每轮收尾对账（2026-10-30 复盘候选 4 落地）
#
# 用法：
#   .\tools\对账.ps1         只读检查五项，输出 PASS / FAIL，退出码 0 = 全过
#   .\tools\对账.ps1 -Fix    额外重建 archive/INDEX.md（机械项）
#
# 对应规范：洛绫薇的记忆/框架/对账规范.md

param([switch]$Fix)
$ErrorActionPreference = 'Stop'

$WS     = 'C:\Users\76927\Documents\deepseek-harness\default-workspace'
$ARC    = Join-Path $WS '洛绫薇的记忆\框架\archive'
$MEM    = Join-Path $WS '洛绫薇的记忆\框架\洛绫薇的记忆.md'
$HEALTH = Join-Path $WS '洛绫薇的记忆\框架\共享\健康摘要.md'
$SIDX   = Join-Path $WS '洛绫薇的记忆\框架\共享\会话索引.md'
$KB     = Join-Path $WS '洛绫薇的记忆\框架\共享\任务看板.md'
$SESS   = 'C:\Users\76927\.dsh\storages\session_projcache\sessions'

$script:pass = 0
$script:fail = 0
function Ok($msg) { $script:pass++; Write-Host "[PASS] $msg" -ForegroundColor Green }
function Ng($msg) { $script:fail++; Write-Host "[FAIL] $msg" -ForegroundColor Red }
# 仅提示、不计 FAIL：用于「责任已改判」或跨会话口径差异的检查项（规则第十五条）
function Note($msg) { Write-Host "[NOTE] $msg" -ForegroundColor Yellow }

Write-Host ("=== 对账 " + (Get-Date -Format 'yyyy-MM-dd HH:mm') + " ===") -ForegroundColor Cyan

# ---------- 1. 归档 INDEX ----------
$files = @(Get-ChildItem $ARC -File | Where-Object { $_.Name -match '^\d{4}-\d{2}-\d{2}_\d{4}\.md$' } | Sort-Object Name)
$actual = $files.Count
$indexPath = Join-Path $ARC 'INDEX.md'
$indexCount = 0
if (Test-Path $indexPath) {
    $indexCount = @(Get-Content $indexPath -Encoding UTF8 | Where-Object { $_ -match '^\| `\d{4}-\d{2}-\d{2}_\d{4}\.md`' }).Count
}
if ($actual -eq $indexCount) {
    Ok "归档 INDEX: $indexCount = 交接 $actual 条"
} else {
    Ng "归档 INDEX: 索引 $indexCount 行 ≠ 交接 $actual 条"
    if ($Fix) {
        $lines = @('# 交接归档索引', '', '> 自动生成，只进不改。全部交接记录按时间正序索引。', '',
                   ("共 **" + $actual + "** 条交接记录。"), '', '| 文件 | 大小 |', '|---|---|')
        foreach ($f in $files) {
            $kb = $f.Length / 1KB
            if ($kb -ge 10) { $s = [string][math]::Round($kb, 0) } else { $s = [string][math]::Round($kb, 1) }
            $lines += ('| `' + $f.Name + '` | ' + $s + ' KB |')
        }
        $text = ($lines -join "`r`n") + "`r`n"
        [System.IO.File]::WriteAllText($indexPath, $text, (New-Object System.Text.UTF8Encoding($false)))
        Write-Host "  -> 已重建 INDEX（$actual 条）" -ForegroundColor Yellow
    }
}

# ---------- 2. 记忆「最近归档」 ----------
$memLatest = ''
if (Test-Path $MEM) {
    $memLines = Get-Content $MEM -Encoding UTF8
    $inSec = $false
    foreach ($l in $memLines) {
        if ($l -match '^## 最近归档') { $inSec = $true; continue }
        if ($inSec -and $l -match '^\s*-\s') {
            if ($l -match '`([^`]*\.md)`') { $memLatest = $matches[1]; break }
        }
        if ($inSec -and $l -match '^## ') { break }
    }
}
$newest = $files | Select-Object -Last 1
$newestName = if ($newest) { $newest.Name } else { '' }
$memFile = if ($memLatest) { Split-Path $memLatest -Leaf } else { '' }
if ($memFile -and (Test-Path (Join-Path $ARC $memFile))) {
    if ($newestName -and $memFile -eq $newestName) {
        Ok "记忆最近归档: $memFile（= 最新写盘）"
    } else {
        Note "记忆最近归档: $memFile，最新写盘是 $newestName（责任归主会话回填，不计 FAIL——规则第十五条）"
    }
} else {
    Note "记忆最近归档: 「$memLatest」未写或不存在（主会话回填责任，不计 FAIL——规则第十五条）"
}

# ---------- 3. 健康摘要（2026-11-01 13:02 主人令：文件保留、不再执行，跳过检查）----------
Ok "健康摘要: 已停用（文件保留作存档，不再检查新鲜度）"

# ---------- 4. 会话索引口径 ----------
$sessCount = 0
if (Test-Path $SESS) { $sessCount = @(Get-ChildItem $SESS -File -Filter *.json).Count }
$idxNum = -1
if (Test-Path $SIDX) {
    $sidxText = Get-Content $SIDX -Encoding UTF8 -Raw
    if ($sidxText -match '共\s*\*\*(\d+)\*\*\s*个会话') { $idxNum = [int]$matches[1] }
}
if ($idxNum -eq $sessCount) { Ok "会话索引: $idxNum = 会话文件 $sessCount 个" }
else { Ng "会话索引: 头部 $idxNum 个 ≠ 实际会话文件 $sessCount 个" }

# ---------- 5. 任务看板待办 ----------
$todo = 0
if (Test-Path $KB) {
    $inTodo = $false
    foreach ($l in (Get-Content $KB -Encoding UTF8)) {
        if ($l -match '^## 待办') { $inTodo = $true; continue }
        if ($inTodo -and $l -match '^## ') { break }
        if ($inTodo -and $l -match '^\s*-\s*\*\*2026' -and $l -notmatch '✅') { $todo++ }
    }
}
if ($todo -le 5) { Ok "任务看板: 待办未销单 $todo 条（≤ 5）" }
else { Ng "任务看板: 待办未销单 $todo 条（> 5，需清理）" }

# ---------- 6. 脚本编码与语法（2026-11-01 14:3x 主人令「学习 避免踩一样的坑」）----------
# 背景：编辑 .ps1 会丢 UTF-8 BOM → PS 5.1 按 ANSI 解中文 → ParseFile 报一堆「假」语法错（已踩 4 次）
$toolsDir = Join-Path $WS 'tools'
$badBom = @()
$badSyn = @()
$ps1s = @(Get-ChildItem $toolsDir -File -Filter *.ps1 -ErrorAction SilentlyContinue)
foreach ($f in $ps1s) {
    $bytes = [System.IO.File]::ReadAllBytes($f.FullName)
    $hasBom = ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)
    # 只对「含非 ASCII 字符」的脚本要求 BOM：纯 ASCII 脚本没有解码歧义，加不加都行
    $start = if ($hasBom) { 3 } else { 0 }
    $hasNonAscii = $false
    for ($i = $start; $i -lt $bytes.Length; $i++) { if ($bytes[$i] -ge 0x80) { $hasNonAscii = $true; break } }
    if ($hasNonAscii -and -not $hasBom) { $badBom += $f.Name }
    $errs = $null; $toks = $null
    [void][System.Management.Automation.Language.Parser]::ParseFile($f.FullName, [ref]$toks, [ref]$errs)
    if (@($errs).Count -gt 0) { $badSyn += ($f.Name + '（' + @($errs).Count + ' 错）') }
}
if ($badBom.Count -eq 0 -and $badSyn.Count -eq 0) {
    Ok "脚本编码: $($ps1s.Count) 个 .ps1 全部合规（含中文者带 UTF-8 BOM、语法 0 错）"
} else {
    if ($badBom.Count -gt 0) { Ng ("脚本缺 UTF-8 BOM: " + ($badBom -join '、')) }
    if ($badSyn.Count -gt 0) { Ng ("脚本语法错误: " + ($badSyn -join '、')) }
}

# ---------- 汇总 ----------
Write-Host ("结果: " + $script:pass + " PASS / " + $script:fail + " FAIL") -ForegroundColor Cyan
if ($script:fail -gt 0) { exit 1 } else { exit 0 }
