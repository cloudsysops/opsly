Option Explicit
Dim shell, fso, root, node, candidates, c
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = "C:\Users\opsly\OneDrive\Documents\ChatGPT\intcloudsysops\stream-overlay\"

' node del PATH; si no está, el runtime de Codex
node = "node"
candidates = Array("C:\Program Files\nodejs\node.exe", "C:\Users\opsly\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe")
For Each c In candidates
  If fso.FileExists(c) Then node = """" & c & """": Exit For
Next

WScript.Sleep 30000
shell.Run node & " """ & root & "server.mjs""", 0, False
WScript.Sleep 5000
shell.Run node & " """ & root & "scene-rotator.mjs""", 0, False
