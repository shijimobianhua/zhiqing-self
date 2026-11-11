import {NotFound} from '@zhiqing/ui';import {getGraph} from '../server/public-data';
export default async function Missing(){return <NotFound settings={(await getGraph()).data.settings} />;}
