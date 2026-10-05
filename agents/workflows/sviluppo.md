# Workflow di sviluppo

Team da 2 persone, 3 ore. Il contratto condiviso (`app/shared/types.ts` + `app/data/sample-policy.extracted.json`) è stato fissato per primo: così frontend e backend hanno lavorato in parallelo, il frontend su dati mock.

| Fase | Persona + agente | Output |
|---|---|---|
| 0:00-0:20 | Mirko + Claude Code (plan mode) | Piano, persona, schema dati, polizza di esempio |
| 0:20-1:20 | Mirko + Claude Code | Calcolatore + test, verificatore, server e prompt |
| 0:20-2:00 | Collega + Claude Code | UI: wizard, schede garanzie, simulatore, quiz |
| 2:00-2:30 | Entrambi | Integrazione end-to-end |
| 2:30-3:00 | Entrambi | Presentazione, prova della demo |

## AI vs revisione umana
| Area | Contributo AI | Revisione umana |
|---|---|---|
| Polizza di esempio | Bozza delle clausole in stile "condizioni di assicurazione" | Verificata la coerenza di importi, carenze ed esclusioni |
| Estrazione | L'Estrattore produce JSON e spiegazioni | JSON di fallback controllato riga per riga; il verificatore ha trovato citazioni che univano due righe del documento, poi corrette |
| Calcolatore | Codice generato con Claude Code | Casi di test calcolati a mano (es. RM 250 € fuori rete: 25% = 62,50 €, sotto il minimo di 80 € → paghi 80 €) |
| Spiegazioni semplici | Generate dall'agente | Lette pensando a Rosa; il vincolo "nessun numero nuovo" è applicato dal codice |
| Guardrail | Prompt + regex proposti dall'AI | Casi vietati decisi dal team in base alle regole dell'hackathon |
