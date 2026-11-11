import fs from 'node:fs';import path from 'node:path';import {runtimeRoot} from './config.ts';
// Explicit local test mode only. The handoff launcher forces this mode OFF.
// Delays actual requests; it never substitutes in-memory persistence or data.
export async function saveDelay(){if(process.env.T3_TEST_FAULTS!=='1')return;try{const value=JSON.parse(fs.readFileSync(path.join(runtimeRoot,'test-faults.json'),'utf8'));const delay=Number(value.saveDelayMs);if(Number.isFinite(delay)&&delay>0)await new Promise(resolve=>setTimeout(resolve,Math.min(delay,5000)));}catch{/* No fault fixture is the normal path. */}}
