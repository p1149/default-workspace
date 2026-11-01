<#
.SYNOPSIS
  更新 DSH：杀旧进程 → 静默装新版本 → 重新拉起。
  必须由「独立进程 / 计划任务」运行：杀掉 DSH 后本脚本要能继续跑完。
#>
$ErrorActionPreference = 'Stop'

# exe 路径不再写死；可用 $env:DSH_EXE 覆盖。
function Resolve-DshExe {
  # 不要写 `$cands[0]`：只剩一个候选时 PowerShell 会把数组降成字符串，索引取到首字母（实测踩过）。
  $cands = @(
    $env:DSH_EXE,
    'D:\deepseek\DeepSeek Harness.exe',
    (Join-Path $env:LOCALAPPDATA 'Programs\DeepSeek Harness\DeepSeek Harness.exe'),
    'C:\Program Files\DeepSeek Harness\DeepSeek Harness.exe'
  )
  foreach ($c in $cands) { if ($c -and (Test-Path $c)) { return $c } }
  return 'D:\deepseek\DeepSeek Harness.exe'
}
$dshExe = Resolve-DshExe
$installer = 'D:\dsh\archives\dsh-0.2.1-rc.5-installer.exe'
$log = 'D:\dsh\archives\update-dsh.log'

function Log([string]$m) {
  $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $m"
  Write-Output $line
  Add-Content -Path $log -Value $line
}

if (-not (Test-Path $installer)) { Log "找不到安装包: $installer"; exit 1 }

Log '开始更新 DSH 0.2.1-rc.5'
Get-Process 'DeepSeek Harness' -ErrorAction SilentlyContinue | Stop-Process -Force
Log '已终止旧 DSH'
Start-Sleep -Seconds 4

$p = Start-Process -FilePath $installer -ArgumentList '/S' -PassThru -Wait
Log ("安装器退出码: " + $p.ExitCode)

Start-Sleep -Seconds 3
Start-Process -FilePath $dshExe
Log '已启动新 DSH'
