import type { Policy, SimulationInput, SimulationResult, SimulationStep } from './types';

const eur = (n: number) =>
  n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, useGrouping: 'always' } as Intl.NumberFormatOptions);

const round2 = (n: number) => Math.round(n * 100) / 100;

function daysBetween(fromIso: string, toIso: string): number {
  const ms = Date.parse(toIso) - Date.parse(fromIso);
  return Math.floor(ms / 86_400_000);
}

export function simulate(policy: Policy, input: SimulationInput): SimulationResult {
  const { cost } = input;
  const cov = policy.coverages.find((c) => c.id === input.coverageId);
  const steps: SimulationStep[] = [
    { label: 'Costo della prestazione', detail: `La fattura è di ${eur(cost)}.`, youPay: cost, insurerPays: 0 },
  ];
  const notCovered = (reason: string, source = cov?.source[0]): SimulationResult => {
    steps.push({ label: 'Non coperto', detail: reason, youPay: cost, insurerPays: 0, source });
    return { covered: false, reason, youPay: cost, insurerPays: 0, steps };
  };

  if (!cov) return notCovered('Questa prestazione non è presente nella polizza.');
  if (!cov.covered) return notCovered(`"${cov.name}" non è coperta dalla polizza.`);

  const elapsed = daysBetween(policy.startDate, input.eventDate);
  if (elapsed < cov.waitingDays) {
    return notCovered(
      `Periodo di carenza: questa garanzia vale solo dopo ${cov.waitingDays} giorni dall'inizio della polizza. ` +
        `Ne sono passati ${Math.max(elapsed, 0)}.`,
    );
  }

  const terms = cov[input.regime];
  if (!terms) {
    return notCovered(
      input.regime === 'diretta'
        ? 'Questa garanzia non prevede la forma diretta (struttura convenzionata).'
        : 'Questa garanzia non prevede il rimborso (forma indiretta).',
    );
  }

  let youPay = 0;
  if (terms.deductible > 0) {
    youPay += Math.min(terms.deductible, cost);
    steps.push({
      label: 'Franchigia',
      detail: `Una cifra fissa di ${eur(terms.deductible)} resta sempre a tuo carico.`,
      youPay: round2(youPay),
      insurerPays: round2(cost - youPay),
      source: cov.source[0],
    });
  }
  if (terms.copayPercent > 0) {
    const pct = round2((cost * terms.copayPercent) / 100);
    const share = Math.max(pct, terms.copayMin);
    youPay += share;
    const minApplied = share > pct;
    steps.push({
      label: 'Scoperto',
      detail:
        `Il ${terms.copayPercent}% della fattura è a tuo carico: ${eur(pct)}.` +
        (terms.copayMin > 0
          ? minApplied
            ? ` Però il minimo è ${eur(terms.copayMin)}, quindi paghi ${eur(terms.copayMin)}.`
            : ` È sopra il minimo di ${eur(terms.copayMin)}, quindi resta ${eur(pct)}.`
          : ''),
      youPay: round2(Math.min(youPay, cost)),
      insurerPays: round2(Math.max(cost - youPay, 0)),
      source: cov.source[0],
    });
  }
  youPay = Math.min(youPay, cost);
  let insurerPays = cost - youPay;

  if (cov.annualLimit !== null) {
    const remaining = Math.max(cov.annualLimit - (input.alreadyReimbursedThisYear ?? 0), 0);
    if (insurerPays > remaining) {
      const extra = insurerPays - remaining;
      insurerPays = remaining;
      youPay += extra;
      steps.push({
        label: 'Limite annuo superato',
        detail:
          `Per questa garanzia la compagnia paga al massimo ${eur(cov.annualLimit)} all'anno. ` +
          `Restavano ${eur(remaining)}: la parte in più (${eur(extra)}) è a tuo carico.`,
        youPay: round2(youPay),
        insurerPays: round2(insurerPays),
        source: cov.source[0],
      });
    }
  }

  if (input.regime === 'indiretta' && insurerPays > 0) {
    steps.push({
      label: 'Come funziona il rimborso',
      detail: `Prima paghi tu tutta la fattura (${eur(cost)}), poi la compagnia ti rimborsa ${eur(round2(insurerPays))}.`,
      youPay: round2(youPay),
      insurerPays: round2(insurerPays),
    });
  }

  return { covered: true, youPay: round2(youPay), insurerPays: round2(insurerPays), steps };
}
