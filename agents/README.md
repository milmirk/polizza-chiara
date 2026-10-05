# Struttura agentica di Polizza Chiara

Due livelli di agenti:
1. **Agenti a runtime**: i prompt in `prompts/` sono caricati dal server (`app/server/src/claude.ts`) e guidano Claude dentro l'app.
2. **Agenti di sviluppo**: abbiamo costruito l'app con Claude Code usando le istruzioni, gli skill e i comandi di questa cartella.

## Agenti a runtime

| Agente | Prompt | Endpoint | Output | Controllo |
|---|---|---|---|---|
| Estrattore | [prompts/extractor.md](prompts/extractor.md) | `POST /api/extract` | `Policy` JSON (structured output, schema Zod) | Verificatore: citazioni alla lettera + numeri |
| Semplificatore | [prompts/explainer.md](prompts/explainer.md) | `POST /api/explain` | Testo a livello `semplice` / `medio`, oppure esempio | Ciclo genera → verifica → correggi (massimo 2 tentativi), poi fallback deterministico |
| Quiz Coach | [prompts/quiz-coach.md](prompts/quiz-coach.md) | `POST /api/quiz` | Domande concettuali con difficoltà 1-3 | Validazione delle opzioni; le domande di calcolo le genera il motore |
| Guardiano | [prompts/guardian.md](prompts/guardian.md) | `POST /api/ask` | Risposta con citazioni oppure `outOfScope` | Filtro regex in ingresso e in uscita (`app/server/src/guardrail.ts`) |

Componenti deterministici (niente LLM, coperti da unit test):
- `app/shared/calculator.ts`: "Quanto pago io?" (carenza, franchigia, scoperto con minimo, sottolimite, forma diretta/indiretta)
- `app/shared/verify.ts`: citazioni presenti alla lettera nel documento; nessun numero inventato nelle spiegazioni
- `app/shared/quiz.ts`: domande di calcolo con risposta calcolata dal motore, adattamento della difficoltà

Il flusso completo è in [workflows/pipeline.md](workflows/pipeline.md).

## Principio di progetto: l'AI semplifica, il codice garantisce
- L'LLM **non fa mai i conti**: gli importi li calcola `calculator.ts`, che l'LLM al massimo racconta.
- Ogni frase semplificata sta accanto alla **citazione originale** con articolo e pagina.
- Ogni numero scritto dall'AI viene confrontato con le condizioni della garanzia: se non torna, la risposta viene scartata e rigenerata.
- Le domande di consulenza (finanziaria o medica) vengono intercettate prima di arrivare al modello.

## Agenti di sviluppo (Claude Code)
- [CLAUDE.md](CLAUDE.md): istruzioni di progetto per Claude Code
- [skills/semplificazione-fedele/SKILL.md](skills/semplificazione-fedele/SKILL.md): come riscrivere una clausola senza tradirla
- [commands/](commands/): comandi slash usati durante l'hackathon
- [workflows/sviluppo.md](workflows/sviluppo.md): come ci siamo divisi il lavoro tra persone e agenti, e dove è servita la revisione umana
