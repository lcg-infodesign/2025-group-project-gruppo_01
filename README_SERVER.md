# 🚀 Come visualizzare il sito

Per visualizzare correttamente tutte le pagine HTML e gli sketch p5.js, è necessario avviare un server web locale.

## Metodo 1: Server Python (Consigliato)

### Requisiti
- Python 3 (già installato su macOS)

### Istruzioni

1. **Apri il Terminale** e naviga nella cartella del progetto:
   ```bash
   cd "/Users/chiara_moretti/Library/Mobile Documents/com~apple~CloudDocs/POLIMI/A.A. 25-26/Info Design/SITO COMPLETO 15:12"
   ```

2. **Avvia il server**:
   ```bash
   python3 server.py
   ```
   
   Oppure, se hai Python 3 installato come `python`:
   ```bash
   python server.py
   ```

3. **Apri il browser** e vai a:
   - http://localhost:8000/home.html
   - http://localhost:8000/overview.html
   - http://localhost:8000/dettaglio.html
   - http://localhost:8000/informazioni.html

4. **Per fermare il server**, premi `CTRL+C` nel terminale

---

## Metodo 2: Server HTTP Python semplice

Se il file `server.py` non funziona, puoi usare il server HTTP integrato di Python:

```bash
cd "/Users/chiara_moretti/Library/Mobile Documents/com~apple~CloudDocs/POLIMI/A.A. 25-26/Info Design/SITO COMPLETO 15:12"
python3 -m http.server 8000
```

Poi apri http://localhost:8000/home.html nel browser.

---

## Metodo 3: Estensioni del browser

Puoi anche usare estensioni del browser come:
- **Live Server** per VS Code
- **Web Server for Chrome** (estensione Chrome)
- **Local Web Server** (estensione Firefox)

---

## ⚠️ Perché serve un server?

Le pagine usano **p5.js** che richiede un server web per:
- Caricare file CSV dai dataset
- Caricare immagini SVG
- Caricare font personalizzati
- Evitare errori CORS del browser

Senza un server, gli sketch p5.js non funzioneranno correttamente!

---

## 📁 Struttura del progetto

```
SITO COMPLETO 15:12/
├── home.html              # Pagina iniziale
├── overview.html          # Vista d'insieme con grafico
├── dettaglio.html         # Vista dettagliata con mappa
├── informazioni.html      # Informazioni sul progetto
├── sketch_home.js         # Sketch p5.js per home
├── sketch_overview.js     # Sketch p5.js per overview (inline)
├── sketch_dettaglio.js    # Sketch p5.js per dettaglio
├── sketch_informazioni.js # Sketch p5.js per informazioni
├── server.py              # Server HTTP Python
├── dataset/               # File CSV con i dati
├── libraries/             # Librerie p5.js
├── font/                  # Font STIX Two Text
└── img/                   # Immagini
```

---

## 🐛 Risoluzione problemi

### Porta già in uso
Se vedi l'errore "Address already in use", cambia la porta nel file `server.py`:
```python
PORT = 8001  # invece di 8000
```

### File non trovati
Assicurati di essere nella directory corretta quando avvii il server.

### Sketch non funzionano
- Controlla la console del browser (F12) per errori
- Verifica che tutti i file siano nella posizione corretta
- Assicurati che il server sia avviato prima di aprire le pagine

