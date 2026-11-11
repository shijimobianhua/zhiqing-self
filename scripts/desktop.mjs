import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {root,nodePath,activeJob,sourceRevision,atomic,privateRoot} from './site/common.mjs';
const command=process.argv[2]||'start';
function run(args){return execFileSync(nodePath(),args,{cwd:root,encoding:'utf8',windowsHide:true,env:{...process.env,ZHIQING_NODE:nodePath()}});}
try{
 if(command==='record-build'){atomic(path.join(privateRoot,'web-build.json'),{appRevision:sourceRevision(),node:nodePath(),at:new Date().toISOString()});console.log('已记录当前后台构建版本');}
 else if(command==='install'){execFileSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(root,'scripts/desktop/install.ps1')],{cwd:root,stdio:'inherit',windowsHide:true});}
 else if(command==='stop'){if(activeJob())throw Error('网站发布任务仍在进行，请等任务完成后再停止本机后台。');console.log(run([path.join(root,'scripts/t4-isolated.mjs'),'stop']));console.log(run([path.join(root,'scripts/t3-launch.mjs'),'stop']));}
 else if(command==='start'){
  const receipt=path.join(privateRoot,'web-build.json');
  if(!fs.existsSync(receipt)||JSON.parse(fs.readFileSync(receipt,'utf8')).appRevision!==sourceRevision()){
   if(activeJob())throw Error('网站正在发布，请等待发布完成后再更新后台。');
   console.log('后台有更新，正在准备新版本，首次打开请稍候。');
   const revision=sourceRevision();
   console.log(run([path.join(root,'scripts/t3-launch.mjs'),'stop']));
   console.log(run([path.join(root,'scripts/t3-launch.mjs'),'db-start']));
   console.log(run([path.join(root,'scripts/prepare-assets.mjs')]));
   const require=createRequire(path.join(root,'apps/web/package.json'));
   const buildLog=path.join(privateRoot,'desktop-build.log');
   try{const output=execFileSync(nodePath(),[require.resolve('next/dist/bin/next'),'build'],{cwd:path.join(root,'apps/web'),encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024,env:{...process.env,T3_ENABLED:'1',ZHIQING_ROOT:root,NEXT_TELEMETRY_DISABLED:'1'}});fs.writeFileSync(buildLog,output);}catch(e){fs.writeFileSync(buildLog,String(e.stdout||'')+String(e.stderr||''));throw Error('后台更新未完成，请查看 runtime/site-publisher/desktop-build.log；内容仍保留。');}
   if(sourceRevision()!==revision)throw Error('构建期间源码又有变化，请再次打开启动器。');
   atomic(receipt,{appRevision:revision,node:nodePath(),at:new Date().toISOString(),automatic:true});
  }
  console.log(run([path.join(root,'scripts/t3-launch.mjs'),'start']));
  execFileSync('powershell.exe',['-NoProfile','-Command',"Start-Process 'http://127.0.0.1:3000/admin'"],{windowsHide:true});
 }else throw Error('启动操作无效');
}catch(e){console.error(e.message);process.exitCode=1;}
