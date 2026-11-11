// Check rendered copy, not bundled source: local preview diagnostics remain useful.
export function assertPublicCopy(html){
 const text=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<!--[^]*?-->/g,'').replace(/<[^>]+>/g,' ').replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>String.fromCodePoint(n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n)));
 const diagnostic=/公开版本(?!为\s*\d+\.\d+\.\d+)|公开内容|标注为示例|本机编辑并发布|已发布测试内容|测试作品|示例作品|示例项目|试用内容|私人测试候选|私人 Sites|公开测试快照|允许的示例快照|示例近况|更新时间待确认|待补充真实|确认内容后|尚待提供|仅用于展示|设计示例|阅读体验示例|草稿不会公开|T[1-5]-R\d/;
 if(diagnostic.test(text))throw Error('正式页面残留开发说明：'+text.match(diagnostic)[0]);
 for(const tag of html.match(/<meta\b[^>]*>/gi)||[]){
  if(/(?:name|property)=["'](?:description|og:title|og:description|twitter:title|twitter:description)["']/i.test(tag)&&diagnostic.test(tag))throw Error('正式页面分享信息残留开发说明');
 }
 if(/class=["'](?:preview-notice|environment-label)["']/.test(html))throw Error('正式页面残留环境说明容器');
}
