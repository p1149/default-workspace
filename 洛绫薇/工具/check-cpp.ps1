# check-cpp.ps1 - self-contained health check for the MSVC + Windows SDK C++ toolchain.
#
# Usage (no execution-policy hassle):
#     Invoke-Expression (Get-Content .\tools\check-cpp.ps1 -Raw)
#
# Exit code: 0 = all checks passed, 1 = at least one FAIL.
# Output is deliberately ASCII so Windows PowerShell 5.1 cannot mangle it.

$ErrorActionPreference = 'Continue'

# --- 自动探测 Build Tools 安装目录（不再写死 VS 18）---
# 优先级：$env:DSH_VS_BT -> vswhere 探测 -> 已知候选路径
$BT = $env:DSH_VS_BT
if (-not $BT) {
    $vswhere = 'C:\Program Files (x86)\Microsoft Visual Studio\Installer\vswhere.exe'
    if (Test-Path $vswhere) {
        $found = & $vswhere -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath -latest 2>$null
        if ($found) { $BT = ($found | Select-Object -First 1).Trim() }
    }
}
if (-not $BT) {
    foreach ($c in @(
        'C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools',
        'C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools',
        'C:\Program Files\Microsoft Visual Studio\2022\BuildTools',
        'C:\Program Files\Microsoft Visual Studio\18\BuildTools'
    )) {
        if (Test-Path (Join-Path $c 'VC\Auxiliary\Build\vcvarsall.bat')) { $BT = $c; break }
    }
}
if (-not $BT) { $BT = 'C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools' }

$KITS  = 'C:\Program Files (x86)\Windows Kits\10'
$VCVAR = "$BT\VC\Auxiliary\Build\vcvarsall.bat"
$WORK  = Join-Path $env:TEMP 'dsh-cpp-check'

$script:fail = 0
function Check([string]$name, [bool]$ok, [string]$detail = '') {
    if ($ok) { $tag = 'PASS' } else { $tag = 'FAIL'; $script:fail++ }
    "  [{0}] {1,-30} {2}" -f $tag, $name, $detail
}

'=== files / layout ==='
Check 'vcvarsall.bat'   (Test-Path $VCVAR) $VCVAR
Check 'MSVC include dir' (Test-Path "$BT\VC\Tools\MSVC") (@(Get-ChildItem "$BT\VC\Tools\MSVC" -Directory | ForEach-Object Name) -join ',')
$sdkVers = @(Get-ChildItem "$KITS\Include" -Directory -ErrorAction SilentlyContinue | ForEach-Object Name)
Check 'SDK Include'     ($sdkVers.Count -gt 0) ($sdkVers -join ',')
if ($sdkVers.Count -gt 0) {
    $v = $sdkVers[-1]
    Check 'ucrt/stdio.h'  (Test-Path "$KITS\Include\$v\ucrt\stdio.h")
    Check 'um/kernel32.lib' (Test-Path "$KITS\Lib\$v\um\x64\kernel32.lib")
    Check 'ucrt/ucrt.lib'   (Test-Path "$KITS\Lib\$v\ucrt\x64\ucrt.lib")
}
Check 'cmake.exe'       (Test-Path "$BT\Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin\cmake.exe")
Check 'ninja.exe'       (Test-Path "$BT\Common7\IDE\CommonExtensions\Microsoft\CMake\Ninja\ninja.exe")
Check 'vcpkg.exe'       (Test-Path "$BT\VC\vcpkg\vcpkg.exe")
Check 'MSBuild.exe'     (Test-Path "$BT\MSBuild\Current\Bin\MSBuild.exe")

'=== import build environment ==='
$import = @('PATH','INCLUDE','LIB','LIBPATH','VSINSTALLDIR','VCToolsInstallDir','VCToolsVersion',
            'WindowsSdkDir','WindowsSDKVersion','UniversalCRTSdkDir','UCRTVersion')
if (Test-Path $VCVAR) {
    $raw = cmd /c "call `"$VCVAR`" x64 >nul 2>&1 && set"
    foreach ($line in $raw) {
        if ($line -match '^([^=]+)=(.*)$' -and $import -contains $Matches[1]) { Set-Item -Path "env:$($Matches[1])" -Value $Matches[2] }
    }
}
Check 'cl on PATH'      ([bool](Get-Command cl -ErrorAction SilentlyContinue)) ([string]$env:VCToolsVersion)
Check 'Windows SDK ver' ([bool]$env:WindowsSDKVersion) $env:WindowsSDKVersion
Check 'cmake on PATH'   ([bool](Get-Command cmake -ErrorAction SilentlyContinue))
Check 'ninja on PATH'   ([bool](Get-Command ninja -ErrorAction SilentlyContinue))

'=== compile / link / run (C++23) ==='
Remove-Item $WORK -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $WORK | Out-Null
$src = @'
#include <cstdio>
#include <vector>
#include <ranges>
#include <numeric>
#include <expected>
#include <filesystem>
#include <thread>
#include <print>
int main() {
    std::vector<int> v{1,2,3,4,5};
    auto even = v | std::views::filter([](int n){ return n % 2 == 0; });
    int s = std::accumulate(even.begin(), even.end(), 0);
    std::expected<int,const char*> e = 7;
    std::printf("lang=%ld msvc=%d sum=%d exp=%d fs=%d thr=%u\n",
        (long)_MSVC_LANG, _MSC_VER, s, *e,
        (int)std::filesystem::exists(std::filesystem::current_path()),
        std::thread::hardware_concurrency());
    std::print("std::print ok {}\n", s);
    return s == 6 ? 0 : 1;
}
'@
Set-Content -Path "$WORK\p.cpp" -Value $src -Encoding ASCII

$bcl = cmd /c "cd /d `"$WORK`" && cl /nologo /EHsc /std:c++latest /W4 /permissive- p.cpp 2>&1"
$clOk = ($LASTEXITCODE -eq 0)
Check 'compile+link' $clOk $(if ($clOk) { 'C++23' } else { (($bcl | Select-String 'error' | Select-Object -First 1) -join '') })

if ($clOk) {
    $out = & "$WORK\p.exe" 2>&1
    $runOk = ($LASTEXITCODE -eq 0)
    Check 'run exe' $runOk ($out -join ' | ')
}

'=== versions ==='
if (Get-Command cmake -ErrorAction SilentlyContinue) { '  cmake   : ' + ((cmake --version) -split "`n")[0] }
if (Get-Command ninja -ErrorAction SilentlyContinue) { '  ninja   : ' + (ninja --version) }
if (Test-Path "$BT\MSBuild\Current\Bin\MSBuild.exe")  { '  msbuild : ' + ((& "$BT\MSBuild\Current\Bin\MSBuild.exe" -version -nologo 2>&1) | Select-Object -Last 1) }
if (Test-Path "$BT\VC\vcpkg\vcpkg.exe")               { '  vcpkg   : ' + ((& "$BT\VC\vcpkg\vcpkg.exe" version 2>&1) | Select-Object -First 1) }

Remove-Item $WORK -Recurse -Force -ErrorAction SilentlyContinue

''
if ($script:fail -eq 0) {
    'RESULT: ALL CHECKS PASSED'
    exit 0
} else {
    "RESULT: $($script:fail) CHECK(S) FAILED"
    exit 1
}
