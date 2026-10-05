import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

export const dataDir = process.env.DATA_DIR ?? fileURLToPath(new URL('../.data/', import.meta.url));
export const cacheDir = process.env.CACHE_DIR ?? join(dataDir, 'cache');
export const clientDist = fileURLToPath(new URL('../../client/dist/', import.meta.url));
