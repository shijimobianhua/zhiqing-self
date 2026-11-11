import {strict as assert} from 'node:assert';
import {readFileSync,writeFileSync} from 'node:fs';
import {contract,siteData,works,notes} from './load-public-fixtures.mjs';
const results=[];
for(const [route,needle] of [['/','把好奇心'],['/works','灵感收集器'],['/works/inspiration-collector','怎样让零散的想法被留下来'],['/notes','让喜欢的事'],['/notes/from-ideas','先记下吸引自己的细节'],['/about','我喜欢的工作方式'],['/test-states','前台状态检查']]){
  const response=await fetch('http://127.0.0.1:3000'+route);const html=await response.text();
  assert.equal(response.status,200);assert.ok(html.includes(needle));
  const head=contract.contentHead(route,siteData,works,notes);
  assert.ok(html.includes(head.title));assert.ok(html.includes('noindex'));assert.ok(html.includes('og:title'));assert.ok(html.includes('twitter:card'));assert.ok(html.includes(`rel="canonical" href="http://127.0.0.1:3000${route}"`));
  results.push({environment:'Next production local',route,status:response.status,body:true,metadata:true,noindex:true});
}
for(const route of ['/missing','/works/missing','/notes/missing','/notes/unpublished']){
 const response=await fetch('http://127.0.0.1:3000'+route);const html=await response.text();assert.equal(response.status,404);assert.ok(html.includes(siteData.settings.missingTitle));results.push({environment:'Next production local',route,status:404,uniform404:true});
}
for(const route of ['','works','works/inspiration-collector','notes','notes/from-ideas','about','test-states']){
 const file=route?`dist/${route}/index.html`:'dist/index.html';const html=readFileSync(file,'utf8');assert.ok(/id="root" data-route=/.test(html));assert.ok(html.includes('<main'));assert.ok(html.includes('noindex'));assert.ok(html.includes('og:title'));assert.ok(html.includes('rel="canonical"'));
 results.push({environment:'Sites static artifact',route:'/'+route,body:true,metadata:true,noindex:true});
}
writeFileSync(new URL('../docs/verification-t2/http-and-html.json',import.meta.url),JSON.stringify(results,null,2));
console.log(`PASS: ${results.length} real local HTTP / static HTML assertions. Local 404 status is not a claim about authenticated Sites HTTP status.`);
