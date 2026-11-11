$ErrorActionPreference='Stop'
$projectDir=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$desktopDir=[Environment]::GetFolderPath('Desktop')
$shell=New-Object -ComObject WScript.Shell
foreach($item in @(@('之青网站管理','start'),@('停止之青网站管理','stop'))) {
 $shortcut=$shell.CreateShortcut((Join-Path $desktopDir ($item[0]+'.lnk')))
 $shortcut.TargetPath=Join-Path $env:SystemRoot 'System32/wscript.exe'
 $shortcut.Arguments='"'+(Join-Path $PSScriptRoot 'launch.vbs')+'" '+$item[1]
 $shortcut.WorkingDirectory=$projectDir
 $shortcut.Description='本机网站管理；不公开后台或数据库'
 $shortcut.IconLocation=(Join-Path $PSScriptRoot 'zhiqing.ico')+',0'
 $shortcut.Save()
}
$guide=$shell.CreateShortcut((Join-Path $desktopDir '之青网站管理说明.lnk'))
$guide.TargetPath=Join-Path $projectDir 'docs/本机网站管理与发布操作.md'
$guide.IconLocation=(Join-Path $PSScriptRoot 'zhiqing.ico')+',0'
$guide.Save()
Write-Output '已创建当前用户桌面的管理、停止和说明快捷方式。'
