import { z } from 'zod';

const SourceRef = z.object({
  quote: z.string().describe('Testo copiato alla lettera dal documento'),
  page: z.number().int().nullable(),
  article: z.string(),
});

const RegimeTerms = z.object({
  deductible: z.number().describe('Franchigia fissa in euro, 0 se assente'),
  copayPercent: z.number().describe('Scoperto in percentuale, 0 se assente'),
  copayMin: z.number().describe('Minimo non indennizzabile dello scoperto in euro, 0 se assente'),
});

export const PolicySchema = z.object({
  title: z.string(),
  insurer: z.string(),
  startDate: z.string().describe('Data di decorrenza in formato YYYY-MM-DD'),
  overallAnnualLimit: z.number().nullable(),
  preexistingExcluded: z.boolean(),
  coverages: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      examples: z.array(z.string()).describe('Prestazioni tipiche, in parole comuni'),
      covered: z.boolean(),
      annualLimit: z.number().nullable(),
      waitingDays: z.number().int(),
      diretta: RegimeTerms.nullable(),
      indiretta: RegimeTerms.nullable(),
      source: z.array(SourceRef),
      plain: z.object({ semplice: z.string(), medio: z.string() }),
    }),
  ),
  exclusions: z.array(z.object({ text: z.string(), plain: z.string(), source: SourceRef })),
  glossary: z.array(z.object({ term: z.string(), definition: z.string(), source: SourceRef })),
});

export const QuizSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()),
      correctIndex: z.number().int(),
      explanation: z.string(),
      difficulty: z.number().int().describe('1, 2 o 3'),
      source: SourceRef,
    }),
  ),
});

export const AskSchema = z.object({
  outOfScope: z.boolean(),
  answer: z.string(),
  sources: z.array(SourceRef),
});
