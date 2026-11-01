# 备份 profile 依赖 + lock 一致性检查（pnpm install 前必跑）
#
# 背景（2026-11-01）：
#   desktop profile 的 package.json / pnpm-lock.yaml / bundles 三者会互相漂移——
#   删插件时只改了 package.json 与 bundles，lock 没跟着更新（实际漂移：lock 里多 @local/bili-qr-sidebar）。
#   pnpm install 会按 manifest 修剪 node_modules，历史上曾担心剪掉 @local/session-briefing（本地 link 插件，
#   一剪掉开场简报就没了）。所以：动 install 之前先跑本脚本留备份 + 看差异。
#
# 用法：
#   powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\备份profile依赖.ps1
#   powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\备份profile依赖.ps1 -Label 装前
#
# 只读 + 复制，不改 profile。退出码：0 = 已备份且一致；1 = 已备份但不一致（看差异）。

param(
  [string]$Label = ''
)

$ErrorActionPreference = 'Stop'

$ProfileDir = Join-Path $env:USERPROFILE '.dsh\profiles\desktop'
$Stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$Name = if ($Label) { "$Stamp-$Label" } else { $Stamp }
$OutDir = Join-Path 'D:\dsh\archives\profile-deps-backup' $Name

if (-not (Test-Path $ProfileDir)) { throw "profile 目录不存在：$ProfileDir" }
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$files = @('package.json', 'pnpm-lock.yaml', 'cordis.patch.yml', 'cordis.yml', '.npmrc')
$copied = @()
foreach ($f in $files) {
  $src = Join-Path $ProfileDir $f
  if (Test-Path $src) {
    Copy-Item $src (Join-Path $OutDir $f) -Force
    $copied += $f
  }
}
Write-Host "== 已备份 $($copied.Count) 个文件 -> $OutDir"
$copied | ForEach-Object { Write-Host "   $_" }

# node_modules\@local 链接清单
$localDir = Join-Path $ProfileDir 'node_modules\@local'
$links = @()
if (Test-Path $localDir) {
  Get-ChildItem $localDir -Force | ForEach-Object {
    $target = $null
    try { $target = $_.Target } catch { }
    $links += [pscustomobject]@{ Name = $_.Name; LinkType = "$($_.LinkType)"; Target = "$target" }
  }
}
$links | ConvertTo-Json -Depth 3 | Set-Content (Join-Path $OutDir 'node_modules-@local.json') -Encoding UTF8
Write-Host "   node_modules\@local 链接 $($links.Count) 条（已存 node_modules-@local.json）"

# 读 manifest
$pkg = Get-Content (Join-Path $ProfileDir 'package.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$manifest = @()
$pkg.dependencies.PSObject.Properties | ForEach-Object { $manifest += $_.Name }
$bundles = @($pkg.dsh.profile.bundles)

# 读 lock 的 importers['.'].dependencies（按行解析，避免依赖 yaml 模块）
$lockDeps = @()
$lockPath = Join-Path $ProfileDir 'pnpm-lock.yaml'
if (Test-Path $lockPath) {
  $inImporters = $false
  $inDeps = $false
  foreach ($line in (Get-Content $lockPath -Encoding UTF8)) {
    if ($line -match '^importers:') { $inImporters = $true; continue }
    if ($inImporters -and $line -match '^[a-zA-Z]') { $inImporters = $false; $inDeps = $false }
    if ($inImporters -and $line -match '^    dependencies:') { $inDeps = $true; continue }
    if ($inImporters -and $line -match '^    [a-zA-Z]') { $inDeps = $false }
    if ($inDeps -and $line -match "^      '?([^':\s]+)'?:") { $lockDeps += $matches[1] }
  }
}

$onlyLock = @($lockDeps | Where-Object { $manifest -notcontains $_ })
$onlyManifest = @($manifest | Where-Object { $lockDeps -notcontains $_ })
$bundleLocalMissing = @($bundles | Where-Object { $_ -like '@local/*' -and $manifest -notcontains $_ })

Write-Host ''
Write-Host "== 一致性 =="
Write-Host "   manifest 依赖 $($manifest.Count) / lock 依赖 $($lockDeps.Count) / bundles $($bundles.Count)"
if ($onlyLock.Count -gt 0) {
  Write-Host "   [差异] 只在 lock 里（多半是已删插件，install 时会被清掉）：" -ForegroundColor Yellow
  $onlyLock | ForEach-Object { Write-Host "      - $_" -ForegroundColor Yellow }
}
if ($onlyManifest.Count -gt 0) {
  Write-Host "   [差异] 只在 package.json 里（install 会补装）：" -ForegroundColor Yellow
  $onlyManifest | ForEach-Object { Write-Host "      - $_" -ForegroundColor Yellow }
}
if ($bundleLocalMissing.Count -gt 0) {
  Write-Host "   [差异] bundles 里有但依赖里没有（可能装不上）：" -ForegroundColor Yellow
  $bundleLocalMissing | ForEach-Object { Write-Host "      - $_" -ForegroundColor Yellow }
}
if ($onlyLock.Count -eq 0 -and $onlyManifest.Count -eq 0 -and $bundleLocalMissing.Count -eq 0) {
  Write-Host '   [PASS] package.json / pnpm-lock / bundles 三者一致' -ForegroundColor Green
}

# 特别检查：session-briefing 三处都要在（dependencies / bundles / node_modules 链接）
Write-Host ''
Write-Host '== 关键插件 session-briefing（开场简报，剪掉就失忆）=='
$sb = @(
  [pscustomobject]@{ 位置 = 'package.json dependencies'; 在 = ($manifest -contains '@local/session-briefing') },
  [pscustomobject]@{ 位置 = 'dsh.profile.bundles';       在 = ($bundles -contains '@local/session-briefing') },
  [pscustomobject]@{ 位置 = 'node_modules/@local 链接';  在 = ($links.Name -contains 'session-briefing') }
)
$sb | Format-Table -AutoSize | Out-String | Write-Host
$sbFail = @($sb | Where-Object { -not $_.在 }).Count
if ($sbFail -gt 0) { Write-Host "   [FAIL] 有 $sbFail 处缺失——先别 install，先补" -ForegroundColor Red }
else { Write-Host '   [PASS] 三处齐全' -ForegroundColor Green }

# 顺带记录 bundles 现状
@{
  stamp = $Name
  bundles = $bundles
  manifest = $manifest
  lockDeps = $lockDeps
  onlyLock = $onlyLock
  onlyManifest = $onlyManifest
  sessionBriefingOk = ($sbFail -eq 0)
} | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $OutDir 'report.json') -Encoding UTF8
Write-Host ''
Write-Host "报告：$(Join-Path $OutDir 'report.json')"

if ($onlyLock.Count -eq 0 -and $onlyManifest.Count -eq 0 -and $bundleLocalMissing.Count -eq 0 -and $sbFail -eq 0) { exit 0 } else { exit 1 }
