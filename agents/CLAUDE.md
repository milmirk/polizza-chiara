# Polizza Chiara – istruzioni per Claude Code

Contesto: hackathon Accenture, Tema 02 (Inclusione Finanziaria). Utente target: Rosa, 66 anni, bassa alfabetizzazione finanziaria, deve capire la sua polizza sanitaria.

## Regole non negoziabili
- Mai consigli finanziari o medici, né nei prompt né nei testi della UI.
- I calcoli degli importi stanno solo in `app/shared/calculator.ts`, mai nell'LLM.
- Ogni testo semplificato deve essere affiancato dalla citazione originale (articolo + pagina).
- Prima di toccare i testi "plain" applica lo skill `skills/semplificazione-fedele`.

## Token
- Se una cosa si può calcolare o verificare in codice, non va chiesta all'LLM.
- Ogni chiamata passa da `structured()` / `text()` in `app/server/src/claude.ts`: cache e contatore sono automatici. Niente chiamate dirette all'SDK.
- Il contesto per gli agenti si costruisce in `app/server/src/context.ts`: solo i campi necessari, JSON senza indentazione.
- Se aggiungi contesto, fai girare `npm run tokens`: i test falliscono se un agente supera il budget.

## Codice
- Contratto dati: `app/shared/types.ts`. Se cambia, aggiorna `app/data/sample-policy.extracted.json` e lo schema Zod in `app/server/src/schemas.ts`.
- Prompt degli agenti: `agents/prompts/*.md` (letti a runtime dal server).
- Test: `cd app && npm test`. Typecheck: `npm run typecheck`. Tutto insieme: `npm run check`.
- UI: font grande (19px base), alto contrasto, un'azione per schermata, testi in seconda persona.
