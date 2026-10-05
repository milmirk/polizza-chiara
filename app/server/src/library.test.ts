import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Policy } from '../../shared/types';
import sample from '../../data/sample-policy.extracted.json';

const tmp = mkdtempSync(join(tmpdir(), 'polizza-lib-'));
process.env.DATA_DIR = tmp;
let lib: typeof import('./library');

beforeAll(async () => {
  lib = await import('./library');
});
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

const policy = sample as Policy;
const add = (product: string, level: string, name: string) =>
  lib.saveEntry({ product, level, name, policy, checks: [{ coverageId: 'x', quotesFound: true, numbersConsistent: true, issues: [] }] });

describe('libreria polizze', () => {
  it('salva, elenca per prodotto e livello, recupera ed elimina', () => {
    const premium = add('Salute', 'Premium', 'Salute Top');
    add('Salute', 'Base', 'Salute Easy');
    add('Auto', 'Plus', 'RC Auto Plus');
    add('Salute', 'Plus', 'Salute Più');

    expect(lib.listEntries().map((e) => `${e.product}/${e.level}`)).toEqual(['Auto/Plus', 'Salute/Base', 'Salute/Plus', 'Salute/Premium']);
    expect(lib.listEntries()[0]).not.toHaveProperty('policy');

    const full = lib.getEntry(premium.id)!;
    expect(full).toMatchObject({ product: 'Salute', level: 'Premium', coverages: policy.coverages.length, verified: 1 });
    expect(full.policy.title).toBe(policy.title);

    expect(lib.deleteEntry(premium.id)).toBe(true);
    expect(lib.getEntry(premium.id)).toBeUndefined();
  });

  it('rifiuta id non validi', () => {
    expect(lib.getEntry('../../etc/passwd')).toBeUndefined();
    expect(lib.deleteEntry('..\\x')).toBe(false);
  });

  it('id leggibile, senza accenti né spazi', () => {
    expect(add('Casa & Famiglia', 'Più', 'Polizza Già')).toMatchObject({ id: expect.stringMatching(/^casa-famiglia-piu-polizza-gia-[a-f0-9]{6}$/) });
  });
});
