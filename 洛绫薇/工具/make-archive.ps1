# make-archive.ps1 - 把当前工作区打成可交接的归档包（暂存 -> 清单 -> zip -> 校验和）
#
# 只收源码/文档/配置，排除 node_modules、.git、构建产物、大体积输出。
# 注意：zip 条目统一用正斜杠（标准写法），否则在 Linux/macOS 上解压会变成扁平的一堆文件。
#
# 用法（必须带 -Encoding UTF8，否则中文注释会被按 GBK 读坏）：
#   Invoke-Expression (Get-Content .\tools\make-archive.ps1 -Raw -Encoding UTF8)

$ErrorActionPreference = 'Stop'

$WS      = 'C:\Users\76927\Documents\deepseek-harness\default-workspace'
$PROFILE = 'C:\Users\76927\.dsh\profiles\desktop'
$STAGE   = 'D:\dsh\temp\handover-stage'
$STAMP   = Get-Date -Format 'yyyyMMdd-HHmm'
$ZIP     = "D:\dsh\archives\workspace-handover-$STAMP.zip"

$DIRS = @(
    'desktop-pet', 'desktop-app', 'hello', 'cpp-check', 'tools',
    'sidebar-notes', 'sidebar-gallery', 'top-nav', 'web-browser', 'ai-evolution',
    'virtual-avatar', 'image-edits', 'diagram', 'seedream-gen', 'comfy-gen',
    'luanyujia-workbench', 'handover'
)
$FILES = @('AGENTS.md', 'C++环境搭建说明.md', '创建DSH插件指南.md')
$XD = @('node_modules', '.git', '.tmp', 'out', 'deliveries', '12-源码照搬', 'build', 'cmake-build', '__pycache__')
$XF = @('*.exe', '*.obj', '*.pdb', '*.ilk', '*.zip', '*.pyc')

if (Test-Path $STAGE) { Remove-Item $STAGE -Recurse -Force }
New-Item -ItemType Directory -Force -Path $STAGE | Out-Null

Write-Host "== 暂存 ==" -ForegroundColor Cyan
foreach ($d in $DIRS) {
    $src = Join-Path $WS $d
    if (-not (Test-Path $src)) { Write-Host "skip (missing): $d" -ForegroundColor DarkGray; continue }
    $dst = Join-Path $STAGE $d
    New-Item -ItemType Directory -Force -Path $dst | Out-Null
    $xargs = @()
    foreach ($x in $XD) { $xargs += '/XD'; $xargs += $x }
    foreach ($x in $XF) { $xargs += '/XF'; $xargs += $x }
    robocopy $src $dst /E /NFL /NDL /NJH /NJS /R:1 /W:1 @xargs | Out-Null
}

foreach ($f in $FILES) {
    $src = Join-Path $WS $f
    if (Test-Path $src) { Copy-Item $src (Join-Path $STAGE $f) -Force }
}

# Profile 配置（便于在新机器恢复插件）
$pdir = Join-Path $STAGE 'profile'
New-Item -ItemType Directory -Force -Path $pdir | Out-Null
foreach ($f in 'package.json', 'cordis.patch.yml', 'cordis.yml', 'pnpm-lock.yaml') {
    $src = Join-Path $PROFILE $f
    if (Test-Path $src) { Copy-Item $src (Join-Path $pdir $f) -Force }
}

Write-Host "== 清单 ==" -ForegroundColor Cyan
$files = Get-ChildItem $STAGE -Recurse -File | Sort-Object FullName
$rows = foreach ($f in $files) {
    $h = (Get-FileHash $f.FullName -Algorithm SHA256).Hash
    '{0}  {1,10}  {2}' -f $h, $f.Length, $f.FullName.Substring($STAGE.Length + 1).Replace('\', '/')
}
$totalMB = [math]::Round(($files | Measure-Object Length -Sum).Sum / 1MB, 2)
$header = @(
    "workspace handover archive",
    "created : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
    "source  : $WS",
    "files   : $($files.Count)",
    "size    : $totalMB MB (uncompressed)",
    "excluded: node_modules, .git, .tmp, build dirs, __pycache__, comfy-gen/out, comfy-gen/deliveries, luanyujia-workbench/12-源码照搬, *.exe/*.obj/*.pdb/*.pyc",
    "",
    "SHA256                                                            SIZE  PATH"
)
Set-Content -Path (Join-Path $STAGE 'MANIFEST.txt') -Value ($header + $rows) -Encoding UTF8
($rows -replace '^(\w+)\s+\d+\s+', '$1  ') | Set-Content -Path (Join-Path $STAGE 'SHA256SUMS.txt') -Encoding ASCII

# 清单生成完再重列一次，确保 MANIFEST/SHA256SUMS 本身也进包
$files = Get-ChildItem $STAGE -Recurse -File | Sort-Object FullName

Write-Host "== 打包（正斜杠条目）==" -ForegroundColor Cyan
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
if (Test-Path $ZIP) { Remove-Item $ZIP -Force }
$zipStream = [System.IO.File]::Open($ZIP, [System.IO.FileMode]::CreateNew)
$archive = New-Object System.IO.Compression.ZipArchive(
    $zipStream, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($f in $files) {
        $rel = $f.FullName.Substring($STAGE.Length + 1).Replace('\', '/')
        [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
            $archive, $f.FullName, $rel,
            [System.IO.Compression.CompressionLevel]::Optimal)
    }
} finally {
    $archive.Dispose()
    $zipStream.Dispose()
}

$zipInfo = Get-Item $ZIP
$zipHash = (Get-FileHash $ZIP -Algorithm SHA256).Hash
"$zipHash  $($zipInfo.Name)" | Set-Content -Path "$ZIP.sha256" -Encoding ASCII

Write-Host "== 结果 ==" -ForegroundColor Green
"archive : $ZIP"
"size    : $([math]::Round($zipInfo.Length / 1MB, 2)) MB"
"files   : $($files.Count)"
"sha256  : $zipHash"
