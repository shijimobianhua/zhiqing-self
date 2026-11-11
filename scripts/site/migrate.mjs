import fs from 'node:fs';
import path from 'node:path';
import {root,hash,atomic,privateRoot} from './common.mjs';
process.env.ZHIQING_ROOT=root;process.env.T3_ENABLED='1';
const {pool,transaction}=await import('../../apps/web/src/server/t3/db.ts');
const {lock}=await import('../../apps/web/src/server/t4/content.ts');
const sql=fs.readFileSync(path.join(root,'apps/web/src/server/site-release/migration.sql'),'utf8').replaceAll('\r\n','\n');
try{await transaction(async c=>{await lock(c);const old=(await c.query("SELECT checksum FROM zq_migrations WHERE version='004-site-release'")).rows[0];if(old){if(old.checksum!==hash(sql))throw Error('004 migration checksum conflict');return;}
 const backup=(await c.query("SELECT id FROM zq_maintenance WHERE kind='database-media-backup' AND state='complete' ORDER BY created_at DESC LIMIT 1")).rows[0];if(!backup)throw Error('请先创建数据库与媒体备份');
 await c.query(sql);const allow=JSON.parse(fs.readFileSync(path.join(root,'.openai/t4-snapshot-allowlist.json'),'utf8'));
 const approved=[...allow.workIds,...allow.noteIds];
 const rows=(await c.query("SELECT id,kind,publication_version FROM zq_content WHERE published IS NOT NULL AND lifecycle='active' AND (id=ANY($1::uuid[]) OR kind IN ('home','about','now','settings'))",[approved])).rows;
 for(const r of rows)await c.query('INSERT INTO zq_site_release_approvals(content_id,publication_version) VALUES($1,$2)',[r.id,r.publication_version]);
 await c.query("INSERT INTO zq_migrations(version,checksum) VALUES('004-site-release',$1)",[hash(sql)]);
 atomic(path.join(privateRoot,'approval-baseline.json'),{at:new Date().toISOString(),backupId:backup.id,initialApproval:rows,rule:'Existing reviewed demonstration selection plus current public global documents; other historical local test publications excluded. Future publish actions approve exact publication versions.'});
});console.log('004 追加迁移完成；已有数据、账号、原迁移校验和保留。');}finally{await pool().end();}
