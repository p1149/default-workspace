# 重启 DSH（提升启动）——计划任务体：杀旧进程 → 以管理员身份启动
# exe 路径不再写死（2026-11-01 发现旧路径指向不存在的 AppData 安装位）；可用 $env:DSH_EXE 覆盖。
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
$exe = Resolve-DshExe
$log = 'D:\dsh\archives\restart-dsh.log'
function Log([string]$m) { Add-Content -Path $log -Value ("[" + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + "] " + $m) -Encoding UTF8 }

Log 'elevated restart: 正在结束 DSH'
Get-Process 'DeepSeek Harness' -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 3
try {
  Start-Process -FilePath $exe -Verb RunAs -ErrorAction Stop | Out-Null
  Log 'elevated restart: 已以管理员身份启动 DSH'
} catch {
  Log ('elevated restart: 提升启动失败（' + $_.Exception.Message + '），回退普通启动')
  Start-Process -FilePath $exe | Out-Null
}
