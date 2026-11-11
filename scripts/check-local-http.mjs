import { strict as assert } from 'node:assert';
import { writeFileSync } from 'node:fs';
const results=[];
for (const [origin,route,status,needle] of [
  ['http://127.0.0.1:5173','/',200,'T1-R1'],
  ['http://127.0.0.1:5173','/works/inspiration-collector',200,'T1-R1'],
  ['http://127.0.0.1:3000','/works',200,'灵感收集器'],
  ['http://127.0.0.1:3000','/works/inspiration-collector',200,'怎样让零散的想法被留下来'],
  ['http://127.0.0.1:3000','/works/missing',404,'没有找到这个页面'],
  ['http://127.0.0.1:3000','/missing',404,'没有找到这个页面'],
]) {
  const response=await fetch(origin+route); const html=await response.text();
  assert.equal(response.status,status,route); assert.ok(html.includes(needle),route);
  assert.ok(/noindex/.test(html),route);
  results.push({url:origin+route,expectedStatus:status,status:response.status,serverBodyPresent:true,noindex:true,result:'pass'});
}
writeFileSync(new URL('../docs/verification-t0-t1/local-http.json',import.meta.url),JSON.stringify(results,null,2));
console.log(`PASS: ${results.length} real local production HTTP responses; Next contains server-rendered body and real 404.`);
