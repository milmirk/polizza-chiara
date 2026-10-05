export type Level = 'semplice' | 'medio' | 'originale';
export type Regime = 'diretta' | 'indiretta';

export interface SourceRef {
  quote: string;
  page: number | null;
  article?: string;
}

export interface RegimeTerms {
  deductible: number;
  copayPercent: number;
  copayMin: number;
}

export interface Coverage {
  id: string;
  name: string;
  examples: string[];
  covered: boolean;
  annualLimit: number | null;
  waitingDays: number;
  diretta: RegimeTerms | null;
  indiretta: RegimeTerms | null;
  source: SourceRef[];
  plain?: { semplice: string; medio: string };
}

export interface Exclusion {
  text: string;
  plain?: string;
  source: SourceRef;
}

export interface GlossaryEntry {
  term: string;
  definition: string;
  source?: SourceRef;
}

export interface Policy {
  title: string;
  insurer: string;
  startDate: string;
  overallAnnualLimit: number | null;
  preexistingExcluded: boolean;
  coverages: Coverage[];
  exclusions: Exclusion[];
  glossary: GlossaryEntry[];
}

export interface SimulationInput {
  coverageId: string;
  cost: number;
  regime: Regime;
  eventDate: string;
  alreadyReimbursedThisYear?: number;
}

export interface SimulationStep {
  label: string;
  detail: string;
  youPay: number;
  insurerPays: number;
  source?: SourceRef;
}

export interface SimulationResult {
  covered: boolean;
  reason?: string;
  youPay: number;
  insurerPays: number;
  steps: SimulationStep[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: 1 | 2 | 3;
  source?: SourceRef;
}
