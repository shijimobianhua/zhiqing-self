import { cpSync, mkdirSync } from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
mkdirSync(path.join(root, 'apps/web/public'), { recursive: true });
// Public, explicitly allowed character art and font licenses only.
for (const dir of ['assets', 'fonts']) cpSync(path.join(root, 'apps/preview/public', dir), path.join(root, 'apps/web/public', dir), { recursive: true });
console.log('Prepared Next public assets from the canonical preview/public source.');
