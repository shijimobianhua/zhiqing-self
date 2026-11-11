// Versioned public identity. Historical stored content is not rewritten.
export const roleAssetMap:Record<string,string>={
 '/assets/character-avatar.png':'/assets/role-202611/avatar.webp',
 '/assets/character-avatar.webp':'/assets/role-202611/avatar.webp',
 '/assets/character-avatar-96.webp':'/assets/role-202611/avatar-96.webp',
 '/assets/01-collecting-ideas.png':'/assets/role-202611/01-desk.webp',
 '/assets/01-collecting-ideas.webp':'/assets/role-202611/01-desk.webp',
 '/assets/01-collecting-ideas-768.webp':'/assets/role-202611/01-desk.webp',
 '/assets/02-connecting-ideas.png':'/assets/role-202611/05-connecting.webp',
 '/assets/02-connecting-ideas.webp':'/assets/role-202611/05-connecting.webp',
 '/assets/02-connecting-ideas-768.webp':'/assets/role-202611/05-connecting.webp',
 '/assets/03-testing-feedback.png':'/assets/role-202611/06-testing.webp',
 '/assets/03-testing-feedback.webp':'/assets/role-202611/06-testing.webp',
 '/assets/03-testing-feedback-768.webp':'/assets/role-202611/06-testing.webp',
 '/assets/intro-r4/01-curiosity.png':'/assets/role-202611/02-curiosity.webp',
 '/assets/intro-r4/02-making.png':'/assets/role-202611/03-making.webp',
 '/assets/intro-r4/03-journal.png':'/assets/role-202611/04-journal.webp',
};
export const roleAsset=(src:string)=>roleAssetMap[src]??src;
export function mapPublicRoleAssets<T>(input:T):T{
 if(typeof input==='string')return roleAsset(input) as T;
 if(Array.isArray(input))return input.map(mapPublicRoleAssets) as T;
 if(input&&typeof input==='object')return Object.fromEntries(Object.entries(input).map(([k,v])=>[k,mapPublicRoleAssets(v)])) as T;
 return input;
}
