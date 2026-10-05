import { describe, expect, it } from 'vitest';
import { simulate } from './calculator';
import type { Policy } from './types';
import sample from '../data/sample-policy.extracted.json';

const policy = sample as Policy;
const after = '2026-10-10';

describe('simulate', () => {
  it('RM 250 € in convenzione: franchigia fissa 40 €', () => {
    const r = simulate(policy, { coverageId: 'alta_diagnostica', cost: 250, regime: 'diretta', eventDate: after });
    expect(r).toMatchObject({ covered: true, youPay: 40, insurerPays: 210 });
  });

  it('RM 250 € fuori rete: scoperto 25% sotto il minimo, si applica il minimo 80 €', () => {
    const r = simulate(policy, { coverageId: 'alta_diagnostica', cost: 250, regime: 'indiretta', eventDate: after });
    expect(r).toMatchObject({ youPay: 80, insurerPays: 170 });
  });

  it('RM 600 € fuori rete: scoperto 25% sopra il minimo', () => {
    const r = simulate(policy, { coverageId: 'alta_diagnostica', cost: 600, regime: 'indiretta', eventDate: after });
    expect(r).toMatchObject({ youPay: 150, insurerPays: 450 });
  });

  it('day hospital 4.000 €: diretta gratis, indiretta minimo 1.000 €', () => {
    const d = simulate(policy, { coverageId: 'ricovero', cost: 4000, regime: 'diretta', eventDate: after });
    const i = simulate(policy, { coverageId: 'ricovero', cost: 4000, regime: 'indiretta', eventDate: after });
    expect(d).toMatchObject({ youPay: 0, insurerPays: 4000 });
    expect(i).toMatchObject({ youPay: 1000, insurerPays: 3000 });
  });

  it('carenza attiva: prestazione non coperta nei primi 30 giorni', () => {
    const r = simulate(policy, { coverageId: 'alta_diagnostica', cost: 250, regime: 'diretta', eventDate: '2026-09-15' });
    expect(r).toMatchObject({ covered: false, youPay: 250, insurerPays: 0 });
    expect(r.reason).toMatch(/carenza/i);
  });

  it('sottolimite superato: la parte eccedente resta all\'assicurato', () => {
    const r = simulate(policy, {
      coverageId: 'visite_specialistiche', cost: 200, regime: 'diretta', eventDate: after, alreadyReimbursedThisYear: 1400,
    });
    expect(r).toMatchObject({ youPay: 100, insurerPays: 100 });
  });

  it('forma indiretta non prevista', () => {
    const r = simulate(policy, { coverageId: 'fisioterapia', cost: 300, regime: 'indiretta', eventDate: after });
    expect(r).toMatchObject({ covered: false, youPay: 300 });
  });

  it('garanzia esclusa', () => {
    const r = simulate(policy, { coverageId: 'odontoiatria', cost: 120, regime: 'diretta', eventDate: after });
    expect(r).toMatchObject({ covered: false, youPay: 120, insurerPays: 0 });
  });

  it('franchigia superiore al costo: paghi solo il costo', () => {
    const r = simulate(policy, { coverageId: 'visite_specialistiche', cost: 20, regime: 'diretta', eventDate: after });
    expect(r).toMatchObject({ youPay: 20, insurerPays: 0 });
  });
});
