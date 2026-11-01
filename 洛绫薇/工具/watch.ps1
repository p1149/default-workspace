<#
.SYNOPSIS
    把视频拆成图片帧，供看图工具逐张阅读。

.DESCRIPTION
    支持 B 站/YouTube 等链接（走 yt-dlp 下载）或本地视频文件（走 ffmpeg 直接抽帧）。
    依赖：D:\dsh\tools\ffmpeg\bin\ffmpeg.exe、D:\dsh\tools\py（yt-dlp）

.PARAMETER Source
    视频链接，或本地视频文件路径。

.PARAMETER Interval
    抽帧间隔（秒），默认 20。数值越小帧越多、越费 token。

.PARAMETER OutDir
    输出目录，默认 ./frames_<时间戳>

.PARAMETER MaxHeight
    下载画质上限，默认 480。只影响下载，不影响抽帧。

.EXAMPLE
    .\watch.ps1 -Source "https://www.bilibili.com/video/BV1nJHK6gEtd"
    .\watch.ps1 -Source .\movie.mp4 -Interval 10
#>
param(
    [Parameter(Mandatory = $true)]
    [string]$Source,
    [int]$Interval = 20,
    [string]$OutDir = '',
    [int]$MaxHeight = 480
)

$ErrorActionPreference = 'Stop'

# 沙箱里的进程读不到新建的 PATH，显式补上
$env:PATH = "D:\dsh\tools\ffmpeg\bin;D:\dsh\tools\bin;$env:PATH"
$env:PYTHONPATH = 'D:\dsh\tools\py'
$env:PYTHONIOENCODING = 'utf-8'

if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
    throw "找不到 ffmpeg，确认 D:\dsh\tools\ffmpeg\bin 存在"
}

if ($OutDir -eq '') {
    $OutDir = Join-Path (Get-Location) ("frames_" + (Get-Date -Format 'yyyyMMdd_HHmmss'))
}
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

if (Test-Path -LiteralPath $Source) {
    $video = (Resolve-Path -LiteralPath $Source).Path
    Write-Host "本地文件: $video"
}
else {
    if (-not $Source.StartsWith('http')) { throw "既不是本地文件也不是 http 链接: $Source" }
    $dlDir = Join-Path $OutDir '_video'
    New-Item -ItemType Directory -Force -Path $dlDir | Out-Null
    Write-Host "下载中: $Source"
    python -m yt_dlp -f "bv*[height<=$MaxHeight]+ba/b[height<=$MaxHeight]" `
        --merge-output-format mp4 --no-warnings `
        -o (Join-Path $dlDir '%(id)s.%(ext)s') $Source
    if ($LASTEXITCODE -ne 0) { throw "yt-dlp 下载失败，退出码 $LASTEXITCODE" }
    $video = (Get-ChildItem $dlDir -Filter *.mp4 | Select-Object -First 1).FullName
    if (-not $video) { throw "下载目录里没有 mp4: $dlDir" }
}

Write-Host "抽帧中（每 $Interval 秒一张）..."
& ffmpeg -hide_banner -loglevel error -y -i $video -vf "fps=1/$Interval" -q:v 2 (Join-Path $OutDir 'f%03d.jpg')
if ($LASTEXITCODE -ne 0) { throw "ffmpeg 抽帧失败，退出码 $LASTEXITCODE" }

$frames = Get-ChildItem $OutDir -Filter 'f*.jpg' | Sort-Object Name
$dur = (& ffprobe -v error -show_entries format=duration -of csv=p=0 $video) -as [double]

Write-Host ''
Write-Host "视频: $([IO.Path]::GetFileName($video))  时长 $([Math]::Round($dur,1)) 秒"
Write-Host "帧数: $($frames.Count)  目录: $OutDir"
foreach ($f in $frames) { Write-Host ("  {0}  {1,4:N0} KB" -f $f.Name, ($f.Length / 1KB)) }
