# Polizza Chiara

**Hagenthon · Tema 02 – Inclusione Finanziaria**

Uno strumento che aiuta una persona con bassa alfabetizzazione finanziaria a **capire la propria polizza sanitaria**: cosa copre, quanto resta da pagare di tasca propria e con quali regole. È educazione, non consulenza: lo strumento non dice mai cosa conviene scegliere.

## Persona
**Rosa, 66 anni**, pensionata, licenza media. Deve fare una risonanza magnetica (circa 250 €) e forse un day hospital. Ha una polizza salute integrativa, ma davanti alle condizioni di assicurazione (franchigia, scoperto, carenza, forma diretta/indiretta) si blocca e rinuncia a capire quanto pagherà.

## Struttura del repository
```
app/            soluzione sviluppata (client React + server Express + logica condivisa)
agents/         struttura agentica: prompt degli agenti, workflow, skills e comandi usati
presentation/   presentazione HTML (brand Accenture)
README.md
```

## Come funziona
1. **Agente Estrattore** (Claude, structured output): legge la polizza e produce dati strutturati con **citazione testuale e pagina** per ogni voce.
2. **Verificatore deterministico** (`app/shared/verify.ts`): controlla che ogni citazione sia nel documento alla lettera e che le spiegazioni non contengano numeri inventati.
3. **Agente Spiegatore**: spiega una garanzia a due livelli o con un esempio; se il verificatore scarta la risposta, il ciclo la fa rigenerare.
4. **Simulatore "Quanto pago io?"** (`app/shared/calculator.ts`): un calcolo deterministico, non fatto dall'LLM, applica carenza, franchigia, scoperto e sottolimite passo per passo.
5. **Quiz Coach adattivo**: domande di calcolo generate dal motore e domande concettuali generate dall'agente; la difficoltà si adatta alle risposte e misura la comprensione prima e dopo.
6. **Guardiano**: blocca le richieste di consulenza finanziaria o medica, sia in ingresso sia in uscita.

Dettagli in [agents/README.md](agents/README.md).

## Presentazione
Apri [presentation/index.html](presentation/index.html) nel browser (funziona offline). Frecce o spazio per avanzare, **F** per lo schermo intero.

## Avvio
Prerequisiti: Node 22+.
```bash
cd app
npm install
cp .env.example .env   # inserire ANTHROPIC_API_KEY (opzionale: senza chiave parte la modalità fallback)
npm run dev            # client http://localhost:5173 · API http://localhost:3001
npm test               # test del calcolatore, del verificatore e del quiz
```
Per la lettura ad alta voce più naturale usare **Microsoft Edge**: l'app sceglie in automatico una voce femminile italiana "Natural" (Isabella o Elsa). In Chrome usa "Google italiano"; la voce si può cambiare dal menu "Voce" in alto.

Senza API key l'app usa la polizza già estratta (`app/data/sample-policy.extracted.json`) e un quiz statico: la demo funziona anche offline.
