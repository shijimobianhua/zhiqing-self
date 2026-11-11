// User-facing local runtime. No service installation, tunnel, or remote binding.
import fs from 'node:fs';import path from 'node:path';import {spawn,execFileSync} from 'node:child_process';import {createRequire} from 'node:module';
const root=path.resolve(import.meta.dirname,'..');process.chdir(root);const runtime=path.join(root,'runtime/t3');const cfg=JSON.parse(fs.readFileSync(path.join(runtime,'secrets.json'),'utf8'));
if(cfg.origin!=='http://127.0.0.1:3000'||cfg.port!==55432)throw Error('Only the approved loopback test runtime is supported');
execFileSync(process.execPath,[path.join(root,'scripts/t3-local.mjs'),'start'],{cwd:root,stdio:'ignore',windowsHide:true});
fs.writeFileSync(path.join(runtime,'service.json'),JSON.stringify({root,pid:process.pid,startedAt:new Date().toISOString(),node:process.execPath},null,2));
const require=createRequire(path.join(root,'apps/web/package.json'));const next=require.resolve('next/dist/bin/next');
const child=spawn(process.execPath,[next,'start','--hostname','127.0.0.1','--port','3000'],{cwd:path.join(root,'apps/web'),stdio:'inherit',windowsHide:true,env:{...process.env,NODE_ENV:'production',T3_ENABLED:'1',ZHIQING_ROOT:root,SITE_ORIGIN:cfg.origin,T3_TEST_FAULTS:'0'}});
child.on('error',()=>{console.error('本机网站启动失败，请查看 runtime/t3/service.log');process.exit(1);});child.on('exit',code=>process.exit(code??1));
