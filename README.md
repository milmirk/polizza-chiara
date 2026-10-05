# Polizza Chiara&gt;

[![CI](https://github.com/milmirk/contest_unipol/actions/workflows/ci.yml/badge.svg)](https://github.com/milmirk/contest_unipol/actions/workflows/ci.yml)

**Hagenthon · Tema 02 – Inclusione Finanziaria**

Aiuta una persona con bassa alfabetizzazione finanziaria a **capire la propria polizza sanitaria**: cosa copre, quanto resta da pagare e con quali regole. È educazione, non consulenza: non dice mai cosa conviene scegliere.

**Persona:** Rosa, 66 anni, pensionata, licenza media. Deve fare una risonanza (250 €) e forse un day hospital. Davanti alle condizioni di assicurazione si blocca: non sa se è coperta né quanto pagherà.

## Struttura del repository
```
app/                     soluzione sviluppata
├─ client/               React + Vite + Tailwind: percorso guidato, voce, testo grande
├─ server/               Express + Claude: agenti, cache, contatore token
│  └─ src/               claude.ts · context.ts · cache.ts · usage.ts · guardrail.ts · pdf.ts
├─ shared/               logica deterministica condivisa (calcolatore, verificatore, quiz) + test
└─ data/                 polizza di esempio, estrazione verificata a mano, quiz di riferimento
agents/                  struttura agentica
├─ prompts/              system prompt dei 4 agenti (letti a runtime dal server)
├─ skills/               semplificazione-fedele
├─ commands/             comandi Claude Code usati nello sviluppo
├─ workflows/            pipeline runtime e workflow di sviluppo
└─ CLAUDE.md             istruzioni di progetto per Claude Code
presentation/            presentazione HTML (brand Accenture) e deliverable del tema
.github/workflows/       CI: typecheck, test, build
```

## Come funziona
| Componente | Tipo | Ruolo |
|---|---|---|
| Estrattore | agente AI | polizza → dati strutturati (schema Zod), ogni voce con citazione e pagina |
| Verificatore | codice | citazioni presenti alla lettera nel documento, nessun numero inventato |
| Semplificatore | agente AI | spiega una garanzia (semplice / medio / esempio); se il verificatore la scarta, la rigenera |
| Calcolatore | codice | "Quanto pago io?": carenza, franchigia, scoperto con minimo, sottolimite |
| Quiz Coach | agente AI + codice | quiz adattivo; le domande di calcolo e le loro risposte le genera il codice |
| Guardiano | agente AI + codice | risponde solo dalla polizza; filtri che bloccano consulenza finanziaria e medica |

Dettagli in [agents/README.md](agents/README.md) e [agents/workflows/pipeline.md](agents/workflows/pipeline.md).

## Consumo di token
Principio: **l'LLM si usa solo dove serve il linguaggio**. Tutto ciò che si può calcolare o verificare lo fa il codice, a 0 token.

| Leva | Effetto |
|---|---|
| Calcoli, domande di calcolo del quiz, verifica, guardrail in ingresso | sempre in codice: 0 token |
| Cache content-addressed (agente + modello + prompt + contesto) | la stessa richiesta non costa mai due volte |
| Estrazione e quiz della polizza di esempio verificati a mano e pre-caricati | il percorso demo di Rosa costa 0 token |
| Contesto minimo: solo i passaggi pertinenti (ricerca con pesi IDF), JSON compatto | input del Guardiano −86%, Quiz −53%, Semplificatore −32% |
| PDF convertiti in testo con i marcatori di pagina | molti meno token delle pagine PDF e citazioni verificabili |
| `effort: low` e `max_tokens` per agente | ragionamento breve, nessuna risposta fuori controllo |
| Le risposte scartate dal verificatore non entrano in cache | nessun errore riutilizzato |

Le riduzioni sono stime sull'input (4 caratteri ≈ 1 token) rispetto alla prima versione, che mandava polizza e documento interi. Le misura `npm run tokens`, e i test falliscono se un agente supera il budget. Il consumo reale per agente si legge su `GET /api/usage` e nel footer dell'app.

## Qualità
- `npm test`: 33 test (calcolatore, verificatore, quiz, ricerca, guardrail, budget token)
- `npm run typecheck`: server, logica condivisa e client
- CI su ogni push: typecheck, test e build

## Avvio
Prerequisiti: Node 22+.
```bash
cd app
npm install
cp .env.example .env   # ANTHROPIC_API_KEY opzionale: senza chiave la demo usa dati verificati
npm run dev            # client http://localhost:5173 · API http://localhost:3001
npm run check          # typecheck + test
```
Per la lettura ad alta voce più naturale usare **Microsoft Edge**: l'app sceglie una voce femminile italiana "Natural". La voce si cambia dal menu "Voce" in alto.

## Deliverable e presentazione
- Presentazione: [presentation/index.html](presentation/index.html). Si apre offline; frecce per avanzare, **F** per lo schermo intero.
- Deliverable del tema (User Difficulty Statement, Before/After, Risk & Clarity Note): [presentation/deliverables.md](presentation/deliverables.md)
- Uso dell'AI e revisione umana: [agents/workflows/sviluppo.md](agents/workflows/sviluppo.md)
