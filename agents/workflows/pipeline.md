# Workflow runtime

```
 PDF / testo polizza
        │
        ▼
 ┌───────────────────┐   structured output (Zod)
 │ Agente Estrattore │──────────────────────────► Policy JSON + citazioni
 └───────────────────┘                                 │
                                                       ▼
                                      ┌──────────────────────────────┐
                                      │ Verificatore (deterministico)│
                                      │ citazioni alla lettera,      │
                                      │ numeri coerenti              │
                                      └──────────────────────────────┘
                                         │ ok / da rivedere (badge UI)
            ┌────────────────────────────┼─────────────────────────────┐
            ▼                            ▼                             ▼
 ┌──────────────────┐        ┌─────────────────────┐        ┌───────────────────┐
 │ Semplificatore   │        │ Simulatore          │        │ Quiz Coach        │
 │ semplice / medio │        │ "Quanto pago io?"   │        │ adattivo 1→3      │
 │ riformula/esempio│◄───────│ (calculator.ts)     │───────►│ + domande calcolo │
 └──────────────────┘ numeri └─────────────────────┘ numeri └───────────────────┘
        │  verifica → se fallisce, rigenera con feedback (max 2) → fallback
        ▼
   Utente (Rosa) ◄──── Guardiano: blocca consulenza finanziaria / medica
```

## Prima del modello: cache e codice
Ogni richiesta a un agente passa da tre filtri, in quest'ordine; l'LLM si chiama solo se nessuno risponde:
1. **Guardrail in ingresso** (`guardrail.ts`): consulenza o domanda medica → risposta fissa, 0 token.
2. **Cache** (`cache.ts`): stessa richiesta già servita, o estrazione verificata a mano → 0 token.
3. **Contesto minimo** (`context.ts`): al modello arriva solo ciò che serve a quella risposta.

## Modalità fallback
Senza API key, o se il modello non risponde, ogni agente ha un'alternativa deterministica:
- Estrattore → `app/data/sample-policy.extracted.json` (estrazione revisionata a mano)
- Semplificatore → testi `plain` già verificati, oppure un esempio costruito dal calcolatore
- Quiz Coach → `app/data/sample-quiz.json` + domande di calcolo
- Guardiano → solo i filtri regex
