---
name: semplificazione-fedele
description: Riscrive una clausola assicurativa o finanziaria in linguaggio semplice senza alterarne il significato. Usare quando si scrivono o si rivedono testi "plain" per Polizza Chiara.
---

# Semplificazione fedele

## Checklist
1. **Numeri**: ogni importo, percentuale e numero di giorni della versione semplice deve essere nella clausola originale. Niente arrotondamenti, niente cifre nuove.
2. **Condizioni**: mantieni tutte le condizioni che limitano la copertura ("solo dopo infortunio", "con prescrizione", "entro 90 giorni", carenza).
3. **Niente promesse**: non scrivere "sempre", "tutto", "gratis" se il testo non lo dice.
4. **Niente consigli**: mai "ti conviene", "è meglio", "scegli".
5. **Forma**: frasi di massimo 15 parole, seconda persona, una informazione per frase, parole comuni (franchigia → "una cifra fissa che paghi tu").
6. **Tracciabilità**: la versione semplice va mostrata accanto alla citazione originale con articolo e pagina.

## Verifica automatica
`app/shared/verify.ts` → `checkText(coverage, testo)` restituisce i numeri non giustificati. Eseguire `npm test` in `app/`.

## Esempio
Originale (Art. 6): "Forma indiretta: applicazione di uno scoperto del 25% con il minimo non indennizzabile di € 80,00 per ciascun accertamento."
Semplice: "In un centro non convenzionato paghi tu e poi ti rimborsano. Ti resta da pagare un quarto della spesa (25%). Comunque almeno 80 euro."
