' Run restart-dsh.ps1 with a hidden window (no console flash).
' Scheduled task runs wscript.exe on this file.
Dim sh, base, scriptPath
Set sh = CreateObject("WScript.Shell")
base = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\"))
scriptPath = base & "restart-dsh.ps1"
sh.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -File """ & scriptPath & """", 0, False
