<#
.SYNOPSIS
  重启 DSH，重启前全屏显示倒计时读秒（5 → 1）。
  必须由独立进程 / 计划任务运行：杀 DSH 后本脚本要能继续跑完。
#>
param([int]$Seconds = 5)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$dshExe = 'C:\Users\76927\AppData\Local\Programs\DeepSeek Harness\DeepSeek Harness.exe'
$log = 'D:\dsh\archives\restart-dsh.log'

function Log([string]$m) {
  $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $m"
  Write-Output $line
  Add-Content -Path $log -Value $line
}

$form = New-Object System.Windows.Forms.Form
$form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
$form.WindowState = [System.Windows.Forms.FormWindowState]::Maximized
$form.TopMost = $true
$form.BackColor = [System.Drawing.Color]::Black
$form.ShowInTaskbar = $false

$label = New-Object System.Windows.Forms.Label
$label.Dock = [System.Windows.Forms.DockStyle]::Fill
$label.ForeColor = [System.Drawing.Color]::White
$label.BackColor = [System.Drawing.Color]::Black
$label.TextAlign = [System.Drawing.ContentAlignment]::MiddleCenter
$label.Font = New-Object System.Drawing.Font('Microsoft YaHei', 110, [System.Drawing.FontStyle]::Bold)
$form.Controls.Add($label)

$script:left = $Seconds
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 1000
$timer.Add_Tick({
  if ($script:left -le 0) {
    $timer.Stop()
    $form.Close()
    return
  }
  $label.Text = "洛绫薇即将重启`n`n" + $script:left
  $script:left--
})
$form.Add_Shown({
  $label.Text = "洛绫薇即将重启`n`n" + $script:left
  $timer.Start()
})
[void]$form.ShowDialog()

Log ('倒计时结束（' + $Seconds + ' 秒），开始重启 DSH')
Get-Process 'DeepSeek Harness' -ErrorAction SilentlyContinue | Stop-Process -Force
Log '已终止 DSH'
Start-Sleep -Seconds 3
Start-Process -FilePath $dshExe
Log '已重新启动 DSH'
