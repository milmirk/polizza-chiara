# Workflow di sviluppo

Team da 2 persone con Claude Code, 3 ore. Il contratto condiviso (`app/shared/types.ts` + `app/data/sample-policy.extracted.json`) è stato fissato per primo: da lì interfaccia, server e logica deterministica sono andati avanti in parallelo.

| Fase | Come | Output |
|---|---|---|
| 1. Piano | Claude Code in plan mode; tema, persona e stack scelti dal team | piano approvato, persona Rosa |
| 2. Nucleo deterministico | test scritti con casi calcolati a mano, poi il codice | `calculator.ts`, `verify.ts`, `quiz.ts` + test |
| 3. Agenti | prompt in `agents/prompts/`, structured output con schema Zod | server con Estrattore, Semplificatore, Quiz Coach, Guardiano |
| 4. Interfaccia | componenti generati e provati nel browser | percorso guidato, simulatore, quiz, domande |
| 5. Revisione del team | prova dell'app e richieste di modifica | navigazione libera, voce femminile naturale, quiz con conferma, nome "Semplificatore" |
| 6. Presentazione | slide HTML in brand Accenture | `presentation/index.html` |
| 7. Efficienza e qualità | misura del contesto inviato, cache, CI | −86% / −53% / −32% di input, 33 test, GitHub Actions |

## AI vs revisione umana
| Area | Contributo AI | Revisione umana |
|---|---|---|
| Polizza di esempio | bozza delle clausole in stile "condizioni di assicurazione" | verificata la coerenza di importi, carenze ed esclusioni |
| Estrazione | l'Estrattore produce JSON e spiegazioni | JSON di riferimento controllato riga per riga; il verificatore ha trovato citazioni che univano due righe del documento, poi corrette |
| Calcolatore | codice generato con Claude Code | casi di test calcolati a mano (es. RM 250 € fuori rete: 25% = 62,50 €, sotto il minimo di 80 € → paghi 80 €) |
| Spiegazioni semplici | generate dall'agente | lette pensando a Rosa; il vincolo "nessun numero nuovo" è applicato dal codice |
| Guardrail | prompt e filtri proposti dall'AI | casi vietati decisi dal team in base alle regole del tema |
| Interfaccia | componenti generati | provata dal team: tolta la numerazione degli step, resa la voce meno robotica, aggiunta la conferma nel quiz |
| Token | misure e ottimizzazioni proposte dall'AI | priorità decisa dal team: cache e contesto minimo prima di tutto, budget fissati nei test |
