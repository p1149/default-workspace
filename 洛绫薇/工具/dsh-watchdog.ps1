<#
.SYNOPSIS
  DSH 启动看门狗：启动 DSH → 健康检测 → 不健康则回滚到「上次良好配置」一次并重启。
  由登录计划任务调用（替代直接启动 DSH）。
.PARAMETER CheckOnly
  只做健康检查，不启动/不重启。
#>
param([int]$WaitSeconds = 25, [switch]$CheckOnly)

# exe 路径不再写死（换机/换安装位置后旧路径会失效）：按候选列表探测，可用 $env:DSH_EXE 覆盖。
function Resolve-DshExe {
  # 注意：不要写 `$cands[0]`——只剩一个候选时 PowerShell 会把数组降成字符串，
  # 索引 [0] 取到的是首字母 'D'（2026-11-01 实测踩到）。用 foreach 逐个探测。
  $cands = @(
    $env:DSH_EXE,
    'D:\deepseek\DeepSeek Harness.exe',
    (Join-Path $env:LOCALAPPDATA 'Programs\DeepSeek Harness\DeepSeek Harness.exe'),
    'C:\Program Files\DeepSeek Harness\DeepSeek Harness.exe'
  )
  foreach ($c in $cands) { if ($c -and (Test-Path $c)) { return $c } }
  return 'D:\deepseek\DeepSeek Harness.exe'
}
$exe = Resolve-DshExe
$profileDir = Join-Path $env:USERPROFILE '.dsh\profiles\desktop'
$goodDir = 'D:\dsh\archives\dsh-profile-good'
$log = 'D:\dsh\archives\dsh-watchdog.log'

function Log([string]$m) {
  $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $m"
  Write-Output $line
  Add-Content -Path $log -Value $line
}

function Start-DshElevated {
  # 以管理员身份启动（沙箱设 SACL 需要 SeSecurityPrivilege）；本机 UAC=0 → 静默提升
  try {
    Start-Process -FilePath $exe -Verb RunAs -ErrorAction Stop | Out-Null
    Log '已以管理员身份启动 DSH'
  } catch {
    Log ('提升启动失败（' + $_.Exception.Message + '），回退普通启动')
    Start-Process -FilePath $exe -WindowStyle Hidden | Out-Null
  }
}
function Test-Tcp([int]$port) {
  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $task = $client.ConnectAsync('127.0.0.1', $port)
    $ok = $task.Wait(3000) -and $client.Connected
    $client.Close()
    return $ok
  } catch { return $false }
}

function Get-DshGuiPort {
  $pids = @(Get-Process 'DeepSeek Harness' -ErrorAction SilentlyContinue).Id
  if ($pids.Count -eq 0) { return $null }
  $listen = @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $pids -contains $_.OwningProcess -and $_.LocalAddress -eq '127.0.0.1' })
  if ($listen.Count -eq 0) { return $null }
  return ($listen | Sort-Object LocalPort -Descending | Select-Object -First 1).LocalPort
}

function Test-DshHealth {
  $procs = @(Get-Process 'DeepSeek Harness' -ErrorAction SilentlyContinue)
  if ($procs.Count -eq 0) { return @{ ok = $false; reason = '进程未运行' } }
  for ($i = 0; $i -lt 6; $i++) {
    $port = Get-DshGuiPort
    if ($port -ne $null -and (Test-Tcp $port)) {
      return @{ ok = $true; reason = ("进程 OK / GUI 端口 $port 可连"); port = $port }
    }
    Start-Sleep -Seconds 3
  }
  return @{ ok = $false; reason = 'GUI 端口未就绪' }
}

function Save-GoodProfile {
  if (Test-Path $goodDir) { Remove-Item $goodDir -Recurse -Force -ErrorAction SilentlyContinue }
  New-Item -ItemType Directory -Force -Path $goodDir | Out-Null
  foreach ($f in 'package.json', 'cordis.patch.yml', 'cordis.yml') {
    $src = Join-Path $profileDir $f
    if (Test-Path $src) { Copy-Item $src (Join-Path $goodDir $f) -Force }
  }
}

function Restore-GoodProfile {
  $restored = @()
  foreach ($f in 'package.json', 'cordis.patch.yml', 'cordis.yml') {
    $src = Join-Path $goodDir $f
    if (Test-Path $src) {
      Copy-Item $src (Join-Path $profileDir $f) -Force
      $restored += $f
    }
  }
  return $restored
}

function Test-InsideDsh {
  $current = $PID
  for ($i = 0; $i -lt 8; $i++) {
    $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$current" -ErrorAction SilentlyContinue
    if ($proc -eq $null) { return $false }
    if ($proc.Name -eq 'DeepSeek Harness.exe') { return $true }
    $current = $proc.ParentProcessId
    if ($current -eq 0) { return $false }
  }
  return $false
}

if ($CheckOnly) {
  $h = Test-DshHealth
  Log ("健康检查 → ok=" + $h.ok + " / " + $h.reason)
  return
}

if (Test-InsideDsh) {
  Log '在 DSH 会话内运行：只做健康检查 + 保存良好配置，不杀进程/不重启'
  $h = Test-DshHealth
  Log ("健康检查 → ok=" + $h.ok + " / " + $h.reason)
  if ($h.ok) { Save-GoodProfile; Log '已保存「上次良好配置」' }
  return
}

# 1. 杀掉旧 DSH
$old = @(Get-Process 'DeepSeek Harness' -ErrorAction SilentlyContinue)
if ($old.Count -gt 0) {
  Log ("清理旧进程 " + $old.Count + " 个")
  $old | Stop-Process -Force
  Start-Sleep -Seconds 3
}

# 2. 启动
Log '启动 DSH…'
Start-DshElevated
Start-Sleep -Seconds $WaitSeconds

# 3. 健康检测
$h = Test-DshHealth
Log ("第 1 次健康检查 → ok=" + $h.ok + " / " + $h.reason)

if ($h.ok) {
  Save-GoodProfile
  Log '启动正常，已保存「上次良好配置」'
  return
}

# 4. 不健康 → 回滚一次
Log '启动异常 → 执行回滚一次…'
Get-Process 'DeepSeek Harness' -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 3
if (Test-Path (Join-Path $goodDir 'package.json')) {
  $restored = Restore-GoodProfile
  Log ('已回滚配置: ' + ($restored -join ', '))
} else {
  Log '无「上次良好配置」可回滚，仅重启'
}
Start-DshElevated
Start-Sleep -Seconds $WaitSeconds
$h2 = Test-DshHealth
Log ("回滚后健康检查 → ok=" + $h2.ok + " / " + $h2.reason)
