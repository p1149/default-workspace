' Launch the Ollama server with a hidden window (window style 0) so no
' console window flashes. Invoked by the llm-ollama DSH plugin.
Set sh = CreateObject("WScript.Shell")
exe = sh.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\Programs\Ollama\ollama.exe"
sh.Run """" & exe & """ serve", 0, False
