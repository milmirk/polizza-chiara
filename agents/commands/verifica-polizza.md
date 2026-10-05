---
description: Verifica un'estrazione di polizza (citazioni e numeri) ed elenca cosa rivedere
argument-hint: [percorso del JSON estratto] [percorso del testo sorgente]
---
Leggi il JSON della polizza in $1 e il documento sorgente in $2.
1. Esegui `npm test` in `app/` e riporta l'esito.
2. Per ogni garanzia, controlla con `verifyPolicy` (app/shared/verify.ts) che le citazioni siano nel sorgente alla lettera e che i testi `plain` non contengano numeri inventati.
3. Controlla a mano che `diretta`/`indiretta` rispecchino la clausola (franchigia vs scoperto, minimo).
Riporta una tabella: garanzia, esito, problema, correzione proposta. Non modificare i file senza conferma.
