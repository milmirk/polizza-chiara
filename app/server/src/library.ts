import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LEVELS, type LibraryEntry, type LibraryMeta } from '../../shared/types';
import { dataDir } from './paths';

const dir = () => join(dataDir, 'library');
const ID = /^[a-z0-9-]{4,80}$/;

const slug = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

const levelRank = (l: string) => {
  const i = LEVELS.findIndex((x) => x.toLowerCase() === l.toLowerCase());
  return i === -1 ? LEVELS.length : i;
};

const meta = ({ policy: _p, checks: _c, sourceText: _s, ...m }: LibraryEntry): LibraryMeta => m;

export function listEntries(): LibraryMeta[] {
  if (!existsSync(dir())) return [];
  return readdirSync(dir())
    .filter((f) => f.endsWith('.json'))
    .map((f) => meta(JSON.parse(readFileSync(join(dir(), f), 'utf8')) as LibraryEntry))
    .sort((a, b) => a.product.localeCompare(b.product, 'it') || levelRank(a.level) - levelRank(b.level) || a.name.localeCompare(b.name, 'it'));
}

export function getEntry(id: string): LibraryEntry | undefined {
  if (!ID.test(id)) return undefined;
  const file = join(dir(), `${id}.json`);
  return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as LibraryEntry) : undefined;
}

export function saveEntry(input: Pick<LibraryEntry, 'product' | 'level' | 'name' | 'policy' | 'checks' | 'sourceText'>, id?: string): LibraryEntry {
  const entry: LibraryEntry = {
    id: id ?? `${slug(`${input.product}-${input.level}-${input.name}`) || 'polizza'}-${randomUUID().slice(0, 6)}`,
    product: input.product.trim(),
    level: input.level.trim(),
    name: input.name.trim(),
    insurer: input.policy.insurer,
    uploadedAt: new Date().toISOString(),
    coverages: input.policy.coverages.length,
    verified: input.checks.filter((c) => c.issues.length === 0).length,
    policy: input.policy,
    checks: input.checks,
    sourceText: input.sourceText,
  };
  mkdirSync(dir(), { recursive: true });
  writeFileSync(join(dir(), `${entry.id}.json`), JSON.stringify(entry));
  return entry;
}

export function deleteEntry(id: string): boolean {
  if (!ID.test(id)) return false;
  const file = join(dir(), `${id}.json`);
  if (!existsSync(file)) return false;
  rmSync(file);
  return true;
}
