# capture-window.ps1 - render one app window to PNG (no full-screen grab).
#
# Load it first (dot-sourcing a .ps1 is blocked by the default execution policy):
#     Invoke-Expression (Get-Content .\tools\capture-window.ps1 -Raw)
#     Capture-Window -ProcessName DesktopPet -OutFile .\shot.png
#     Capture-Window -ProcessId 1234 -OutFile .\shot.png -Mode Screen
#
# Modes:
#   PrintWindow (default) - only that window's pixels, transparent areas stay transparent.
#   Screen                - crop the screen region, so you see the window over the desktop.

# ---------------------------------------------------------------------------
# 关键：DPI 感知必须在任何屏幕/窗口 API 之前设置。
# 这台机器是 1920x1080 + 125% 缩放，未感知的进程拿到的是 1536x864 的虚拟坐标，
# 截出来的图会整体错位（之前就栽在这里）。
# ---------------------------------------------------------------------------
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class DshWin {
    public delegate bool EnumProc(IntPtr h, IntPtr l);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
    [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint flags);
    [DllImport("user32.dll")] public static extern bool SetProcessDpiAwarenessContext(IntPtr ctx);
    [DllImport("user32.dll")] public static extern uint GetDpiForWindow(IntPtr h);
    public struct RECT { public int Left, Top, Right, Bottom; }
}
'@ -ErrorAction SilentlyContinue

# -4 = DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2
$dpiAware = [DshWin]::SetProcessDpiAwarenessContext([IntPtr](-4))
if (-not $dpiAware) {
    Write-Warning "SetProcessDpiAwarenessContext failed; coordinates may be DPI-virtualized (crops can be offset)."
}

function Capture-Window {
    param(
        [string]$ProcessName,
        [int]$ProcessId = 0,
        [Parameter(Mandatory = $true)][string]$OutFile,
        [ValidateSet('PrintWindow', 'Screen')][string]$Mode = 'PrintWindow'
    )

    if (-not $ProcessId) {
        if (-not $ProcessName) { throw "pass either -ProcessName or -ProcessId" }
        $proc = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue | Select-Object -First 1
        if (-not $proc) { throw "process not found: $ProcessName" }
        $ProcessId = $proc.Id
    }

    $script:dshHwnd = [IntPtr]::Zero
    $cb = [DshWin+EnumProc]{
        param($h, $l)
        $owner = 0
        [void][DshWin]::GetWindowThreadProcessId($h, [ref]$owner)
        if ($owner -eq $ProcessId -and [DshWin]::IsWindowVisible($h)) { $script:dshHwnd = $h; return $false }
        return $true
    }
    [void][DshWin]::EnumWindows($cb, [IntPtr]::Zero)
    if ($script:dshHwnd -eq [IntPtr]::Zero) { throw "no visible top-level window for pid $ProcessId" }

    $r = New-Object DshWin+RECT
    [void][DshWin]::GetWindowRect($script:dshHwnd, [ref]$r)
    $w = $r.Right - $r.Left
    $h = $r.Bottom - $r.Top
    if ($w -le 0 -or $h -le 0) { throw "window has empty rect ${w}x${h}" }

    Add-Type -AssemblyName System.Drawing
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)

    if ($Mode -eq 'PrintWindow') {
        $hdc = $g.GetHdc()
        $ok = [DshWin]::PrintWindow($script:dshHwnd, $hdc, 2)   # 2 = PW_RENDERFULLCONTENT
        $g.ReleaseHdc($hdc)
    } else {
        $g.CopyFromScreen($r.Left, $r.Top, 0, 0, (New-Object System.Drawing.Size($w, $h)))
        $ok = $true
    }
    $g.Dispose()

    $full = [System.IO.Path]::GetFullPath($OutFile)
    $dir = Split-Path -Parent $full
    if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    $bmp.Save($full, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()

    "captured hwnd=$($script:dshHwnd) ${w}x${h} dpi=$([DshWin]::GetDpiForWindow($script:dshHwnd)) mode=$Mode ok=$ok -> $full"
}
