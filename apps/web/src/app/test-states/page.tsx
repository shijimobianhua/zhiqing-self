import { TestStates } from '@zhiqing/ui';
import { siteData, works, notes } from '@zhiqing/adapters';
import { metadataFor } from '../metadata';
export async function generateMetadata(){return metadataFor('/test-states');}
export const dynamic='force-dynamic';
export default function Tests() {return <TestStates data={siteData} works={works} notes={notes} />;}
