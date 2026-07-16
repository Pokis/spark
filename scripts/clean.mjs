import { rmSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
for (const relative of [
  'apps/admin/dist',
  'services/control-plane/dist',
  'packages/domain/dist',
  'packages/cloud-contracts/dist',
  'coverage',
]) {
  rmSync(join(root, relative), { recursive: true, force: true });
}
console.log('Removed generated build and coverage directories.');
