import pg, {type PoolClient} from 'pg';
import {secrets,CmsError,uuid} from './config.ts';
const state=globalThis as typeof globalThis & {zqT3Pool?:pg.Pool};
export function pool(){if(!state.zqT3Pool){const p=new pg.Pool({connectionString:secrets().databaseURL,max:8,idleTimeoutMillis:10000,connectionTimeoutMillis:3000});p.on('error',()=>{console.error('T3 database connection interrupted; the next request can reconnect.');});state.zqT3Pool=p;}return state.zqT3Pool;}
export async function transaction<T>(fn:(client:PoolClient)=>Promise<T>):Promise<T>{const c=await pool().connect();try{await c.query('BEGIN');const result=await fn(c);await c.query('COMMIT');return result;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
export function checkedId(id:string){if(!uuid.test(id))throw new CmsError(404,'没有找到内容');return id;}
export async function audit(action:string,id:string|null,result:string,actor:string|number|null){await pool().query('INSERT INTO zq_audit(action,object_id,result,actor) VALUES($1,$2,$3,$4)',[action,id,result,actor?.toString()??null]);}
