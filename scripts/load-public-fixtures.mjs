async function load(file) {return import(new URL(file,import.meta.url));}
export const contract=await load('../packages/content/src/index.ts');
export const {works}=await load('../packages/adapters/src/fixtures.ts');
export const {notes,siteData}=await load('../packages/adapters/src/site.ts');
