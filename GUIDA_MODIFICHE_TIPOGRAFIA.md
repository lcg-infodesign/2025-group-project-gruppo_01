# Guida alle Modifiche Tipografiche - Sezione Destra Dettaglio

## Modifiche Effettuate

Ho uniformato la gerarchia tipografica della sezione destra della pagina di dettaglio come richiesto:

### 1. Grafico AFFLUENZA (in alto)
- ✅ **Rimosso**: Etichette "0%" e "100%" ai lati del semicerchio
- ✅ **Modificato**: Percentuale centrale da 45pt a **32pt Bold**

### 2. Grafico UOMINI/DONNE (al centro)
- ✅ **Modificato**: Percentuali da 28pt a **32pt Bold**
- ℹ️ Le etichette "UOMINI" e "DONNE" rimangono invariate a 16pt

### 3. Grafico SI/NO (in basso)
- ✅ **Allineato**: Le percentuali sono ora allineate alle percentuali UOMINI/DONNE
- ✅ **Confermato**: Dimensione già corretta a **32pt Bold**

---

## Dove Modificare Autonomamente Questi Parametri

Tutti i parametri si trovano nel file:
```
sketch_dettaglio.js
```

### 📍 GRAFICO AFFLUENZA

**Posizione**: Linee 4615-4633 circa

```javascript
// Percentuale Grande al centro
push();
noStroke();
fill(cBlue);
if (typeof stixFont !== 'undefined') textFont(stixFont);
textSize(32);        // ← DIMENSIONE PERCENTUALE CENTRALE
textStyle(BOLD);     // ← STILE (BOLD/NORMAL)
textAlign(CENTER, CENTER);
text(displayAffluenza.toFixed(1) + "%", centerX, centerY);
pop();

// Etichette 0% e 100% rimosse
// Se vuoi riattivarle, cerca "Etichette 0% e 100% rimosse" e ripristina il codice commentato
```

**Parametri modificabili**:
- `textSize(32)` → Dimensione percentuale centrale (es. 28, 32, 36, 40)
- `textStyle(BOLD)` → Stile testo (BOLD, NORMAL, ITALIC)

---

### 📍 GRAFICO UOMINI/DONNE

**Posizione**: Linee 5065-5077 circa

```javascript
// Etichette Percentuali
push();
textSize(32);        // ← DIMENSIONE PERCENTUALI
textStyle(BOLD);     // ← STILE (BOLD/NORMAL)
textAlign(CENTER, TOP);

// Maschi (Sinistra)
fill(cMale);
text(`${pctM.toFixed(1)}%`, chartX - radius / 1.5, centerY + 25);

// Femmine (Destra)
fill(cFemale);
text(`${pctF.toFixed(1)}%`, chartX + radius / 1.5, centerY + 25);
```

**Parametri modificabili**:
- `textSize(32)` → Dimensione percentuali (es. 28, 32, 36)
- `textStyle(BOLD)` → Stile testo
- `centerY + 25` → Posizione verticale delle percentuali

**Etichette "UOMINI" e "DONNE"** (linee 5079-5085):
```javascript
textSize(16);        // ← DIMENSIONE ETICHETTE
fill(cMale);
text("UOMINI", chartX - radius / 1.5, centerY + 5);
fill(cFemale);
text("DONNE", chartX + radius / 1.5, centerY + 5);
```

---

### 📍 GRAFICO SI/NO

**Posizione**: Linee 4886-4907 circa

```javascript
// Gruppo SI
const siGroupRefX = leftBarX - barDist;
textAlign(CENTER, BOTTOM);
fill(THEME_YELLOW[0], THEME_YELLOW[1], THEME_YELLOW[2]);
textSize(24);        // ← DIMENSIONE ETICHETTA "SI"
text('SI', siGroupRefX, centerY - 2);
textAlign(CENTER, TOP);
textSize(32);        // ← DIMENSIONE PERCENTUALE SI
text(`${siPercent.toFixed(1)}%`, siGroupRefX, centerY + 2);

// Gruppo NO
const noGroupRefX = rightBarX + barDist;
textAlign(CENTER, BOTTOM);
fill(THEME_BLUE[0], THEME_BLUE[1], THEME_BLUE[2]);
textSize(24);        // ← DIMENSIONE ETICHETTA "NO"
text('NO', noGroupRefX, centerY - 2);
textAlign(CENTER, TOP);
textSize(32);        // ← DIMENSIONE PERCENTUALE NO
text(`${noPercent.toFixed(1)}%`, noGroupRefX, centerY + 2);
```

**Parametri modificabili**:
- `textSize(24)` → Dimensione etichette "SI" e "NO"
- `textSize(32)` → Dimensione percentuali
- `centerY - 2` e `centerY + 2` → Posizione verticale delle etichette
- `barDist = 105` (linea 4881) → Distanza orizzontale delle percentuali dalle barre

---

## 🎨 Riepilogo Dimensioni Attuali

| Elemento | Dimensione | Stile |
|----------|-----------|-------|
| Affluenza - Percentuale centrale | **32pt** | **Bold** |
| Affluenza - 0% e 100% | ~~Rimossi~~ | - |
| Uomini/Donne - Percentuali | **32pt** | **Bold** |
| Uomini/Donne - Etichette | 16pt | Normal |
| SI/NO - Percentuali | **32pt** | **Bold** |
| SI/NO - Etichette | 24pt | Bold |

---

## 💡 Suggerimenti per Modifiche Future

1. **Uniformità**: Tutte le percentuali principali sono ora a 32pt Bold per creare una gerarchia visiva coerente
2. **Allineamento**: Le percentuali SI/NO sono allineate verticalmente alle percentuali UOMINI/DONNE
3. **Pulizia visiva**: La rimozione di 0% e 100% riduce il rumore visivo e focalizza l'attenzione sulla percentuale centrale

Se vuoi modificare ulteriormente:
- Cerca nel file `sketch_dettaglio.js` le funzioni:
  - `drawAffluenzaChart()` (linea ~4494)
  - `drawPieChart()` (linea ~4707)
  - `drawGenderChart()` (linea ~4917)
