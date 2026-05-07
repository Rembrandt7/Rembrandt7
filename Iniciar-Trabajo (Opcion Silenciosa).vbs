Set WshShell = CreateObject("WScript.Shell")
strPath = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)

' Ejecutar el servidor con el PORTABLE NODE. Esto evita cualquier bloqueo
' de PATH, antivirus, o la falta de NodeJS instalado en la maquina de la oficina.
' Ejecutamos directamente node-portable y le pedimos cargar server.ts usando tsx interno
WshShell.Run "cmd /c cd /d """ & strPath & """ && node-portable.exe node_modules\tsx\dist\cli.mjs server.ts > boot_log.txt 2>&1", 0, False

' Leer dinámicamente el APP_URL de .env por si el host cambia según el programa
Dim envFile, appUrl, lineText
appUrl = "http://localhost:3000" ' URL por defecto
If CreateObject("Scripting.FileSystemObject").FileExists(strPath & "\.env") Then
    Set envFile = CreateObject("Scripting.FileSystemObject").OpenTextFile(strPath & "\.env", 1)
    Do Until envFile.AtEndOfStream
        lineText = envFile.ReadLine
        If InStr(lineText, "APP_URL=") = 1 Then
            appUrl = Replace(Split(lineText, "=")(1), """", "")
        End If
    Loop
    envFile.Close
End If

' Esperar para abrir el navegador (3 segundos bastan)
WScript.Sleep 3000
WshShell.Run appUrl
