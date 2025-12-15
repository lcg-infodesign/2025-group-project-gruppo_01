# Affluenza dei Referendum - Progetto Info Design

Visualizzazione interattiva dell'affluenza ai referendum italiani dal 1946 al 2025.

## 🚀 Come visualizzare su GitHub Pages

1. **Abilita GitHub Pages** nel repository:
   - Vai su Settings → Pages
   - Scegli il branch `main` (o `master`) come source
   - Salva

2. **Il sito sarà disponibile** a:
   - `https://TUO-USERNAME.github.io/NOME-REPO/`
   - Oppure `https://TUO-USERNAME.github.io/NOME-REPO/home.html`

## 📁 Struttura del progetto

```
├── index.html              # Redirect a home.html
├── home.html               # Pagina iniziale
├── overview.html           # Vista d'insieme con grafico
├── dettaglio.html          # Vista dettagliata con mappa
├── informazioni.html       # Informazioni sul progetto
├── sketch_dettaglio.js    # Sketch p5.js per dettaglio
├── sketch_informazioni.js  # Sketch p5.js per informazioni
├── .nojekyll               # File per GitHub Pages (evita Jekyll)
├── dataset/                # File CSV con i dati
├── libraries/              # Librerie p5.js
├── font/                   # Font STIX Two Text
├── img/                    # Immagini
└── style*.css              # Fogli di stile
```

## ⚠️ Note importanti

- Il file `.nojekyll` è necessario per GitHub Pages per evitare che Jekyll processi i file
- Il GeoJSON per la mappa viene caricato da un URL remoto se non trovato localmente
- Tutti i percorsi sono relativi e dovrebbero funzionare su GitHub Pages

## 🐛 Risoluzione problemi

### La pagina non si carica
- Verifica che GitHub Pages sia abilitato nelle impostazioni del repository
- Controlla che il file `index.html` sia nella root del repository
- Assicurati che tutti i file siano stati caricati correttamente

### Le immagini non si vedono
- Verifica che la cartella `img/` sia presente e contenga tutti i file
- Controlla la console del browser (F12) per errori 404

### Gli sketch p5.js non funzionano
- Controlla la console del browser (F12) per errori JavaScript
- Verifica che la cartella `libraries/` contenga i file p5.js
- Assicurati che i file CSV nella cartella `dataset/` siano presenti

## 📝 Pagine disponibili

- `/home.html` - Pagina iniziale con introduzione
- `/overview.html` - Vista d'insieme con grafico dell'affluenza
- `/dettaglio.html` - Vista dettagliata con mappa interattiva
- `/informazioni.html` - Informazioni sul progetto e il team

