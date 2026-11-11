import fs from 'node:fs';
import path from 'node:path';
export const projectRoot=path.resolve(process.env.ZHIQING_ROOT || process.cwd().replace(/[\\/]apps[\\/]web$/,''));
export const baseRuntimeRoot=path.join(projectRoot,'runtime','t3');
const restoreId=process.env.T4_ISOLATED_ID;
if(restoreId&&!/^[a-f0-9]{32}$/.test(restoreId))throw Error('Invalid isolated environment ID');
export const runtimeRoot=restoreId?path.join(baseRuntimeRoot,'restores',restoreId):baseRuntimeRoot;
export const mediaRoot=path.join(runtimeRoot,'media');
export type Secrets={databaseURL:string;adminDatabaseURL:string;payloadSecret:string;ownerEmail:string;ownerPassword:string;ownerId?:number|string;origin:string;port:number;pgPassword:string};
export function secrets():Secrets {
  const value=JSON.parse(fs.readFileSync(path.join(runtimeRoot,'secrets.json'),'utf8')) as Secrets;
  const origin=new URL(value.origin);
  const database=new URL(value.databaseURL);
  if(origin.origin!==(restoreId?'http://127.0.0.1:3001':'http://127.0.0.1:3000')||!['postgres:','postgresql:'].includes(database.protocol)||database.hostname!=='127.0.0.1'||database.port!=='55432'||database.pathname!==(restoreId?'/zhiqing_restore_'+restoreId:'/zhiqing_t3'))throw new Error('Only explicitly isolated loopback configuration is allowed');
  return value;
}
export function isEnabled(){return process.env.T3_ENABLED==='1';}
export const cookiePrefix=restoreId?'zhiqing_restore_'+restoreId.slice(0,12):'zhiqing_t3';
export const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export class CmsError extends Error {status:number;details?:unknown;constructor(status:number,message:string,details?:unknown){super(message);this.status=status;this.details=details;}}
