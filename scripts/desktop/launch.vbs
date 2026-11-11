Option Explicit
Dim shell,fso,folder,action,code
Set shell=CreateObject("WScript.Shell")
Set fso=CreateObject("Scripting.FileSystemObject")
folder=fso.GetParentFolderName(WScript.ScriptFullName)
action="start"
If WScript.Arguments.Count > 0 Then action=WScript.Arguments(0)
If action<>"start" And action<>"stop" Then WScript.Quit 1
code=shell.Run("powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File " & Chr(34) & folder & "\launch.ps1" & Chr(34) & " -Action " & action,0,False)
