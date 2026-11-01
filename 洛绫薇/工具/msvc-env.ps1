# msvc-env.ps1 - import the MSVC + Windows SDK build environment into the CURRENT PowerShell session.
#
# Why: vcvars64.bat only affects its own cmd.exe process. DSH runs every command in a fresh
# shell, so without this the compiler cannot find INCLUDE / LIB. Dot-source it:
#
#     . .\tools\msvc-env.ps1
#     cl /nologo /EHsc /std:c++20 hello.cpp
#
# Optional: . .\tools\msvc-env.ps1 -Arch x86   (or amd64_arm64, etc.)

param([string]$Arch = 'x64')

# --- 自动探测 Build Tools 安装目录（不写死版本；可用 $env:DSH_VS_BT 覆盖）---
$vcvars = $null
if ($env:DSH_VS_BT) {
    $vcvars = Join-Path $env:DSH_VS_BT 'VC\Auxiliary\Build\vcvarsall.bat'
}
if (-not $vcvars -or -not (Test-Path $vcvars)) {
    $vswhere = 'C:\Program Files (x86)\Microsoft Visual Studio\Installer\vswhere.exe'
    if (Test-Path $vswhere) {
        $found = & $vswhere -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath -latest 2>$null
        if ($found) { $vcvars = Join-Path ($found | Select-Object -First 1).Trim() 'VC\Auxiliary\Build\vcvarsall.bat' }
    }
}
if (-not $vcvars -or -not (Test-Path $vcvars)) {
    foreach ($c in @(
        'C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools',
        'C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools',
        'C:\Program Files\Microsoft Visual Studio\2022\BuildTools',
        'C:\Program Files\Microsoft Visual Studio\18\BuildTools'
    )) {
        $cand = Join-Path $c 'VC\Auxiliary\Build\vcvarsall.bat'
        if (Test-Path $cand) { $vcvars = $cand; break }
    }
}
if (-not $vcvars -or -not (Test-Path $vcvars)) {
    throw "vcvarsall.bat not found. Set `$env:DSH_VS_BT to the Build Tools install dir (looked via vswhere + known paths)."
}

$import = @(
    'PATH', 'INCLUDE', 'LIB', 'LIBPATH', 'VSINSTALLDIR', 'VCToolsInstallDir',
    'VCToolsVersion', 'VisualStudioVersion', 'VCINSTALLDIR',
    'WindowsSdkDir', 'WindowsSDKVersion', 'WindowsSDKLibVersion',
    'UniversalCRTSdkDir', 'UCRTVersion', 'VSCMD_ARG_TGT_ARCH'
)

$raw = cmd /c "call `"$vcvars`" $Arch >nul 2>&1 && set"
if ($LASTEXITCODE -ne 0) { throw "vcvarsall.bat $Arch failed (exit $LASTEXITCODE)" }

$count = 0
foreach ($line in $raw) {
    if ($line -match '^([^=]+)=(.*)$') {
        $name = $Matches[1]
        if ($import -contains $name) {
            Set-Item -Path "env:$name" -Value $Matches[2]
            $count++
        }
    }
}

# --- 构建缓存与产物统一放 D:（C 盘只留系统和源码）---
$env:VCPKG_DEFAULT_BINARY_CACHE = 'D:\dsh\vcpkg\binary-cache'
$env:VCPKG_DOWNLOADS            = 'D:\dsh\vcpkg\downloads'
$env:DSH_BUILD_ROOT             = 'D:\dsh\builds'
foreach ($p in $env:VCPKG_DEFAULT_BINARY_CACHE, $env:VCPKG_DOWNLOADS, $env:DSH_BUILD_ROOT) {
    if (-not (Test-Path $p)) { New-Item -ItemType Directory -Force -Path $p | Out-Null }
}

Write-Host ("msvc-env: imported {0} variables for {1} ({2})" -f $count, $Arch, $env:VCToolsVersion) -ForegroundColor DarkGray
# --- 编译临时目录也挪到 D:（MSVC / 链接器 / CMake 都会往 TEMP 写大量中间文件）---
# 注意：这里只管当前 shell 及其子进程。已运行的资源管理器/终端仍持有旧的 TEMP，
# 要全局生效需注销或重启这些进程。
if (-not (Test-Path 'D:\dsh\temp')) { New-Item -ItemType Directory -Force -Path 'D:\dsh\temp' | Out-Null }
$env:TEMP = 'D:\dsh\temp'
$env:TMP  = 'D:\dsh\temp'

Write-Host ("msvc-env: imported {0} variables for {1} ({2})" -f $count, $Arch, $env:VCToolsVersion) -ForegroundColor DarkGray
Write-Host ("msvc-env: vcpkg cache -> {0}" -f $env:VCPKG_DEFAULT_BINARY_CACHE) -ForegroundColor DarkGray
Write-Host ("msvc-env: temp dir     -> {0}" -f $env:TEMP) -ForegroundColor DarkGray
