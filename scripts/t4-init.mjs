import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
process.env.ZHIQING_ROOT=path.resolve(import.meta.dirname,'..');process.env.T3_ENABLED='1';
const {transaction,pool}=await import('../apps/web/src/server/t3/db.ts');
const {secrets}=await import('../apps/web/src/server/t3/config.ts');
const {lock,initializeGlobals}=await import('../apps/web/src/server/t4/content.ts');
const sql=fs.readFileSync(new URL('../apps/web/src/server/t4/migration.sql',import.meta.url),'utf8').replaceAll('\r\n','\n');
const checksum=createHash('sha256').update(sql).digest('hex');
await transaction(async c=>{await lock(c);const old=(await c.query("SELECT checksum FROM zq_migrations WHERE version='003-t4'")).rows[0];if(old){if(old.checksum!==checksum)throw Error('003 migration checksum differs; preserve existing data and add a new migration');}else{await c.query(sql);await c.query("INSERT INTO zq_migrations(version,checksum) VALUES('003-t4',$1)",[checksum]);}await initializeGlobals(c,{id:secrets().ownerId});});
console.log('T4 additive migration ready; T3 rows and auth retained; initial globals preserve prior template. No note fixtures seeded.');await pool().end();
