import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cacheDir as dir } from './paths';
const memory = new Map<string, unknown>();

export const hashOf = (...parts: unknown[]) =>
  createHash('sha256').update(JSON.stringify(parts)).digest('hex').slice(0, 32);

export function cacheGet<T>(key: string): T | undefined {
  if (memory.has(key)) return memory.get(key) as T;
  const file = join(dir, `${key}.json`);
  if (!existsSync(file)) return undefined;
  const value = JSON.parse(readFileSync(file, 'utf8')) as T;
  memory.set(key, value);
  return value;
}

export function cacheSet(key: string, value: unknown, persist = true): void {
  memory.set(key, value);
  if (!persist) return;
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${key}.json`), JSON.stringify(value));
}
