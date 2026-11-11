import {cache} from 'react';
import {works as fixtures,siteData,notes} from '@zhiqing/adapters';
import {isEnabled} from './t3/config';
import {publicGraph} from './t4/content';
export const getGraph=cache(async()=>isEnabled()?publicGraph():{data:siteData,works:fixtures,notes,versions:{}});
export const getPublicWorks=cache(async()=>(await getGraph()).works);
export const getHomeData=cache(async()=>(await getGraph()).data);
