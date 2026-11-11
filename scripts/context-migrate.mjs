import fs from 'node:fs';
import {createHash} from 'node:crypto';
process.env.T3_ENABLED='1';
const {transaction,pool}=await import('../apps/web/src/server/t3/db.ts');
const sql=fs.readFileSync(new URL('../apps/web/src/server/t4/context-migration.sql',import.meta.url),'utf8').replaceAll('\r\n','\n');
const checksum=createHash('sha256').update(sql).digest('hex');
try {await transaction(async c=>{
 await c.query('SELECT pg_advisory_xact_lock(842674,4)');
 const existing=(await c.query("SELECT checksum FROM zq_migrations WHERE version='004-context'")).rows[0];
 if(existing){if(existing.checksum!==checksum)throw Error('004-context checksum mismatch');return;}
 await c.query(sql);await c.query("INSERT INTO zq_migrations(version,checksum) VALUES('004-context',$1)",[checksum]);
});console.log('004-context ready; existing data preserved; no articles seeded.');}finally{await pool().end();}
