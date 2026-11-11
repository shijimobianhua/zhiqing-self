param([ValidateSet('start','stop')][string]$Action='start')
$ErrorActionPreference='Stop'
$projectDir=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$logDir=Join-Path $projectDir 'runtime/site-publisher'
New-Item -ItemType Directory -Force $logDir | Out-Null
try {
 $nodeExecutable=Join-Path $projectDir 'runtime/tools/node.exe'
 if(-not (Test-Path -LiteralPath $nodeExecutable)) { throw '兼容的 Node 未安装，请按本机操作说明修复。' }
 $output= & $nodeExecutable (Join-Path $projectDir 'scripts/desktop.mjs') $Action 2>&1
 $exitCode=$LASTEXITCODE
 $output | Out-File -LiteralPath (Join-Path $logDir ('desktop-'+$Action+'.log')) -Encoding utf8
 if($exitCode -ne 0) { throw ($output -join "`n") }
 if($Action -eq 'stop') { Add-Type -AssemblyName System.Windows.Forms; [Windows.Forms.MessageBox]::Show('本机后台已停止，内容保留。线上静态网站继续可访问。','之青网站管理') | Out-Null }
} catch {
 Add-Type -AssemblyName System.Windows.Forms
 [Windows.Forms.MessageBox]::Show($_.Exception.Message+"`n私有日志：runtime/site-publisher",'之青网站管理') | Out-Null
 exit 1
}
