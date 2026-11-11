import snapshotData from './sites-data.json' with {type:'json'};
import {works as fixtureWorks} from './fixtures.ts';import {siteData as fixtureSite,notes as fixtureNotes} from './site.ts';
import type {Work,Note,SiteData} from '@zhiqing/content';
const selected=snapshotData as null|{data:SiteData;works:Work[];notes:Note[];snapshot:{id:string;candidate:string;media:{path:string;sha256:string;bytes:number}[]};redirects?:Record<string,string>};
export const works:Work[]=selected?.works??fixtureWorks;
export const notes:Note[]=selected?.notes??fixtureNotes;
export const siteData:SiteData=selected?.data??fixtureSite;
export const publicSnapshot=selected?.snapshot??null;
export const redirects=selected?.redirects??{};
