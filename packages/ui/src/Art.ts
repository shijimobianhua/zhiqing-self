import {roleAsset} from '@zhiqing/content';
export const artSource=roleAsset;
export const artDisplay=roleAsset;
export function artThumbnail(src:string){const mapped=roleAsset(src);return mapped==='/assets/role-202611/avatar.webp'?'/assets/role-202611/avatar-96.webp':mapped;}
