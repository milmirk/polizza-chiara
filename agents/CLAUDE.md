# Polizza Chiara – istruzioni per Claude Code

Contesto: hackathon Accenture, Tema 02 (Inclusione Finanziaria). Utente target: Rosa, 66 anni, bassa alfabetizzazione finanziaria, deve capire la sua polizza sanitaria.

## Regole non negoziabili
- Mai consigli finanziari o medici, né nei prompt né nei testi della UI.
- I calcoli degli importi stanno solo in `app/shared/calculator.ts`, mai nell'LLM.
- Ogni testo semplificato deve essere affiancato dalla citazione originale (articolo + pagina).
- Prima di toccare i testi "plain" applica lo skill `skills/semplificazione-fedele`.

## Codice
- Contratto dati: `app/shared/types.ts`. Se cambia, aggiorna `app/data/sample-policy.extracted.json` e lo schema Zod in `app/server/src/schemas.ts`.
- Prompt degli agenti: `agents/prompts/*.md` (letti a runtime dal server).
- Test: `cd app && npm test`. Typecheck: `npm run typecheck`.
- UI: font grande (19px base), alto contrasto, un'azione per schermata, testi in seconda persona.
