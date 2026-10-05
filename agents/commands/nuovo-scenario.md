---
description: Aggiunge uno scenario di calcolo al simulatore e al quiz, con test
argument-hint: [garanzia] [costo] [diretta|indiretta]
---
Aggiungi lo scenario "$1, $2 €, forma $3":
1. Calcola a mano il risultato atteso leggendo la clausola in app/data/sample-policy.md e mostra il calcolo.
2. Aggiungi un test in app/shared/calculator.test.ts con quel risultato.
3. Aggiungi lo scenario a SCENARIOS in app/shared/quiz.ts con una difficoltà coerente.
4. Esegui `npm test` in app/ e correggi finché è verde.
