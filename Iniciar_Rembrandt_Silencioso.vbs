Set WshShell = CreateObject("WScript.Shell")
strPath = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)

' Ejecutar el servidor en segundo plano
WshShell.Run "cmd /c cd /d """ & strPath & """ && npm install && npm run dev", 0, False

' Esperar 6 segundos para que el servidor local inicie
WScript.Sleep 6000

' Abrir el navegador en la ruta del dashboard local
WshShell.Run "http://localhost:3000"
