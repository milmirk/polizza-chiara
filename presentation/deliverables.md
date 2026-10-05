# Deliverable · Tema 02 Inclusione Finanziaria

## 01 · User Difficulty Statement
**Chi:** Rosa, 66 anni, pensionata, licenza media, bassa alfabetizzazione finanziaria. Ha una polizza salute integrativa che non ha mai letto.

**Processo:** deve fare una risonanza magnetica (circa 250 €) e forse un day hospital, e vuole sapere se la polizza la copre e quanto pagherà.

**Dove si blocca:** davanti alle Condizioni di assicurazione (5 pagine, 11 articoli). Non sa:
- se la prestazione è coperta o esclusa, e se è ancora nel periodo di carenza;
- cosa cambia tra struttura convenzionata (forma diretta) e non convenzionata (forma indiretta);
- quanto le resta da pagare dopo franchigia, scoperto con minimo e sottolimite: quattro regole che si combinano per ogni spesa.

**Perché è rilevante:** senza capire, rinuncia alla prestazione oppure paga senza sapere perché. Oggi l'unica alternativa è chiamare l'agenzia.

## 02 · Before / After Simplicity Evidence
**Prima** (Art. 6, pagina 3):
> Forma indiretta: applicazione di uno scoperto del 25% con il minimo non indennizzabile di € 80,00 per ciascun accertamento.

**Dopo** (Polizza Chiara, livello semplice):
> In un centro non convenzionato paghi tu e poi ti rimborsano. Ti resta da pagare un quarto della spesa (25%). Comunque almeno 80 euro.

**Calcolo mostrato a Rosa** (codice deterministico, non LLM):

| Passaggio | Importo |
|---|---|
| Fattura della risonanza, struttura non convenzionata | 250,00 € |
| Scoperto del 25% | 62,50 € |
| Il minimo è 80 €, quindi si applica il minimo | 80,00 € |
| **Rosa paga 80 €, la compagnia le rimborsa 170 €** | |

Stessa prestazione in struttura convenzionata: franchigia fissa di 40 €, quindi Rosa paga 40 € e la compagnia 210 €. Entro i primi 30 giorni dalla decorrenza: non coperta (carenza).

**Comprensione misurata:** quiz adattivo prima e dopo il percorso. Nel percorso di prova della demo il punteggio passa da 1/4 a 4/4 e il livello raggiunto da intermedio ad avanzato. È una prova interna, non una sperimentazione con utenti.

## 03 · Risk & Clarity Note
**Cosa è stato semplificato**
- Il linguaggio: frasi di massimo 15 parole, seconda persona, un concetto per frase.
- I termini tecnici: un glossario cliccabile con la definizione originale accanto.
- Il percorso: un'azione per schermata, testo grande, lettura ad alta voce.

**Cosa non è stato alterato**
- Importi, percentuali e giorni: il verificatore (`app/shared/verify.ts`) scarta ogni testo dell'AI che contiene un numero assente dalle condizioni della garanzia. Il Semplificatore allora riscrive, oppure si usa un testo deterministico già verificato.
- Le citazioni: ogni voce porta la frase originale copiata alla lettera, con articolo e pagina. Il verificatore controlla che compaia davvero nel documento.
- I calcoli: li fa solo `app/shared/calculator.ts`, coperto da test con casi calcolati a mano.

**Come è stata evitata l'ambiguità**
- La versione semplice è sempre affiancata al testo originale.
- Condizioni limitanti come carenza, "solo dopo infortunio", "serve la prescrizione" ed esclusioni sono obbligatorie nei prompt e visibili nella scheda della garanzia.
- Ogni risposta libera cita i passaggi della polizza su cui si basa.

**Nessuna consulenza**
- Le domande di consulenza ("mi conviene cambiare polizza?") e quelle mediche ("devo fare la risonanza?") vengono bloccate prima di arrivare al modello, rimandando all'agenzia o al medico.
- Le risposte dell'AI passano anche da un filtro in uscita ("ti conviene", "ti consiglio").

**Limiti residui**
- La polizza di esempio è inventata; con documenti reali molto diversi l'estrazione va rivista.
- I filtri del guardrail sono basati su parole chiave: il system prompt è la seconda difesa.
- I PDF scansionati (senza testo) vengono letti dal modello ma le citazioni non si possono verificare alla lettera.
- Nessun test con utenti reali; la qualità della voce dipende dal browser.
