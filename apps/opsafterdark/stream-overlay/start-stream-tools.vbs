Option Explicit
Dim shell, fso, root, engineRoot, node, candidates, c
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
' root = carpeta de datos de ESTE tenant (apps/opsafterdark/stream-overlay dentro del clon de cloudsysops/opsly).
root = "C:\Users\opsly\OneDrive\Documents\ChatGPT\intcloudsysops\stream-overlay\"
' engineRoot = motor compartido packages/stream-ops-kit/src, relativo a root dentro del mismo clon del repo.
engineRoot = root & "..\..\..\packages\stream-ops-kit\src\"
shell.Environment("Process")("STREAM_KIT_DATA_DIR") = root

' node del PATH; si no está, el runtime de Codex
node = "node"
candidates = Array("C:\Program Files\nodejs\node.exe", "C:\Users\opsly\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe")
For Each c In candidates
  If fso.FileExists(c) Then node = """" & c & """": Exit For
Next

WScript.Sleep 30000
shell.Run node & " """ & engineRoot & "server.mjs""", 0, False
' Rotación de escenas por foco de BF6: scripts/ops/obs-scene-automation.ps1 (PR #1680),
' no packages/stream-ops-kit — arrancar ese watcher aparte una vez que ese PR mergee.
