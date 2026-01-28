let tableRows = null;
// Stato per l'animazione dei presidenti (zoom fluido)
let presidentAnimState = {
  rep: 1.0,   // Scala corrente Repubblica
  cons: 1.0   // Scala corrente Consiglio
};

let regionValues = {};
let geojsonData = null; // loaded GeoJSON FeatureCollection
// Current selected year (can be a number or string like '2016-1' or '2016-2')
// Leggi dall'URL se disponibile, altrimenti usa il default
let selectedYear = (typeof window !== 'undefined' && window.__INITIAL_YEAR__ !== undefined) 
  ? window.__INITIAL_YEAR__ 
  : 2025;

console.log('selectedYear inizializzato:', selectedYear, typeof selectedYear);

// Fallback dataset path (only used if the page is served via HTTP and you want the default loaded)
let dataFile = 'dataset/25-2025.csv';

// Available referendum years mapped to CSV files
// Note: 2016 has two separate datasets, labeled as 2016-1 and 2016-2
const REFERENDUM_YEARS = {
  1946: 'dataset/1-1946.csv',
  1974: 'dataset/2-1974.csv',
  1978: 'dataset/3-1978.csv',
  1981: 'dataset/4-1981.csv',
  1985: 'dataset/5-1985.csv',
  1987: 'dataset/6-1987.csv',
  1989: 'dataset/7-1989.csv',
  1990: 'dataset/8-1990.csv',
  1991: 'dataset/9-1991.csv',
  1993: 'dataset/10-1993.csv',
  1995: 'dataset/11-1995.csv',
  1997: 'dataset/12-1997.csv',
  1999: 'dataset/13-1999.csv',
  2000: 'dataset/14-2000.csv',
  2001: 'dataset/15-2001.csv',
  2003: 'dataset/16-2003.csv',
  2005: 'dataset/17-2005.csv',
  2006: 'dataset/18-2006.csv',
  2009: 'dataset/19-2009.csv',
  2011: 'dataset/20-2011.csv',
  '2016-1': 'dataset/21-2016.csv',
  '2016-2': 'dataset/22-2016.csv',
  2020: 'dataset/23-2020.csv',
  2022: 'dataset/24-2022.csv',
  2025: 'dataset/25-2025.csv'
};

// Helper function to get display name for year (handles 2016-1 and 2016-2)
function getYearDisplayName(yearKey) {
  const keyStr = String(yearKey);
  if (keyStr === '2016-1') return '2016(1)';
  if (keyStr === '2016-2') return '2016(2)';
  return keyStr;
}

// Helper function to get numeric year for sorting (2016-1 and 2016-2 both map to 2016)
function getYearNumeric(yearKey) {
  const keyStr = String(yearKey);
  if (keyStr === '2016-1' || keyStr === '2016-2') return 2016;
  return parseInt(keyStr) || 0;
}

// Aggiorna dataFile in base all'anno selezionato dall'URL (dopo che REFERENDUM_YEARS è definito)
// Prova sia come numero che come stringa per compatibilità
if (REFERENDUM_YEARS[selectedYear]) {
  dataFile = REFERENDUM_YEARS[selectedYear];
  console.log('dataFile impostato da selectedYear:', selectedYear, '->', dataFile);
} else if (REFERENDUM_YEARS[String(selectedYear)]) {
  dataFile = REFERENDUM_YEARS[String(selectedYear)];
  console.log('dataFile impostato da selectedYear (stringa):', String(selectedYear), '->', dataFile);
} else if (typeof selectedYear === 'string' && REFERENDUM_YEARS[parseInt(selectedYear)]) {
  dataFile = REFERENDUM_YEARS[parseInt(selectedYear)];
  console.log('dataFile impostato da selectedYear (numero):', parseInt(selectedYear), '->', dataFile);
} else {
  console.warn('Anno non trovato in REFERENDUM_YEARS:', selectedYear, 'tipo:', typeof selectedYear);
  console.log('Chiavi disponibili:', Object.keys(REFERENDUM_YEARS));
}

// Array of year keys sorted by numeric year, with 2016-1 before 2016-2
const REFERENDUM_YEARS_ARRAY = Object.keys(REFERENDUM_YEARS).sort((a, b) => {
  const numA = getYearNumeric(a);
  const numB = getYearNumeric(b);
  if (numA !== numB) return numA - numB;
  // If same year (2016), put -1 before -2
  if (a === '2016-1' && b === '2016-2') return -1;
  if (a === '2016-2' && b === '2016-1') return 1;
  return 0;
});
// Availability cache for each year: 'unknown'|'available'|'missing'
const yearAvailability = {};
// Quorum status per year: 'RAGGIUNTO' | 'NON_RICHIESTO' | 'NON_RAGGIUNTO'
// Valori di default presi da quorum.csv (verranno eventualmente sovrascritti da loadQuorumData)
let quorumStatusByYear = {
   '1946': 'NON_RICHIESTO',
        '1974': 'RAGGIUNTO',
        '1978': 'RAGGIUNTO',
        '1981': 'RAGGIUNTO',
        '1985': 'RAGGIUNTO',
        '1987': 'RAGGIUNTO',
        '1989': 'NON_RICHIESTO',
        '1990': 'NON_RAGGIUNTO',
        '1991': 'RAGGIUNTO',
        '1993': 'RAGGIUNTO',
        '1995': 'RAGGIUNTO',
        '1997': 'NON_RAGGIUNTO',
        '1999': 'NON_RAGGIUNTO',
        '2000': 'NON_RAGGIUNTO',
        '2001': 'NON_RICHIESTO',
        '2003': 'NON_RAGGIUNTO',
        '2005': 'NON_RAGGIUNTO',
        '2006': 'NON_RICHIESTO',
        '2009': 'NON_RAGGIUNTO',
        '2011': 'RAGGIUNTO',
        '2016-1': 'NON_RAGGIUNTO',
        '2016-2': 'NON_RICHIESTO',
        '2020': 'NON_RICHIESTO',
        '2022': 'NON_RAGGIUNTO',
        '2025': 'NON_RAGGIUNTO'
}; // { yearKey: status }
// Total votes for pie chart
let totalVotiSi = 0;
let totalVotiNo = 0;
// Votes per region for pie chart
let regionVotes = {}; // { regionName: { si: number, no: number } }
// Selected region for pie chart
let selectedRegion = null;
// Gender data for stick figure chart
let totalMaschi = 0;
let totalFemmine = 0;
let regionGender = {}; // { regionName: { maschi: number, femmine: number } }
let regionQuesitoGender = {}; // { regionName: { quesitoNum: { maschi: number, femmine: number } } }
let quesitoGender = {}; // { quesitoNum: { maschi: number, femmine: number } } - national totals per quesito
// Selected quesito for pie chart
let selectedQuesito = null; // null or number (1, 2, 3, 4, 5)
let hoveredQuesito = null; // null or number (1, 2, 3, 4, 5) - per effetto hover
let quesitiVotes = {}; // { quesitoNum: { si: number, no: number } }
let quesitiList = []; // Array of { numero: number, testo: string } - populated from CSV

// Regions list (used to iterate and map to positions)
const REGIONS = [
  'ABRUZZO','BASILICATA','CALABRIA','CAMPANIA','EMILIA-ROMAGNA',
  'FRIULI-VENEZIA GIULIA','LAZIO','LIGURIA','LOMBARDIA','MARCHE',
  'MOLISE','PIEMONTE','PUGLIA','SARDEGNA','SICILIA',
  'TOSCANA','TRENTINO-ALTO ADIGE','UMBRIA',"VAL D'AOSTA",'VENETO'
];




let valuesArray = [];

// Theme colors (RGB arrays) â€" used for consistent styling
// Blue requested by user: #1E52A6 -> (30,82,166)
const THEME_BLUE = [30, 82, 166];
const THEME_DARK = [22, 50, 100];
// Unico colore giallo/arancione richiesto: #FFB700 -> (255,183,0)
const THEME_YELLOW = [255, 183, 0];
const THEME_ORANGE = [255, 183, 0];
const THEME_BG = [245, 240, 220];

// Aggiorna l'opacità delle regioni SVG in base all'affluenza
function updateSvgRegionOpacityFromAffluenza() {
  const svg = document.getElementById('mappa-regioni');
  if (!svg) return;

  // Configurazione Opacità
  const MIN_AFFLUENZA_ABS = 0;
  const MAX_AFFLUENZA_ABS = 100;
  const MIN_OPACITY = 0.3;
  const OPACITY_RANGE = 0.7;

  // Normalizzazione valore
  function norm(v) {
      if (!isFinite(v)) return MIN_OPACITY;
      if (v <= MIN_AFFLUENZA_ABS) return MIN_OPACITY;
      if (v >= MAX_AFFLUENZA_ABS) return 1.0;
      return MIN_OPACITY + OPACITY_RANGE * ((v - MIN_AFFLUENZA_ABS) / (MAX_AFFLUENZA_ABS - MIN_AFFLUENZA_ABS));
  }

  // --- MAPPA DI CORREZIONE MANUALE (Il "Ponte" tra HTML e CSV) ---
      // --- MAPPA DI CORREZIONE MANUALE ---
      const ID_CORRECTIONS = {
        "TRENTINO": "TRENTINO-ALTO ADIGE",          
        "FRIULI_VENEZIA_GIULIA": "FRIULI-VENEZIA GIULIA",
        "EMILIA_ROMAGNA": "EMILIA-ROMAGNA",
        "VAL_D'AOSTA": "VALLE D'AOSTA", // <--- ECCO IL FIX (con l'apostrofo come in HTML)
        "VAL_D_AOSTA": "VALLE D'AOSTA"  // Lasciamo anche questo per sicurezza
    };


  const paths = svg.querySelectorAll('.regione');
  
  paths.forEach(path => {
      const id = path.id;
      if (!id) return;

      let val = regionValues[id];

      // 1. Controlla la Mappa di Correzione
      if (val === undefined && ID_CORRECTIONS[id]) {
          const correctedKey = ID_CORRECTIONS[id];
          val = regionValues[correctedKey] ?? regionValues[correctedKey.toUpperCase()];
      }

      // 2. Fallback generico (Spazi invece di underscore)
      if (val === undefined) {
          const spaceKey = id.replace(/_/g, ' ');
          val = regionValues[spaceKey] ?? regionValues[spaceKey.toUpperCase()];
      }
      
      // 3. Fallback trattini (Trattini invece di underscore)
      if (val === undefined) {
           const dashKey = id.replace(/_/g, '-');
           val = regionValues[dashKey] ?? regionValues[dashKey.toUpperCase()];
      }

      // 4. Fuzzy normalization fallback: match abbreviations/punctuation variants
      if (val === undefined) {
          const normalize = s => (s || '').toString().toUpperCase().replace(/[^A-Z0-9]/g, '');
          const targetNorm = normalize(id.replace(/_/g, ' '));
          for (const k of Object.keys(regionValues)) {
              if (!k) continue;
              const keyNorm = normalize(k);
              if (keyNorm === targetNorm || keyNorm.includes(targetNorm) || targetNorm.includes(keyNorm)) {
                  val = regionValues[k];
                  break;
              }
          }
      }

      // Applica Opacità
      const opacity = norm(val);
      path.style.opacity = String(opacity);
      
      // Debug
      // console.log(`Aggiornato ${id}: Valore ${val} -> Opacità ${opacity}`);
  });
  
  console.log("✅ updateSvgRegionOpacityFromAffluenza completato con CORREZIONI MANUALI.");
}



// ====== SELEZIONE REGIONE DA SVG ======
window.currentRegion = null;

// Funzione chiamata dall'HTML quando si clicca una regione (o si preme ESC)
window.onRegionSelected = function(regionId) {
    
  // --- 1. GESTIONE RESET (ESC o Click Fuori) ---
  if (!regionId) {
      selectedRegion = null;       // Resetta la variabile globale p5
      window.currentRegion = null; // Resetta eventuali altre variabili
      console.log("Reset grafico p5: Italia");
      
      // Resetta il nome della regione nel header
      const regionNameElement = document.getElementById('selected-region');
      if (regionNameElement) {
          regionNameElement.textContent = '';
      }
      
      redraw();                    // FORZA il ridisegno immediato del canvas
      return;
  }

  // --- 2. GESTIONE SELEZIONE REGIONE (Logica esistente) ---
  // Partiamo dall'id dell'SVG (es. VAL_D'AOSTA)
  let name = regionId;

  // A. Pulizia base: Underscore -> spazio
  name = name.replace(/_/g, ' ');

  // B. Mappa correzioni nomi (Allineata con ID_CORRECTIONS)
  if (name === "EMILIA ROMAGNA") name = "EMILIA-ROMAGNA";
  if (name.includes("TRENTINO")) name = "TRENTINO-ALTO ADIGE";
  if (name.includes("FRIULI")) name = "FRIULI-VENEZIA GIULIA";
  if (name.includes("VAL") && name.includes("AOSTA")) name = "VALLE D'AOSTA";

  const upper = name.toUpperCase();
  
  // C. Normalizzazione finale
  let normalized = upper;
  if (typeof CSVREGIONNAMEVARIANTS !== 'undefined' && CSVREGIONNAMEVARIANTS[upper]) {
      normalized = CSVREGIONNAMEVARIANTS[upper];
  }
  window.currentRegion = normalized;

  // D. Cerca la Feature GeoJSON corrispondente
  if (geojsonData && geojsonData.features) {
      let foundFeature = null;
      
      for (const feature of geojsonData.features) {
          const props = feature.properties;
          // Cerca in tutte le proprietà possibili
          const featureName = props.reg_name || props.denominazione_reg || props.denominazione || props.nome || "";
          
          // Normalizza nome feature
          let normFeat = featureName.toUpperCase().replace(/_/g, ' ');
          if (normFeat.includes("VAL") && normFeat.includes("AOSTA")) normFeat = "VALLE D'AOSTA";
          if (normFeat.includes("TRENTINO")) normFeat = "TRENTINO-ALTO ADIGE";
          if (normFeat.includes("FRIULI")) normFeat = "FRIULI-VENEZIA GIULIA";
          if (normFeat.includes("EMILIA")) normFeat = "EMILIA-ROMAGNA";

          if (normFeat === normalized) {
              foundFeature = feature;
              break;
          }
      }

      if (foundFeature) {
          selectedRegion = foundFeature;
          console.log("Feature GeoJSON trovata per:", normalized);
      } else {
          // Fallback: usa la stringa se il GeoJSON non è ancora pronto o non trova match
          selectedRegion = normalized;
          console.warn("Nessuna feature trovata, uso stringa:", normalized);
      }
  } else {
      // Fallback totale
      selectedRegion = normalized;
  }

  // E. Aggiorna il nome della regione nel header
  const regionNameElement = document.getElementById('selected-region');
  if (regionNameElement) {
      // Usa sempre il nome normalizzato (che è pulito e standardizzato)
      regionNameElement.textContent = normalized;
  }
  
  // F. Forza aggiornamento
  redraw();
};


// cache bounds for projection (computed once)
let geoBounds = null;
// Cache for projection and path generator
let geoProjection = null;
let geoPath = null;
let hoveredRegion = null;

// Context data for presidents
let contestoData = null; // Parsed CSV data from contesto.csv
let contestoByYear = {}; // Map year -> { presidenteRepubblica, presidenteConsiglio, imgRepubblica, imgConsiglio, ... }
let presidenteImages = {}; // Cache for loaded images: { filename: p5.Image }
let currentPresidenteMode = 0; // 0 = Presidente della Repubblica, 1 = Presidente del Consiglio
let isDraggingPresidentSlider = false; // Track if slider is being dragged (not used for carousel)
let presidenteDescScrollOffset = 0; // Scroll offset for president description
let isDraggingDescScrollbar = false; // Track if description scrollbar is being dragged
let isDraggingQuesitiScrollbar = false; // Track if quesiti scrollbar is being dragged
let quesitiScrollOffset = 0; // Scroll offset for quesiti list
// Aggiungila insieme alle altre variabili globali all'inizio del file
let presidentClickZones = [];
// STIX fonts
let stixFont = null;
let stixFontBold = null;
let stixFontItalic = null;

// SVG omini per i grafici a destra
let omino1Img = null; // omino1.svg (per SI)
let omino2Img = null; // omino2.svg (per NO)
let omino3Img = null; // omino3.svg (omino grigio per "dato assente")


// ==================== HELP MODE STATE ====================
let helpModeActive = false;
let currentHoveredSection = null;

// Helper function to calculate quesiti and presidenti window bounds (same as drawQuesitiWindow)
function calculateQuesitiPresidentiBounds() {
  const navbarHeight = 100;
  const sliderHeight = 130;
  const cardY = navbarHeight;
  const cardHeight = height - navbarHeight - sliderHeight;
  const sectionStartY = cardY + 10;
  const bottomPadding = 3;
  
  const availableTop = sectionStartY;
  const availableBottom = cardY + cardHeight - bottomPadding;
  const totalAvailableHeight = availableBottom - availableTop;
  
  // Parametri per il box di destra (copiati da calculateChartsBounds per precisione)
  const windowSpacing = 10; // Spaziatura usata a destra
  // Altezza di ogni finestra a destra
  const rightWindowHeight = (totalAvailableHeight - windowSpacing * 2) / 3 * 0.95; 
  // Calcoliamo dove inizia il primo box (Quesiti) per allineare tutto
  const quesitiWindowSpacing = 20;
  const totalWindowsHeightQuesiti = totalAvailableHeight - 20;
  const quesitiWindowTop = availableTop + (totalAvailableHeight - totalWindowsHeightQuesiti) / 2;
  
  // Coordinate verticali dei grafici a DESTRA
  const window1Top = quesitiWindowTop;
  const window2Top = window1Top + rightWindowHeight + windowSpacing;
  const window3Top = window2Top + rightWindowHeight + windowSpacing;
  
  // PUNTO DI ARRIVO COMUNE: Dove finisce l'ultimo grafico a destra
  const targetBottomY = window3Top + rightWindowHeight;
  
  // Box Quesiti (Sinistra)
  const presidentSliderHeight_Placeholder = 250; // Valore temporaneo solo per calcolare top
  const quesitiWindowHeight = totalWindowsHeightQuesiti - presidentSliderHeight_Placeholder - quesitiWindowSpacing - 60;
  const presidentWindowTop = quesitiWindowTop + quesitiWindowHeight + quesitiWindowSpacing;
  
  // CALCOLO ALTEZZA DINAMICA: Dallo start del box presidenti fino al targetBottomY
  const dynamicPresidentHeight = targetBottomY - presidentWindowTop;
  
  const windowLeft = 40;
  const windowWidth = width * 0.34 - 60;
  const bgPadding = 15;
  
  return {
    quesiti: {
      x: windowLeft + bgPadding,
      y: quesitiWindowTop,
      w: windowWidth - bgPadding * 2,
      h: quesitiWindowHeight
    },
    presidenti: {
      x: windowLeft + bgPadding,
      y: presidentWindowTop,
      w: windowWidth - bgPadding * 2,
      h: dynamicPresidentHeight // <--- ALTEZZA PERFETTA
    }
  };
}


// Helper function to calculate charts bounds (same as drawSezione3Background)
function calculateChartsBounds() {
  const navbarHeight = 100;
  const sliderHeight = 130;
  
  const cardX = 0;
  const cardY = navbarHeight;
  const cardWidth = width;
  const cardHeight = height - navbarHeight - sliderHeight;
  
  const sectionStartY = cardY + 10;
  // Margine dal fondo (uguale a quello usato per i Presidenti)
  const bottomPadding = 20; 
  
  const chartAreaLeft = cardX + cardWidth * 0.67 + 5;
  const chartAreaWidth = cardWidth * 0.33 - 40;
  const bgPadding = 10;
  
  // Calcolo altezza totale disponibile
  const availableTop = sectionStartY;
  const availableBottom = cardY + cardHeight - bottomPadding; // PUNTO FISSO IN BASSO
  const totalAvailableHeight = availableBottom - availableTop;
  
  // --- CORREZIONE: Rimosso il 0.95 che accorciava la colonna ---
  const windowSpacing = 10;
  const windowHeight = (totalAvailableHeight - windowSpacing * 2) / 3; 
  
  // Allinea l'inizio con la colonna di sinistra
  const quesitiWindowSpacing = 20;
  const totalWindowsHeightQuesiti = totalAvailableHeight - 20;
  const quesitiWindowTop = availableTop + (totalAvailableHeight - totalWindowsHeightQuesiti) / 2;
  
  // Forza l'inizio allo stesso punto dei quesiti
  const chartsTop = quesitiWindowTop;
  
  // Forza la fine allo stesso punto dei presidenti (availableBottom)
  const chartsHeight = availableBottom - chartsTop;
  
  return {
    x: chartAreaLeft + bgPadding,
    y: chartsTop,
    w: chartAreaWidth - bgPadding * 2,
    h: chartsHeight
  };
}



// Helper function to calculate map bounds (same as drawGeoMap, including date header)
// Funzione corretta per calcolare i bordi della mappa (usata sia per drawGeoMap che per l'Help)
function calculateMapBounds() {
  const navbarHeight = 100;
  const sliderHeight = 130;
  
  // Dimensioni totali dell'area centrale
  const cardWidth = width;
  const cardHeight = height - navbarHeight - sliderHeight;
  
  // Calcolo orizzontale: Mappa larga 34% e centrata
  const mapWidth = cardWidth * 0.34;
  const mapLeft = (cardWidth - mapWidth) / 2;
  
  // Calcolo verticale: identico a come disegni la mappa
  const sectionStartY = navbarHeight - 20; 
  const availableTop = sectionStartY + 30; // 30px di spazio extra in alto
  // Il margine inferiore deve essere 20px sopra lo slider, come gli altri box
  const availableBottom = navbarHeight + cardHeight - 11; 
  
  const totalAvailableHeight = availableBottom - availableTop;
  const drawH = totalAvailableHeight - 20; // Padding interno
  
  // La mappa viene disegnata centrata verticalmente in questo spazio
  const paddingTop = availableTop + (totalAvailableHeight - drawH) / 2;

  return {
    x: mapLeft,
    y: paddingTop,
    w: mapWidth,
    h: drawH
  };
}




// Define help sections by their VISUAL AREAS on canvas
const HELP_SECTIONS = {
  'quesiti': {
    label: 'QUESITI/DOMANDE',
    description: 'Lista dei quesiti referendari per l\'anno selezionato. Clicca su un quesito per vedere i voti SI/NO e le statistiche di genere.',
    bounds: () => {
      const bounds = calculateQuesitiPresidentiBounds();
      return bounds.quesiti;
    }
  },
  'presidenti': {
    label: 'PRESIDENTI',
    description: 'Visualizza i Presidenti della Repubblica e del Consiglio durante il referendum selezionato. Usa le frecce per navigare.',
    bounds: () => {
      const bounds = calculateQuesitiPresidentiBounds();
      return bounds.presidenti;
    }
  },
  'mappa': {
    label: 'MAPPA DELL\'ITALIA',
    description: 'Clicca su una regione per filtrare i dati per quella regione. I colori indicano l\'affluenza: blu scuro = affluenza alta, blu chiaro = affluenza bassa.',
    bounds: () => calculateMapBounds()
  },
  'grafici': {
    label: 'STATISTICHE',
    description: 'Visualizza tre grafici: Affluenza (semicerchio), Voti SI/NO (barre con omini) e Distribuzione di Genere (semicerchio diviso). I dati si aggiornano in base alla regione e al quesito selezionati.',
    bounds: () => calculateChartsBounds()
  },
  'timeline': {
    label: 'TIMELINE ANNI',
    description: 'Clicca sui punti o trascina per selezionare un anno. I colori indicano lo stato del quorum: blu = raggiunto, beige = non richiesto, grigio chiaro = non raggiunto.',
    bounds: () => {
      // Il footer è posizionato a bottom:10px con height:130px
      // Quindi il footer inizia a height - 10 - 130 = height - 140
      // Lo slider container è dentro il footer e ha height:60px secondo il CSS
      const footerBottom = 10;
      const footerHeight = 130;
      const footerTop = height - footerBottom - footerHeight; // height - 140
      const sliderContainerHeight = 60; // Secondo il CSS
      
      return {
        x: 0,
        y: footerTop, // height - 140
        w: width,
        h: sliderContainerHeight // 60px
      };
    }
  },
  'slider': {
    label: 'SLIDER ANNI',
    description: 'Trascina lo slider o usa il pulsante play per scorrere automaticamente tra tutti gli anni. I grafici si aggiornano automaticamente.',
    bounds: () => {
      // Il footer è posizionato a bottom:10px con height:130px
      // Lo slider container è nella parte superiore del footer
      const footerBottom = 10;
      const footerHeight = 130;
      const footerTop = height - footerBottom - footerHeight; // height - 140
      const sliderContainerHeight = 60; // Secondo il CSS
      
      return {
        x: 0,
        y: footerTop, // height - 140 (stesso della timeline, sono la stessa cosa)
        w: width,
        h: sliderContainerHeight // 60px
      };
    }
  }

};



// ==================== HELP MODE LOGIC ====================

function setupHelpMode() {
  const helpToggle = document.getElementById('help-toggle');
  const helpStatus = document.getElementById('help-status');

  if (!helpToggle) {
    console.warn('Help toggle button not found');
    return;
  }

  helpToggle.addEventListener('click', () => {
    helpModeActive = !helpModeActive;
    
    helpToggle.classList.toggle('active', helpModeActive);
    
    // Aggiorna help-status solo se esiste
    if (helpStatus) {
      helpStatus.classList.toggle('active', helpModeActive);
      helpStatus.textContent = helpModeActive ? 'ON' : 'OFF';
    }
    
    console.log('Help Mode:', helpModeActive ? 'ENABLED' : 'DISABLED');
    
    if (!helpModeActive) {
      removeHelpOverlay();
      currentHoveredSection = null;
      
      // Timeline rimossa - non serve più resettare
      
      // RESET: Rimuovi blur da canvas
      const canvas = document.querySelector('canvas');
      if (canvas) {
        canvas.classList.remove('help-mode-blur', 'help-mode-clear');
      }
    }
  });
}


let lastLoggedSection = null; // Aggiungi questa variabile globale all'inizio

function mouseMoved() {
  if (helpModeActive) {
    currentHoveredSection = null;

    // hover SEZIONI CANVAS (inclusa timeline e slider)
    for (const [sectionKey, section] of Object.entries(HELP_SECTIONS)) {
      const bounds = section.bounds();
      if (mouseX >= bounds.x && mouseX < bounds.x + bounds.w &&
          mouseY >= bounds.y && mouseY < bounds.y + bounds.h) {
        currentHoveredSection = sectionKey;
        showHelpOverlay(section, sectionKey);
        redraw();
        return;
      }
    }

    // Se non siamo su nessuna sezione, nascondi l'overlay
    removeHelpOverlay();
  } else {
    // Se la modalità help non è attiva, assicurati che l'overlay sia nascosto
    removeHelpOverlay();
    
    // Check hover sui quesiti
    updateQuesitiHover();
  }

  redraw();
}

// --- NUOVO CODICE DA INSERIRE QUI ---
function mousePressed() {
  // Verifica se il click è su una barra dell'istogramma (hoveredIndex calcolato da updateHoverState)
  if (hoveredIndex !== -1) {
    const year = years[hoveredIndex];
    
    // Converti il formato anno da overview a dettaglio (stesso formato della timeline)
    let yearParam = year;
    // Gestione specifica per i casi 2016
    if (year === "2016(1)") {
      yearParam = "2016-1";
    } else if (year === "2016(2)") {
      yearParam = "2016-2";
    } else {
      // Per gli altri anni, usa il valore direttamente
      yearParam = year;
    }
    
    console.log('✅ Click su barra istogramma per anno:', year, '- vado al dettaglio');
    
    // Reindirizza alla pagina dettaglio
    window.location.href = 'dettaglio.html?year=' + encodeURIComponent(yearParam);
  }
  
}
// -------------------------------------


// Funzione per aggiornare quale quesito è sotto il mouse
function updateQuesitiHover() {
  hoveredQuesito = null;
  
  // Calcola le stesse dimensioni usate in drawQuesitiWindow e mousePressed
  const navbarHeight = 100;
  const sliderHeight = 130; // Space for slider, year labels and back button at bottom
  const cardY = navbarHeight;
  const cardHeight = height - navbarHeight - sliderHeight;
  const sectionStartY = cardY + 10;
  const bottomPadding = 3;
  const availableTop = sectionStartY;
  const availableBottom = cardY + cardHeight - bottomPadding;
  const totalAvailableHeight = availableBottom - availableTop;
  
  const windowLeft = 40;
  const windowWidth = width * 0.34 - 60;
  const bgPadding = 15;
  const presidentSliderHeight = 250;
  const windowSpacing = 20;
  const totalWindowsHeight = totalAvailableHeight - 20;
  const quesitiWindowHeight = totalWindowsHeight - presidentSliderHeight - windowSpacing - 60;
  const quesitiWindowTop = availableTop + (totalAvailableHeight - totalWindowsHeight) / 2;
  
  const startY = quesitiWindowTop + 30;
  const circleRadius = 15;
  const quesitiAreaTopPadding = circleRadius + 5;
  const quesitiAreaTop = startY + quesitiAreaTopPadding;
  const quesitiAreaBottom = quesitiWindowTop + quesitiWindowHeight - bgPadding;
  
  // Verifica se il mouse è nell'area dei quesiti
  if (mouseX >= windowLeft + bgPadding && mouseX < windowLeft + windowWidth - bgPadding &&
      mouseY >= quesitiAreaTop && mouseY < quesitiAreaBottom) {
    
    const quesiti2025 = quesitiList.length > 0 ? quesitiList : [];
    const minQuesitoHeight = 40;
    const quesitiHeights = [];
    const textStartX = windowLeft + bgPadding * 2 + 30;
    const rightPaddingExtra = 30;
    const textEndX = windowLeft + windowWidth - bgPadding * 2 - rightPaddingExtra;
    const maxTextWidth = textEndX - textStartX;
    
    textSize(18);
    quesiti2025.forEach((quesito) => {
      const words = quesito.testo.split(' ');
      let line = '';
      let lineCount = 1;
      for (let i = 0; i < words.length; i++) {
        const testLine = line + (line ? ' ' : '') + words[i];
        if (textWidth(testLine) > maxTextWidth && line.length > 0) {
          line = words[i];
          lineCount++;
        } else {
          line = testLine;
        }
      }
      const lineHeight = 23;
      const quesitoHeight = Math.max(minQuesitoHeight, 20 + lineCount * lineHeight);
      quesitiHeights.push(quesitoHeight);
    });
    
    const needsScroll = quesitiHeights.reduce((a, b) => a + b, 0) > (quesitiAreaBottom - quesitiAreaTop);
    const maxScrollOffset = needsScroll ? Math.max(0, quesitiHeights.reduce((a, b) => a + b, 0) - (quesitiAreaBottom - quesitiAreaTop)) : 0;
    const currentScrollOffset = constrain(quesitiScrollOffset, 0, maxScrollOffset);
    
    let currentY = startY - currentScrollOffset;
    for (let i = 0; i < quesiti2025.length; i++) {
      const quesitoHeight = quesitiHeights[i];
      const y = currentY;
      const quesitoClickTop = y;
      const quesitoClickBottom = y + quesitoHeight;
      
      if (mouseY >= quesitoClickTop && mouseY < quesitoClickBottom) {
        hoveredQuesito = quesiti2025[i].numero;
        break;
      }
      currentY += quesitoHeight;
    }
  }
}







function showHelpOverlay(section, sectionKey) {
  // Log per verificare che il nuovo codice sia in esecuzione
  console.log('🔵🔵🔵 NUOVO CODICE V5 ATTIVO - showHelpOverlay - sectionKey:', sectionKey);
  
  let overlay = document.getElementById('help-overlay-label');
  
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'help-overlay-label';
    overlay.className = 'help-overlay-canvas-label';
    document.body.appendChild(overlay);
  }

  // Crea il contenuto senza il titolo CONTESTO
  overlay.innerHTML = `
    <div style="display:flex; align-items:flex-start; gap:12px; width: 100%;">
      <img src="omino1.svg"
           alt=""
           style="width:32px; height:32px; flex-shrink:0; object-fit: contain;" />
      <div style="flex: 1; min-width: 0;">
        <div style="font-size: 15px; margin-bottom: 6px; font-weight: bold; color: #163264; line-height: 1.3;">
          ${section.label}
        </div>
        <div style="font-size: 12px; line-height: 1.4; color: #163264;">
          ${section.description}
        </div>
      </div>
    </div>
  `;

  // Calcola la posizione dell'overlay mantenendolo dentro lo schermo
  const overlayWidth = 300; // max-width + padding (aumentato)
  const overlayHeight = 100; // altezza senza il titolo "CONTESTO"
  const offset = 20; // distanza dal cursore
  
  // Determina la sezione corrente per posizionamento intelligente
  const bounds = section.bounds();
  // Usa il parametro sectionKey passato alla funzione
  
  let left, top;
  
  // Posizionamento intelligente in base alla sezione
  if (sectionKey === 'quesiti') {
    // Per i quesiti, posiziona l'overlay MOLTO MOLTO più in basso per evitare overlap
    left = bounds.x + bounds.w + offset + 10; // Spostiamo anche un po' a destra
    // Posiziona quasi alla fine della sezione quesiti (90-95% dall'inizio)
    top = bounds.y + bounds.h * 0.92; // 92% dall'inizio della sezione - quasi alla fine
    // Assicurati che non esca dalla sezione
    top = Math.min(bounds.y + bounds.h - overlayHeight - 5, top);
    
    console.log('Quesiti - bounds:', bounds, 'top:', top);
  } else if (sectionKey === 'presidenti') {
    // Per i presidenti, posiziona l'overlay nella parte MOLTO bassa della sezione
    // per evitare completamente overlap con la finestra principale dei presidenti
    left = bounds.x + bounds.w + offset + 10; // Spostiamo anche un po' a destra
    // Posiziona nella parte molto bassa della sezione presidenti (80-90% dall'inizio)
    top = bounds.y + bounds.h * 0.85; // 85% dall'inizio - molto più in basso
    // Assicurati che non esca in basso
    top = Math.min(bounds.y + bounds.h - overlayHeight - 20, top);
    // Assicurati che sia comunque nella parte bassa
    top = Math.max(bounds.y + bounds.h * 0.75, top);
    
    console.log('Presidenti - bounds:', bounds, 'top:', top);
  } else if (sectionKey === 'mappa') {
    // Per la mappa (centro), posiziona a sinistra o sopra, ma molto abbassato
    if (mouseX < width / 2) {
      // Se il mouse è nella parte sinistra della mappa, posiziona a destra
      left = bounds.x + bounds.w + offset;
    } else {
      // Se il mouse è nella parte destra, posiziona a sinistra del cursore
      left = mouseX - overlayWidth - offset;
    }
    top = mouseY + 100; // Molto più abbassato rispetto al cursore
  } else if (sectionKey === 'grafici') {
    // Per i grafici (a destra), posiziona sempre a sinistra, molto abbassato
    left = mouseX - overlayWidth - offset;
    top = mouseY + 100; // Molto più abbassato rispetto al cursore
  } else if (sectionKey === 'timeline') {
    // Per la timeline, posiziona sopra
    left = mouseX - overlayWidth / 2;
    top = bounds.y - overlayHeight - offset;
  } else if (sectionKey === 'slider') {
    // Per lo slider, posiziona sopra
    left = mouseX - overlayWidth / 2;
    top = bounds.y - overlayHeight - offset;
  } else {
    // Default: posiziona vicino al cursore, ma molto abbassato
    left = mouseX + offset;
    top = mouseY + 120; // Molto più abbassato per evitare overlap
  }
  
  // Controlli per mantenere l'overlay dentro lo schermo
  // Se esce a destra, posizionalo a sinistra del cursore
  if (left + overlayWidth > windowWidth) {
    left = mouseX - overlayWidth - offset;
  }
  
  // Se esce a sinistra, posizionalo a destra del cursore
  if (left < 10) {
    left = mouseX + offset;
    // Se anche così esce, posiziona al centro
    if (left + overlayWidth > windowWidth) {
      left = (windowWidth - overlayWidth) / 2;
    }
  }
  
  // Se esce in basso, posizionalo sopra il cursore
  if (top + overlayHeight > windowHeight - 130) { // Lascia spazio per il footer (130px altezza + 10px bottom)
    top = mouseY - overlayHeight - offset;
  }
  
  // Se esce in alto, abbassalo ulteriormente per evitare overlap con navbar e finestre
  // Per quesiti e presidenti, assicurati che sia MOLTO in basso
  if (sectionKey === 'quesiti' && top < bounds.y + bounds.h * 0.75) {
    top = bounds.y + bounds.h * 0.85; // Almeno all'85% della sezione quesiti - molto in basso
  } else if (sectionKey === 'presidenti' && top < bounds.y + bounds.h * 0.65) {
    top = bounds.y + bounds.h * 0.75; // Almeno al 75% della sezione presidenti - molto in basso
  } else if (top < 200) { // Per altre sezioni, lascia molto spazio per navbar
    top = 200;
  }
  
  // Assicurati che non esca dai bordi
  left = Math.max(10, Math.min(left, windowWidth - overlayWidth - 10));
    top = Math.max(100, Math.min(top, windowHeight - overlayHeight - 130));
  
  overlay.style.display = 'block';
  overlay.style.left = left + 'px';
  overlay.style.top = top + 'px';
  
  console.log('Overlay position - left:', left, 'top:', top, 'sectionKey:', sectionKey);
}



function removeHelpOverlay() {
  const overlay = document.getElementById('help-overlay-label');
  if (overlay) {
    overlay.style.display = 'none';
  }
}


// Draw visual indicators during help mode
function drawHelpModeOverlay() {
  if (!helpModeActive) return;
  
  push();
  
  for (const [sectionKey, section] of Object.entries(HELP_SECTIONS)) {
    const bounds = section.bounds();
    const isHovered = sectionKey === currentHoveredSection;
    
    if (isHovered) {
      // Highlighted section: solo bordo giallo, nessun fill
      noFill();
      stroke(255, 183, 0);
      strokeWeight(3);
      rect(bounds.x, bounds.y, bounds.w, bounds.h);
    } else {
      // Dimmed section: ombreggiatura nera
      fill(0, 0, 0, 80);
      noStroke();
      rect(bounds.x, bounds.y, bounds.w, bounds.h);
    }
  }
  
  pop();
}



function drawHelpHintBubble() {
  // Bubble e omino sono ora gestiti via HTML (help-overlay-label).
  // Non disegniamo più nulla sul canvas per l'hint.
  return;
}





function preload() {
  // Load STIX fonts
  stixFont = loadFont('font/STIX_Two_Text/static/STIXTwoText-Regular.ttf');
  stixFontBold = loadFont('font/STIX_Two_Text/static/STIXTwoText-Bold.ttf');
  // Load omini SVG
  omino1Img = loadImage('omino1.svg');
  omino2Img = loadImage('omino2.svg');
  omino3Img = loadImage('omino3.svg');
}

function setup() {
  createHtmlLegend();
  // --- LOGICA DI RICEZIONE ANNO DALL'URL ---
  const urlParams = new URLSearchParams(window.location.search);
  const yearFromUrl = urlParams.get('year');
  
  // Se esiste un parametro 'year' e quell'anno è previsto nel nostro oggetto REFERENDUM_YEARS
  if (yearFromUrl && REFERENDUM_YEARS[yearFromUrl]) {
    selectedYear = yearFromUrl;
    dataFile = REFERENDUM_YEARS[yearFromUrl]; // Imposta il percorso del CSV corrispondente
    console.log("Anno caricato dall'URL:", selectedYear);
  }
  // -----------------------------------------

  const canvas = createCanvas(windowWidth, windowHeight);
  console.log('p5 setup running - canvas created');
  
  // Aggiungi listener diretto sul canvas per intercettare i click anche quando altri elementi sono sopra
  // Questo è necessario perché la mappa SVG ha z-index più alto e potrebbe coprire il canvas
  canvas.elt.addEventListener('click', function(e) {
    const rect = canvas.elt.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;
    
    // Calcola le coordinate del carousel (stesse di mousePressed)
    const navbarHeight = 100;
    const sliderHeight = 130; // Space for slider, year labels and back button at bottom
    const cardX = 0;
    const cardY = navbarHeight;
    const cardWidth = width;
    const cardHeight = height - navbarHeight - sliderHeight;
    const sectionStartY = cardY + 10;
    const bottomPadding = 3;
    const windowLeft = cardX + 40;
    const windowWidth = cardWidth * 0.34 - 60;
    const bgPadding = 15;
    const presidentSliderHeight = 250;
    const windowSpacing = 20;
    
    const availableTop = sectionStartY;
    const availableBottom = cardY + cardHeight - bottomPadding;
    const totalAvailableHeight = availableBottom - availableTop;
    const totalWindowsHeight = totalAvailableHeight - 20;
    const quesitiWindowHeight = totalWindowsHeight - presidentSliderHeight - windowSpacing - 60;
    const quesitiWindowTop = availableTop + (totalAvailableHeight - totalWindowsHeight) / 2;
    const presidentWindowTop = quesitiWindowTop + quesitiWindowHeight + windowSpacing;
    const sliderAreaY = presidentWindowTop;
    
    const carouselLeft = windowLeft + bgPadding;
    const carouselRight = windowLeft + windowWidth - bgPadding;
    const carouselTop = sliderAreaY;
    const carouselBottom = sliderAreaY + presidentSliderHeight;
    
    // Verifica se il click è nell'area del carousel (zona sinistra)
    if (clickX >= carouselLeft && clickX < carouselRight && 
        clickY >= carouselTop && clickY < carouselBottom) {
      
      const carouselX = windowLeft + bgPadding;
      const carouselWidth = windowWidth - bgPadding * 2;
      const carouselY = sliderAreaY;
      const headerY = carouselY + 15;
      
      const dotSize = 8;
      const dotSpacing = 20;
      const carouselCenterX = carouselX + carouselWidth / 2;
      const dotsStartX = carouselCenterX - dotSpacing / 2;
      const dotY = headerY;
      
      const dotClickAreaWidth = 150;
      const dotClickAreaHeight = 150;
      const maxClickDistance = 75;
      
      // Right dot (Consiglio)
      const rightDotCenterX = dotsStartX + dotSpacing;
      const rightDotCenterY = dotY;
      const distToRightDot = Math.sqrt(Math.pow(clickX - rightDotCenterX, 2) + Math.pow(clickY - rightDotCenterY, 2));
      const rightDotX = rightDotCenterX - dotClickAreaWidth / 2;
      const rightDotY = rightDotCenterY - dotClickAreaHeight / 2;
      const rightDotRight = rightDotX + dotClickAreaWidth;
      const rightDotBottom = rightDotY + dotClickAreaHeight;
      const inRightArea = (clickX >= rightDotX && clickX <= rightDotRight && clickY >= rightDotY && clickY <= rightDotBottom) ||
                          distToRightDot <= maxClickDistance;
      
      if (inRightArea) {
        console.log('✅✅✅ CLICK SUL PALLINO DESTRO RILEVATO DAL LISTENER HTML! ✅✅✅');
        e.stopPropagation();
        e.preventDefault();
        e.stopImmediatePropagation();
        
        // Cambia modalità
        if (currentPresidenteMode !== 1) {
          currentPresidenteMode = 1;
          presidenteDescScrollOffset = 0;
          
          const yearKey = String(selectedYear);
          let presidenteData = contestoByYear[yearKey];
          if (!presidenteData && !isNaN(selectedYear)) {
            presidenteData = contestoByYear[parseInt(selectedYear)];
          }
          if (!presidenteData) {
            const numericYear = getYearNumeric(yearKey);
            for (const key in contestoByYear) {
              if (getYearNumeric(key) === numericYear) {
                presidenteData = contestoByYear[key];
                break;
              }
            }
          }
          
          if (presidenteData && presidenteData.imgConsiglio) {
            const cachedImg = presidenteImages[presidenteData.imgConsiglio];
            if (!cachedImg || (cachedImg && cachedImg.width === 0)) {
              loadPresidenteImages(presidenteData, true);
            }
          }
          
          redraw();
        }
        return false;
      }
      
      // Left dot (Repubblica)
      const leftDotCenterX = dotsStartX;
      const leftDotCenterY = dotY;
      const distToLeftDot = Math.sqrt(Math.pow(clickX - leftDotCenterX, 2) + Math.pow(clickY - leftDotCenterY, 2));
      const leftDotX = leftDotCenterX - dotClickAreaWidth / 2;
      const leftDotY = leftDotCenterY - dotClickAreaHeight / 2;
      const leftDotRight = leftDotX + dotClickAreaWidth;
      const leftDotBottom = leftDotY + dotClickAreaHeight;
      const inLeftArea = (clickX >= leftDotX && clickX <= leftDotRight && clickY >= leftDotY && clickY <= leftDotBottom) ||
                         distToLeftDot <= maxClickDistance;
      
      if (inLeftArea) {
        console.log('✅✅✅ CLICK SUL PALLINO SINISTRO RILEVATO DAL LISTENER HTML! ✅✅✅');
        e.stopPropagation();
        e.preventDefault();
        e.stopImmediatePropagation();
        
        if (currentPresidenteMode !== 0) {
          currentPresidenteMode = 0;
          presidenteDescScrollOffset = 0;
          redraw();
        }
        return false;
      }
    }
  }, true); // Usa capture phase per intercettare prima degli altri listener
  
  setupHelpMode();
  

  // Use STIX font if loaded, otherwise fallback
  if (stixFont) {
    textFont(stixFont);
  } else {
    textFont('serif'); // Fallback to serif
  }
  // wire file input
  const input = document.getElementById('csvfile');
  input.addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (f) {
      readCSVFile(f);
    }
  });

  // Load quorum.csv, then setup year slider (so colors can use quorum info)
  loadQuorumData().catch(err => {
    console.warn('Could not load quorum.csv:', err);
  }).finally(() => {
    // Setup year slider after we attempted to load quorum data
    setupYearSlider();
  });

  // Load contesto.csv for president data
  loadContestoData();

  // attempt to fetch default CSV for selected year when page is served
  console.log('Loading affluenza data for year', selectedYear, 'from:', dataFile);
  fetch(dataFile).then(r => {
    if (r.ok) {
      console.log('Successfully fetched CSV file for year', selectedYear);
      return r.text();
    }
    throw new Error('no default');
  }).then(txt => {
    // parse fetched CSV text
    tableRows = parseCSV(txt);
    parseTableTotals();
    debugLog('CSV loaded for year ' + selectedYear + ': ' + dataFile);
    console.log('2025 affluenza data loaded successfully');
    redraw();
  }).catch(err => {
    console.warn('Could not load default 2025 CSV:', err);
    debugLog('No default CSV loaded automatically for year ' + selectedYear + ' â€" waiting user file selection', true);
    // Load GeoJSON even without CSV so map can be displayed
    loadAndJoinGeoJSON();
    // no default loaded; wait for user file selection
    background(245);
    push();
    fill(0);
    textSize(390);
    textAlign(LEFT, TOP);
    text('Seleziona il file CSV del 2025 (dataset/25-2025.csv) usando il controllo sopra per visualizzare i dati.', 20, 60);
    pop();
  });

  // Don't use noLoop() - we need draw() to run continuously to show the map
  // noLoop();
}

function readCSVFile(file) {
  const reader = new FileReader();
  reader.onload = (ev) => {
    const txt = ev.target.result;
    // Update dataFile to reflect the selected file
    if (file && file.name) {
      dataFile = file.name;
      console.log('ðŸ" Loading CSV file:', dataFile);
    }
    console.log('ðŸ" CSV file content length:', txt.length, 'characters');
    tableRows = parseCSV(txt);
    console.log('ðŸ" Parsed CSV rows:', tableRows ? tableRows.length : 0);
    parseTableTotals();
    // Update SVG regions with newly parsed affluenza values (if using SVG fallback)
    if (svgRegions && svgRegions.length > 0) updateSVGRegionsAffluenza();
    console.log('âœ" Parsed regions:', Object.keys(regionValues).length);
    console.log(' Regions:', Object.keys(regionValues));
    debugLog('CSV loaded from file input: ' + (file && file.name));
    console.log('Affluenza data loaded from:', file && file.name);
    
    // If GeoJSON is already loaded, re-join the data immediately
    if (geojsonData) {
      console.log('ðŸ" GeoJSON already loaded, re-joining with CSV data from file input...');
      joinGeoJSONData(geojsonData);
    } else {
      console.log('â" GeoJSON not loaded yet, will join when GeoJSON loads');
    }
    
    redraw();
  };
  reader.onerror = (err) => {
    console.error('â" Error reading CSV file:', err);
    debugLog('Error reading CSV file: ' + err, true);
  };
  reader.readAsText(file, 'utf-8');
}

// Load and parse contesto.csv for president data
function loadContestoData() {
  const contestoFile = 'Contesto copia/contesto.csv';
  console.log('Loading contesto data from:', contestoFile);
  fetch(contestoFile).then(r => {
    if (r.ok) {
      console.log('Successfully fetched contesto CSV file');
      return r.text();
    }
    throw new Error('Could not load contesto.csv');
  }).then(txt => {
    contestoData = parseCSV(txt);
    console.log('Contesto data loaded:', contestoData.length, 'rows');
    
    // Build map year -> president data
    contestoByYear = {};
    contestoData.forEach((row, index) => {
      // Extract year from REFERENDUM column (e.g., "2-3 giugno 1946" -> 1946)
      // Handle column name with or without trailing space
      const referendumDate = row['REFERENDUM '] || row['REFERENDUM'] || '';
      if (!referendumDate) {
        console.warn(`⚠️ Riga ${index + 1}: colonna REFERENDUM vuota`);
        return;
      }
      
      const yearMatch = referendumDate.match(/\b(19\d{2}|20\d{2})\b/);
      if (!yearMatch) {
        console.warn(`⚠️ Riga ${index + 1}: nessun anno trovato in "${referendumDate}"`);
        return;
      }
      
      const year = parseInt(yearMatch[1]);
      
      // Handle 2016-1 and 2016-2 cases
      let yearKey = String(year);
      if (year === 2016) {
        // Check if this is the first or second 2016 referendum
        const existing2016 = Object.keys(contestoByYear).filter(k => getYearNumeric(k) === 2016);
        if (existing2016.length > 0) {
          yearKey = '2016-2';
        } else {
          yearKey = '2016-1';
        }
      }
      
      // Also store with numeric key for easier lookup
      const numericKey = String(year);
      
      const presidenteData = {
        presidenteRepubblica: row['PRESIDENTE DELLA REPUBBLICA'] || '',
        presidenteConsiglio: row['PRESIDENTE DEL CONSIGLIO'] || '',
        descrizioneRep: row['DESCRIZIONE_REP'] || row['DESCRIZIONE_REP '] || '',
        descrizioneConsiglio: row['DESCRIZIONE_CONSIGLIO'] || row['DESCRIZIONE_CONSIGLIO '] || '',
        imgRepubblica: row['IMMAGINE_REPUBBLICA'] || '',
        imgConsiglio: row['IMMAGINE_MINISTRO'] || '',
        
        // --- QUESTE SONO LE RIGHE NUOVE DA AGGIUNGERE ---
        linkRepubblica: row['LINK_REP'] || '', 
        linkConsiglio: row['LINK_CONS'] || '',
        // ------------------------------------------------
        
        referendumDate: referendumDate.trim()
      };
      
      // Store with both yearKey (for 2016-1/2016-2) and numeric key (for easier lookup)
      contestoByYear[yearKey] = presidenteData;
      if (numericKey !== yearKey) {
        contestoByYear[numericKey] = presidenteData;
      }
      
      // Debug: log loaded data with image filenames
      console.log(`✅ Dati caricati per anno ${yearKey} (anche salvato come ${numericKey}):`, {
        rep: presidenteData.presidenteRepubblica,
        consiglio: presidenteData.presidenteConsiglio,
        imgRepubblica: presidenteData.imgRepubblica,
        imgConsiglio: presidenteData.imgConsiglio,
        descRep: presidenteData.descrizioneRep ? presidenteData.descrizioneRep.substring(0, 50) + '...' : '',
        descConsiglio: presidenteData.descrizioneConsiglio ? presidenteData.descrizioneConsiglio.substring(0, 50) + '...' : '',
        rowKeys: Object.keys(row)
      });
      
      // Warn if Consiglio data is missing
      if (!presidenteData.presidenteConsiglio) {
        console.warn(`⚠️ Nome Presidente Consiglio mancante per anno ${yearKey}`);
      }
      if (!presidenteData.imgConsiglio) {
        console.warn(`⚠️ Nome immagine Consiglio mancante per anno ${yearKey}`);
      }
      if (!presidenteData.descrizioneConsiglio) {
        console.warn(`⚠️ Descrizione Consiglio mancante per anno ${yearKey}`);
      }
      
      // Verifica che i dati siano stati letti correttamente dal CSV
      if (presidenteData.presidenteConsiglio && presidenteData.imgConsiglio) {
        console.log(`✅ Dati Consiglio completi per ${yearKey}: ${presidenteData.presidenteConsiglio} - ${presidenteData.imgConsiglio}`);
      }
      
      // Load images for this year
      loadPresidenteImages(presidenteData);
    });
    
    console.log('Contesto by year:', Object.keys(contestoByYear));
    redraw();
  }).catch(err => {
    console.warn('Could not load contesto.csv:', err);
  });
}

// Load and parse quorum.csv to determine quorum status per year
// CSV format (no header): YEAR,STATUS
// e.g. 1946,NON_RICHIESTO / 1974,RAGGIUNTO / 1990,NON RAGGIUNTO / 2016(1),RAGGIUNTO
function loadQuorumData() {
  const quorumFile = 'quorum.csv';
  console.log('Loading quorum data from:', quorumFile);

  return fetch(quorumFile)
    .then(r => {
      if (!r.ok) throw new Error('Could not load quorum.csv');
      return r.text();
    })
    .then(txt => {
      // Start from a fresh map, but only overwrite the global variable
      // after parsing succeeds. If loading fails, we keep the defaults
      // defined at the top of the file.
      const parsedQuorumStatusByYear = {};
      const lines = txt.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      lines.forEach(line => {
        const parts = line.split(',');
        if (parts.length < 2) return;
        const rawYear = parts[0].trim();
        const rawStatus = parts[1].trim();

        if (!rawYear) return;

        // Normalize year key to match REFERENDUM_YEARS keys
        let yearKey = rawYear;
        // Handle 2016(1) / 2016(2) notation
        if (/^2016\s*\(/.test(rawYear)) {
          if (rawYear.includes('1')) {
            yearKey = '2016-1';
          } else if (rawYear.includes('2')) {
            yearKey = '2016-2';
          } else {
            yearKey = '2016';
          }
        }

        // Normalize status: collapse spaces into underscores and uppercase
        const normStatus = rawStatus.replace(/\s+/g, '_').toUpperCase();
        if (normStatus === 'RAGGIUNTO' || normStatus === 'NON_RICHIESTO' || normStatus === 'NON_RAGGIUNTO') {
          parsedQuorumStatusByYear[yearKey] = normStatus;
        } else {
          console.warn('Unknown quorum status in quorum.csv:', rawStatus, 'for year', rawYear);
        }
      });

      // Replace global map only after successful parsing
      quorumStatusByYear = parsedQuorumStatusByYear;
      console.log('Quorum status by year loaded:', quorumStatusByYear);
      // Update timeline colors after quorum data is loaded
      updateTimelineColors();
    })
    .catch(err => {
      console.warn('Error loading quorum.csv:', err);
      // On error, keep the existing quorumStatusByYear values (defaults),
      // so the timeline still has meaningful colors.
    });
}

// Update timeline square colors based on quorum data
function updateTimelineColors() {
  // Timeline rimossa - aggiorna solo i dots dello slider visibile
  // const yearDots = document.getElementById('year-dots');
  // if (!yearDots) return;
  
  const dots = yearDots.querySelectorAll('[data-year-key]');
  const FILLED_BLUE = '#1E52A6';
  const BORDER_BLUE = '#1E52A6';
  const LIGHT_BLUE = '#a4afc1ff';
  const NON_RICHIESTO_COLOR = '#F6ECE1'; // Color for NON_RICHIESTO
  
  dots.forEach(dotContainer => {
    const yearKey = dotContainer.getAttribute('data-year-key');
    const dot = dotContainer.querySelector('div');
    if (!dot || !yearKey) return;
    
    // Ensure square shape
    const isSelected = yearKey === String(selectedYear);
    const baseSize = isSelected ? 18 : 16;
    dot.style.width = `${baseSize}px`;
    dot.style.height = `${baseSize}px`;
    
    // Apply color based on quorum status from quorum.csv
    const quorumStatus = quorumStatusByYear[yearKey];
    
    // Debug for 2016 years
    if (yearKey === '2016-1' || yearKey === '2016-2') {
      console.log(`updateTimelineColors: ${yearKey} -> quorumStatus=${quorumStatus}, in map=${yearKey in quorumStatusByYear}`);
    }
    
    if (quorumStatus === 'RAGGIUNTO') {
      dot.style.backgroundColor = FILLED_BLUE;
      dot.style.border = 'none';
    } else if (quorumStatus === 'NON_RICHIESTO') {
      dot.style.backgroundColor = NON_RICHIESTO_COLOR;
      dot.style.border = `2px solid ${BORDER_BLUE}`;
    } else if (quorumStatus === 'NON_RAGGIUNTO') {
      dot.style.backgroundColor = LIGHT_BLUE;
      dot.style.border = 'none';
    } else {
      // Fallback: use default values if quorum not loaded yet
      console.warn(`No quorum status for ${yearKey}, checking defaults...`);
      // Try to use default value if available
      const defaultStatus = {
         '1946': 'NON_RICHIESTO',
        '1974': 'RAGGIUNTO',
        '1978': 'RAGGIUNTO',
        '1981': 'RAGGIUNTO',
        '1985': 'RAGGIUNTO',
        '1987': 'RAGGIUNTO',
        '1989': 'NON_RICHIESTO',
        '1990': 'NON_RAGGIUNTO',
        '1991': 'RAGGIUNTO',
        '1993': 'RAGGIUNTO',
        '1995': 'RAGGIUNTO',
        '1997': 'NON_RAGGIUNTO',
        '1999': 'NON_RAGGIUNTO',
        '2000': 'NON_RAGGIUNTO',
        '2001': 'NON_RICHIESTO',
        '2003': 'NON_RAGGIUNTO',
        '2005': 'NON_RAGGIUNTO',
        '2006': 'NON_RICHIESTO',
        '2009': 'NON_RAGGIUNTO',
        '2011': 'RAGGIUNTO',
        '2016-1': 'NON_RAGGIUNTO',
        '2016-2': 'NON_RICHIESTO',
        '2020': 'NON_RICHIESTO',
        '2022': 'NON_RAGGIUNTO',
        '2025': 'NON_RAGGIUNTO'
      };
      const fallbackStatus = defaultStatus[yearKey];
      if (fallbackStatus === 'RAGGIUNTO') {
        dot.style.backgroundColor = FILLED_BLUE;
        dot.style.border = 'none';
      } else if (fallbackStatus === 'NON_RICHIESTO') {
        dot.style.backgroundColor = '#F6ECE1';
        dot.style.border = `2px solid ${BORDER_BLUE}`;
      } else if (fallbackStatus === 'NON_RAGGIUNTO') {
        dot.style.backgroundColor = LIGHT_BLUE;
        dot.style.border = 'none';
      } else {
        // Last resort: gray
        dot.style.backgroundColor = '#E1E1E1';
        dot.style.border = 'none';
      }
    }
  });
}

// Load images for a president data object
function loadPresidenteImages(presidenteData, forceReload = false) {
  // Load Repubblica image
  if (presidenteData.imgRepubblica && (!presidenteImages[presidenteData.imgRepubblica] || forceReload)) {
    const imgPath = 'Contesto copia/IMMAGINE_REPUBBLICA/' + presidenteData.imgRepubblica;
    console.log('📸 Caricamento immagine Repubblica:', imgPath);
    presidenteImages[presidenteData.imgRepubblica] = loadImage(imgPath, 
      () => {
        console.log('✅ Immagine Repubblica caricata con successo:', imgPath);
        redraw(); // Force redraw when image loads
      },
      () => {
        console.error('❌ Errore nel caricamento immagine Repubblica:', imgPath);
      }
    );
  }
  
  // Load Consiglio image - always try to load if filename exists
  if (presidenteData.imgConsiglio) {
    const cachedImg = presidenteImages[presidenteData.imgConsiglio];
    // Only load if not in cache OR if in cache but not yet loaded (width = 0) OR if forceReload is true
    if (forceReload || !cachedImg || (cachedImg && cachedImg.width === 0)) {
      const imgPath = 'Contesto copia/IMMAGINE_CONSIGLIO/' + presidenteData.imgConsiglio;
      console.log('📸 Tentativo di caricare immagine Consiglio:', imgPath);
      console.log('   Forza ricaricamento:', forceReload, '| In cache:', !!cachedImg, '| Width:', cachedImg ? cachedImg.width : 0);
      
      // Try loading with original filename
      presidenteImages[presidenteData.imgConsiglio] = loadImage(imgPath,
        () => {
          console.log('✅ Immagine Consiglio caricata con successo:', imgPath);
          console.log('   Dimensioni immagine:', presidenteImages[presidenteData.imgConsiglio].width, 'x', presidenteImages[presidenteData.imgConsiglio].height);
          redraw(); // Force redraw when image loads
        },
        (err) => {
          console.error('❌ Errore nel caricamento immagine Consiglio:', imgPath);
          console.error('   Dettagli errore:', err);
          // Try common filename variations
          const variations = [
            imgPath.replace(/ /g, '_'),
            imgPath.replace(/_/g, ' '),
            imgPath.replace(/Goria/g, 'Gloria'),
            imgPath.replace(/Lamberto/g, 'Lambarto'),
            imgPath.replace(/Lambarto/g, 'Lamberto')
          ];
          
          let tried = 0;
          const tryNext = () => {
            if (tried < variations.length && variations[tried] !== imgPath) {
              const altPath = variations[tried];
              console.log(`📸 Tentativo variante ${tried + 1}/${variations.length}:`, altPath);
              tried++;
              presidenteImages[presidenteData.imgConsiglio] = loadImage(altPath,
                () => {
                  console.log('✅ Immagine caricata con variante:', altPath);
                  console.log('   Dimensioni immagine:', presidenteImages[presidenteData.imgConsiglio].width, 'x', presidenteImages[presidenteData.imgConsiglio].height);
                  redraw();
                },
                () => {
                  console.log(`⚠️ Variante ${tried} fallita, provo la prossima...`);
                  tryNext(); // Try next variation
                }
              );
            } else {
              console.error('❌ Tutte le varianti hanno fallito per:', presidenteData.imgConsiglio);
              console.error('   Path originale:', imgPath);
              console.error('   Varianti provate:', variations);
            }
          };
          tryNext();
        }
      );
    } else {
      console.log('✅ Immagine Consiglio già in cache e caricata:', presidenteData.imgConsiglio);
      console.log('   Dimensioni:', cachedImg.width, 'x', cachedImg.height);
    }
  } else {
    console.warn('⚠️ Nessun nome immagine Consiglio trovato nei dati per:', presidenteData);
  }
}

// simple CSV parser that respects quoted fields and returns array of objects using header row
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
  if (lines.length === 0) return [];
  const header = splitCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = splitCSVLine(lines[i]);
    if (fields.length === 0) continue;
    const obj = {};
    for (let j = 0; j < header.length; j++) {
      obj[header[j].trim()] = (fields[j] !== undefined) ? fields[j] : '';
    }
    rows.push(obj);
  }
  return rows;
}

// split a CSV line into fields, handling quoted commas
function splitCSVLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i+1] === '"') {
        cur += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result.map(s => s.trim());
}

function parseTableTotals() {
  regionValues = {};
  valuesArray = [];
  totalVotiSi = 0;
  totalVotiNo = 0;
  regionVotes = {}; // Reset region votes
  quesitiVotes = {}; // Reset quesiti votes
  quesitiList = []; // Reset quesiti list
  totalMaschi = 0; // Reset national totals
  totalFemmine = 0; // Reset national totals
  regionGender = {}; // Reset region gender data
  regionQuesitoGender = {}; // Reset region-quesito gender data
  quesitoGender = {}; // Reset quesito gender data (national totals per quesito)
  
  if (!tableRows) {
    console.warn('No table rows to parse');
    return;
  }
  
  console.log('Parsing CSV data for affluenza values from 2025...');
  console.log('Total rows in CSV:', tableRows.length);
  
  // Track which regions we've already seen to avoid duplicates
  const seenRegions = new Set();
  
  // For CSVs without "Total" rows, we'll aggregate by region
  const regionAggregates = {}; // { regionName: { affluenza: [], votiSi: 0, votiNo: 0, maschi: 0, femmine: 0, count: 0 } }
  
  for (let r = 0; r < tableRows.length; r++) {
    const row = tableRows[r];
    const regione = (row['REGIONE'] || '').trim();
    const provincia = (row['PROVINCIA'] || '').trim();
    // Try different possible column names for affluenza
    const aff = (row['AFFLUENZA'] || row['Calculated Field 1'] || row['AFFLUENZA_%'] || row['Campo calcolato 1'] || '').trim();
    
    // Skip rows where both regione and provincia are empty
    if (!regione && !provincia) continue;
    
    // Strategy 1: Look for rows with "Total" in region name (e.g., "ABRUZZO Total", "BASILICATA Total")
    // But exclude "Grand Total" which is the national total
    const regioneUpper = (regione || '').toUpperCase().trim();
    const hasTotal = regioneUpper.includes('TOTAL');
    const isGrandTotal = regioneUpper.includes('GRAND TOTAL') || regioneUpper === 'GRAND TOTAL' || regioneUpper.startsWith('GRAND');
    const isRegionTotalRow = hasTotal && provincia === '' && !isGrandTotal;
    
    // Strategy 2: If no "Total", check if this looks like a region total row:
    // - provincia is empty AND regione is not empty AND regione matches a known region name
    // This handles CSVs where region totals don't have "Total" in the name
    const isLikelyRegionTotal = !hasTotal && provincia === '' && regione && 
                                 !regioneUpper.includes('ITALIA') && 
                                 !regioneUpper.includes('TOTALE') &&
                                 !isGrandTotal;
    
    // Check for national total row (Grand Total)
    // Also check for rows with empty REGIONE and empty PROVINCIA that might be totals
    // Or rows where REGIONE contains "Grand Total" (case-insensitive)
    const provinciaUpper = (provincia || '').toUpperCase().trim();
    const isNationalTotalRow = (isGrandTotal && (provincia === '' || provinciaUpper === '')) || 
                               (regioneUpper === 'GRAND TOTAL' || regioneUpper === 'TOTALE' || regioneUpper === 'ITALIA') ||
                               (regione === '' && provincia === '' && r === tableRows.length - 1) || // Last row with both empty might be Grand Total
                               (regioneUpper.includes('GRAND') && provinciaUpper === ''); // Any row with "GRAND" in region name
    
    if (isNationalTotalRow) {
      // Parse national totals
      const aff = (row['AFFLUENZA'] || row['Calculated Field 1'] || row['AFFLUENZA_%'] || row['Campo calcolato 1'] || '').trim();
      let num = 0;
      if (aff) {
        const cleanAff = aff.replace('%', '').replace(/,/g, '.').trim();
        num = parseFloat(cleanAff);
        // If the number is less than 1, it's likely a decimal (0.30 = 30%), so multiply by 100
        if (isFinite(num) && num > 0 && num < 1) {
          num = num * 100;
        }
      }
      
      // Parse gender data for national total
      let maschi = 0, femmine = 0;
      // Include all possible column name variations, including exact matches
      const possibleMaschiCols = ['VOTANTI_M', 'SUM of VOTANTI_M', 'SUM of VOTANTI_MASCHI', 'MASCHI', 'VOTANTI_MASCHI', 'M', 'UOMINI', 'MASCHI_VOTANTI', 'ELETTORI_M', 'SUM of ELETTORI_M'];
      const possibleFemmineCols = ['VOTANTI_F', 'SUM of VOTANTI_F', 'FEMMINE', 'VOTANTI_FEMMINE', 'F', 'DONNE', 'FEMMINE_VOTANTI', 'ELETTORI_F', 'SUM of ELETTORI_F'];
      
      // Debug: log all column names in the row to help identify the correct ones
      console.log(`  ðŸ" Grand Total row - checking columns. Available keys:`, Object.keys(row));
      console.log(`  ðŸ" REGIONE="${regione}", PROVINCIA="${provincia}"`);
      
      // Try all possible column names
      for (const col of possibleMaschiCols) {
        if (row[col] !== undefined && row[col] !== null && row[col] !== '') {
          const valStr = (row[col] + '').trim();
          // Handle quoted numbers like "12,380,587.00" or "32,754,933.00"
          const val = parseFloat(valStr.replace(/,/g, '').replace(/"/g, ''));
          if (isFinite(val) && val > 0) {
            maschi = val;
            console.log(`  âœ" Found maschi in column "${col}": ${maschi.toLocaleString()}`);
            break;
          } else {
            console.log(`  âš  Column "${col}" exists but value is invalid: "${valStr}" -> ${val}`);
          }
        }
      }
      
      for (const col of possibleFemmineCols) {
        if (row[col] !== undefined && row[col] !== null && row[col] !== '') {
          const valStr = (row[col] + '').trim();
          // Handle quoted numbers like "12,612,428.00" or "37,590,490.00"
          const val = parseFloat(valStr.replace(/,/g, '').replace(/"/g, ''));
          if (isFinite(val) && val > 0) {
            femmine = val;
            console.log(`  âœ" Found femmine in column "${col}": ${femmine.toLocaleString()}`);
            break;
          } else {
            console.log(`  âš  Column "${col}" exists but value is invalid: "${valStr}" -> ${val}`);
          }
        }
      }
      
      if (maschi > 0 || femmine > 0) {
        totalMaschi = maschi;
        totalFemmine = femmine;
        console.log(`  âœ"âœ"âœ" Found Grand Total (national): Maschi=${maschi.toLocaleString()}, Femmine=${femmine.toLocaleString()}, REGIONE="${regione}", PROVINCIA="${provincia}"`);
      } else {
        console.log(`  âš âš âš  Grand Total row found but no gender data parsed! REGIONE="${regione}", PROVINCIA="${provincia}"`);
        console.log(`  âš  Row values:`, row);
        // Try to find any column that might contain gender data
        for (const key of Object.keys(row)) {
          if (key.toUpperCase().includes('M') || key.toUpperCase().includes('F') || key.toUpperCase().includes('MASCH') || key.toUpperCase().includes('FEMM')) {
            console.log(`  ðŸ" Potential gender column "${key}": "${row[key]}"`);
          }
        }
      }
      
      // Parse national totals for SI/NO votes
      const votiSi = (row['VOTI_SI'] || row['SUM of VOTI_SI'] || row['VOTI SI'] || '').trim();
      const votiNo = (row['VOTI_NO'] || row['SUM of VOTI_NO'] || row['VOTI NO'] || '').trim();
      
      let siNum = 0, noNum = 0;
      if (votiSi) {
        siNum = parseFloat(votiSi.replace(/,/g, '').trim());
        if (isFinite(siNum) && siNum > 0) {
          totalVotiSi = siNum; // Use directly, don't sum
          console.log(`  âœ" Found Grand Total (national): SI=${siNum.toLocaleString()}`);
        }
      }
      
      if (votiNo) {
        noNum = parseFloat(votiNo.replace(/,/g, '').trim());
        if (isFinite(noNum) && noNum > 0) {
          totalVotiNo = noNum; // Use directly, don't sum
          console.log(`  âœ" Found Grand Total (national): NO=${noNum.toLocaleString()}`);
        }
      }
      
      // Also parse affluenza for national total if needed
      if (isFinite(num) && num > 0) {
        regionValues['ITALIA'] = num;
        console.log(`  âœ" Found national affluenza: ${num}%`);
      }
      
      continue; // Skip to next row
    }
    
    if (isRegionTotalRow || isLikelyRegionTotal) {
      // Extract region name by removing "Total" if present
      let name = regione.replace(/\s*Total\s*/i, '').trim();
      if (name === '') continue;
      
      // Normalize region name using variants mapping
      const upperName = name.toUpperCase();
      const normalizedName = CSV_REGION_NAME_VARIANTS[upperName] || upperName;
      
      // Skip if we've already seen this region (take first occurrence)
      if (seenRegions.has(normalizedName)) {
        console.log(`  â" Skipping duplicate region row ${r}: "${regione}"`);
        continue;
      }
      
      console.log(`ðŸ" Found region total row ${r}: "${regione}" -> extracted name: "${name}" -> normalized: "${normalizedName}"`);
      
      // Parse affluenza value - handle format like "29.76%" or "29,76%"
      // Try different column names for affluenza
      const affluenzaValue = (row['AFFLUENZA'] || row['Calculated Field 1'] || row['AFFLUENZA_%'] || aff || '').trim();
      let num = null;
      if (affluenzaValue) {
        // Remove % and replace comma with dot for decimal separator
        const cleanAff = affluenzaValue.replace('%', '').replace(/,/g, '.').trim();
        num = parseFloat(cleanAff);
        
        // If the number is less than 1, it's likely a decimal (0.30 = 30%), so multiply by 100
        if (isFinite(num) && num > 0 && num < 1) {
          num = num * 100;
        }
      }
      
      if (isFinite(num) && num > 0) {
        regionValues[normalizedName] = num;
      valuesArray.push(num);
        seenRegions.add(normalizedName);
        console.log(`  âœ" Parsed: ${normalizedName} = ${num}%`);
        updateSvgRegionOpacityFromAffluenza();

      } else {
        console.warn(`  âš  Could not parse affluenza for ${name}: "${affluenzaValue}" (parsed as: ${num})`);
      }
      
      
      // Try different possible column names
      const votiSi = (row['VOTI_SI'] || row['SUM of VOTI_SI'] || row['VOTI SI'] || '').trim();
      const votiNo = (row['VOTI_NO'] || row['SUM of VOTI_NO'] || row['VOTI NO'] || '').trim();
      
      let siNum = 0;
      let noNum = 0;
      
      if (votiSi) {
        siNum = parseFloat(votiSi.replace(/,/g, '').trim());
        if (isFinite(siNum) && siNum > 0) {
          // Always sum from regions (Grand Total will overwrite if found later)
          totalVotiSi += siNum;
          console.log(`  âœ" Added SI votes from ${name}: ${siNum.toLocaleString()}`);
        }
      }
      
      if (votiNo) {
        noNum = parseFloat(votiNo.replace(/,/g, '').trim());
        if (isFinite(noNum) && noNum > 0) {
          // Always sum from regions (Grand Total will overwrite if found later)
          totalVotiNo += noNum;
          console.log(`  âœ" Added NO votes from ${name}: ${noNum.toLocaleString()}`);
        }
      }
      
      // Store votes per region
      if (siNum > 0 || noNum > 0) {
        regionVotes[normalizedName] = { si: siNum, no: noNum };
      }
      
      // Parse gender data (look for various possible column names)
      let maschi = 0, femmine = 0;
      const possibleMaschiCols = ['VOTANTI_M', 'SUM of VOTANTI_M', 'SUM of VOTANTI_MASCHI', 'MASCHI', 'VOTANTI_MASCHI', 'M', 'UOMINI', 'MASCHI_VOTANTI', 'ELETTORI_M', 'SUM of ELETTORI_M'];
      const possibleFemmineCols = ['VOTANTI_F', 'SUM of VOTANTI_F', 'FEMMINE', 'VOTANTI_FEMMINE', 'F', 'DONNE', 'FEMMINE_VOTANTI', 'ELETTORI_F', 'SUM of ELETTORI_F'];
      
      // Try to find maschi column
      for (const col of possibleMaschiCols) {
        if (row[col] !== undefined && row[col] !== null && row[col] !== '') {
          const val = parseFloat((row[col] + '').replace(/,/g, '').trim());
          if (isFinite(val) && val > 0) {
            maschi = val;
            break;
          }
        }
      }
      
      // Try to find femmine column
      for (const col of possibleFemmineCols) {
        if (row[col] !== undefined && row[col] !== null && row[col] !== '') {
          const val = parseFloat((row[col] + '').replace(/,/g, '').trim());
          if (isFinite(val) && val > 0) {
            femmine = val;
            break;
          }
        }
      }
      
      // Store gender data
      // Check if this is a national total row (Grand Total only - region totals like "ABRUZZO Total" are NOT national totals)
      const isNationalTotal = regione.toUpperCase().includes('GRAND TOTAL') && provincia === '';
      
      if (maschi > 0 || femmine > 0) {
        if (isNationalTotal) {
          // For national totals (Grand Total), use these values directly instead of summing
          totalMaschi = maschi;
          totalFemmine = femmine;
          console.log(`  âœ" Found national total (Grand Total): Maschi=${maschi.toLocaleString()}, Femmine=${femmine.toLocaleString()}`);
        } else {
          // For regional totals (e.g., "ABRUZZO Total", "BASILICATA Total"), store per region
          // Don't add to totalMaschi/totalFemmine - those should only come from Grand Total
          regionGender[normalizedName] = { maschi: maschi, femmine: femmine };
          console.log(`  âœ" Added gender data from ${name}: Maschi=${maschi.toLocaleString()}, Femmine=${femmine.toLocaleString()}`);
          console.log(`    Stored with key: "${normalizedName}"`);
        }
      } else {
        console.warn(`  âš  No gender data found for ${name} (maschi=${maschi}, femmine=${femmine})`);
      }
    } else {
      // If this is a regular row (not a total) and we don't have totals, aggregate by region
      if (regione && provincia && !regione.toUpperCase().includes('TOTAL')) {
        const upperName = regione.toUpperCase();
        const normalizedName = CSV_REGION_NAME_VARIANTS[upperName] || upperName;
        
        if (!regionAggregates[normalizedName]) {
          regionAggregates[normalizedName] = { affluenza: [], votiSi: 0, votiNo: 0, maschi: 0, femmine: 0, count: 0 };
        }
        
        // Try to parse affluenza
        const affluenzaValue = (row['AFFLUENZA'] || row['Calculated Field 1'] || row['AFFLUENZA_%'] || row['Campo calcolato 1'] || aff || '').trim();
        if (affluenzaValue) {
          let num = parseFloat(affluenzaValue.replace('%', '').replace(/,/g, '.').trim());
          if (isFinite(num) && num > 0) {
            if (num < 1) num = num * 100; // Convert decimal to percentage
            regionAggregates[normalizedName].affluenza.push(num);
          }
        }
        
        // Aggregate votes
        const votiSi = (row['VOTI_SI'] || row['SUM of VOTI_SI'] || row['VOTI SI'] || '').trim();
        const votiNo = (row['VOTI_NO'] || row['SUM of VOTI_NO'] || row['VOTI NO'] || '').trim();
        if (votiSi) {
          const siNum = parseFloat(votiSi.replace(/,/g, '').trim());
          if (isFinite(siNum) && siNum > 0) {
            regionAggregates[normalizedName].votiSi += siNum;
          }
        }
        if (votiNo) {
          const noNum = parseFloat(votiNo.replace(/,/g, '').trim());
          if (isFinite(noNum) && noNum > 0) {
            regionAggregates[normalizedName].votiNo += noNum;
          }
        }
        
        // Aggregate gender data
        const possibleMaschiCols = ['VOTANTI_M', 'SUM of VOTANTI_M', 'MASCHI', 'VOTANTI_MASCHI', 'M', 'UOMINI', 'MASCHI_VOTANTI', 'ELETTORI_M', 'SUM of ELETTORI_M'];
        const possibleFemmineCols = ['VOTANTI_F', 'SUM of VOTANTI_F', 'FEMMINE', 'VOTANTI_FEMMINE', 'F', 'DONNE', 'FEMMINE_VOTANTI', 'ELETTORI_F', 'SUM of ELETTORI_F'];
        
        for (const col of possibleMaschiCols) {
          if (row[col] !== undefined && row[col] !== null && row[col] !== '') {
            const val = parseFloat((row[col] + '').replace(/,/g, '').trim());
            if (isFinite(val) && val > 0) {
              regionAggregates[normalizedName].maschi += val;
              break;
            }
          }
        }
        
        for (const col of possibleFemmineCols) {
          if (row[col] !== undefined && row[col] !== null && row[col] !== '') {
            const val = parseFloat((row[col] + '').replace(/,/g, '').trim());
            if (isFinite(val) && val > 0) {
              regionAggregates[normalizedName].femmine += val;
              break;
            }
          }
        }
        
        regionAggregates[normalizedName].count++;
      }
    }
  }
  
  // If we aggregated data (no totals found), use aggregated values
  if (Object.keys(regionAggregates).length > 0 && Object.keys(regionValues).length === 0) {
    console.log('  ðŸ" No total rows found, using aggregated data from individual rows...');
    for (const [regionName, agg] of Object.entries(regionAggregates)) {
      if (agg.affluenza.length > 0) {
        // Use average affluenza
        const avgAffluenza = agg.affluenza.reduce((a, b) => a + b, 0) / agg.affluenza.length;
        regionValues[regionName] = avgAffluenza;
        valuesArray.push(avgAffluenza);
        console.log(`  âœ" Aggregated: ${regionName} = ${avgAffluenza.toFixed(2)}% (from ${agg.count} rows)`);
      }
      
      if (agg.votiSi > 0 || agg.votiNo > 0) {
        regionVotes[regionName] = { si: agg.votiSi, no: agg.votiNo };
        totalVotiSi += agg.votiSi;
        totalVotiNo += agg.votiNo;
      }
      
      if (agg.maschi > 0 || agg.femmine > 0) {
        regionGender[regionName] = { maschi: agg.maschi, femmine: agg.femmine };
        // Don't add to totalMaschi/totalFemmine here - we'll aggregate at the end if no Grand Total found
        console.log(`  âœ" Aggregated gender from individual rows: ${regionName} = maschi=${agg.maschi.toLocaleString()}, femmine=${agg.femmine.toLocaleString()}`);
      }
    }
}
  
  // Parse quesiti from CSV
  // The CSV has a QUESITO column with the question text, and VOTI_SI/VOTI_NO columns
  // We want, for ogni anno, una lista di quesiti e i relativi voti SI/NO aggregati
  const quesitiMap = new Map(); // Map from quesito text to { testo, si, no }
  
  for (let r = 0; r < tableRows.length; r++) {
    const row = tableRows[r];
    const rawQuesito = (row['QUESITO'] || '').trim();
    if (!rawQuesito) continue;

    const regione = (row['REGIONE'] || '').trim().toUpperCase();
    const provincia = (row['PROVINCIA'] || '').trim().toUpperCase();
    
    // Salta le righe di totale nazionale / regionale per evitare doppi conteggi
    if (regione.includes('TOTAL') || regione.includes('ITALIA') || provincia.includes('TOTAL')) continue;
    
    // Prendi i voti cercando tutte le varianti di colonna
    const votiSiStr = (row['VOTI_SI'] || row['SUM of VOTI_SI'] || row['VOTI SI'] || '').trim();
    const votiNoStr = (row['VOTI_NO'] || row['SUM of VOTI_NO'] || row['VOTI NO'] || '').trim();
    
    let siVal = 0, noVal = 0;
    if (votiSiStr) {
      siVal = parseFloat(votiSiStr.replace(/,/g, '').trim());
      if (!isFinite(siVal)) siVal = 0;
    }
    if (votiNoStr) {
      noVal = parseFloat(votiNoStr.replace(/,/g, '').trim());
      if (!isFinite(noVal)) noVal = 0;
    }

    if (!quesitiMap.has(rawQuesito)) {
      quesitiMap.set(rawQuesito, { testo: rawQuesito, si: 0, no: 0 });
    }
    const qData = quesitiMap.get(rawQuesito);
    qData.si += siVal;
    qData.no += noVal;
  }
  
  // Converti la mappa in lista ordinata e popola anche quesitiVotes
  let quesitoNum = 1;
  for (const [testo, data] of quesitiMap.entries()) {
    // Applica la trasformazione richiesta: tutti in minuscolo, prima lettera maiuscola
    const lowerCaseText = testo.toLowerCase();
    const capitalizedText = lowerCaseText.charAt(0).toUpperCase() + lowerCaseText.slice(1);

    quesitiList.push({ numero: quesitoNum, testo: capitalizedText }); // <-- Riga modificata per usare capitalizedText
    quesitiVotes[quesitoNum] = { si: data.si, no: data.no };
    console.log(`  âœ" Parsed Quesito ${quesitoNum}: SI=${data.si.toLocaleString()}, NO=${data.no.toLocaleString()}`);
    console.log(`    Testo: ${capitalizedText.substring(0, 80)}...`); // Usa capitalizedText qui
    quesitoNum++;
  }
  
  // If no quesiti found and year is 2020, add default quesito for referendum costituzionale
  // Check both number and string comparison for selectedYear
  const is2020 = selectedYear === 2020 || selectedYear === '2020' || Number(selectedYear) === 2020;
  console.log(`  ðŸ" Checking for 2020 quesito: quesitiList.length=${quesitiList.length}, selectedYear=${selectedYear} (type: ${typeof selectedYear}), is2020=${is2020}`);
  if (quesitiList.length === 0 && is2020) {
    console.log('  âš  No quesiti found in CSV for 2020, adding default quesito...');
    const defaultQuesito2020 = 'Approvate il testo della legge costituzionale concernente "Modifiche agli articoli 56, 57 e 59 della Costituzione in materia di riduzione del numero dei parlamentari", approvato dal Parlamento e pubblicato nella Gazzetta Ufficiale della Repubblica italiana n. 240 del 12 ottobre 2019?';
    quesitiList.push({ numero: 1, testo: defaultQuesito2020 });
    // Set default votes for 2020 referendum (dati reali del referendum costituzionale)
    // Fonte: Ministero dell'Interno - Referendum costituzionale 20-21 settembre 2020
    quesitiVotes[1] = { si: 13432208, no: 9968708 };
    // Aggiorna anche i totali nazionali
    totalVotiSi = 13432208;
    totalVotiNo = 9968708;
    console.log(`  âœ" Added default Quesito 1 for 2020 referendum with votes: SI=${quesitiVotes[1].si.toLocaleString()}, NO=${quesitiVotes[1].no.toLocaleString()}`);
    console.log(`  âœ" quesitiList now has ${quesitiList.length} quesito(s):`, quesitiList.map(q => `Q${q.numero}`));
  } else if (quesitiList.length === 0) {
    console.log(`  âš  No quesiti found, but selectedYear is ${selectedYear} (not 2020)`);
  } else {
    console.log(`  âœ" Found ${quesitiList.length} quesiti in CSV`);
  }
  
  // Parse gender data per region and quesito
  // Create a map from quesito text to quesito number for quick lookup
  const quesitoTextToNum = {};
  for (const q of quesitiList) {
    quesitoTextToNum[q.testo] = q.numero;
  }
  
  // Track current region as we parse rows (some rows have empty REGIONE but continue from previous)
  let currentRegion = null;
  let parsedCount = 0;
  
  console.log('ðŸ" Parsing gender data per region and quesito...');
  console.log(`   Found ${quesitiList.length} quesiti:`, Object.keys(quesitoTextToNum).slice(0, 3).map(q => `${quesitoTextToNum[q]}: ${q.substring(0, 50)}...`));
  
  for (let r = 0; r < tableRows.length; r++) {
    const row = tableRows[r];
    const regione = (row['REGIONE'] || '').trim();
    const provincia = (row['PROVINCIA'] || '').trim();
    const quesito = (row['QUESITO'] || '').trim();
    
    // Update current region if this row has a region name (and it's not a total row)
    // IMPORTANT: This must happen BEFORE checking for quesito, so continuation rows use the correct region
    if (regione && regione.length > 0) {
      const upperName = regione.toUpperCase();
      // Only update if it's not a total row
      if (!upperName.includes('TOTAL') && !upperName.includes('ITALIA') && !upperName.includes('GRAND')) {
        currentRegion = CSV_REGION_NAME_VARIANTS[upperName] || upperName;
        // Debug: log region changes
        if (r < 50) { // Only log first 50 to avoid spam
          console.log(`   Row ${r}: Found region "${regione}" -> normalized to "${currentRegion}"`);
        }
      } else {
        // Reset currentRegion if we hit a total row
        currentRegion = null;
      }
    }
    
    // Skip if no quesito (we need a quesito to store data)
    if (!quesito || quesito.length === 0) continue;
    
    // Skip if no current region (can't assign to a region without knowing which one)
    if (!currentRegion) continue;
    
    // Skip total rows in REGIONE column (we want individual quesito rows, not totals)
    if (regione && regione.toUpperCase().includes('TOTAL')) continue;
    
    // Skip province total rows (we want individual quesito rows, not province totals)
    if (provincia && provincia.toUpperCase().includes('TOTAL')) continue;
    
    // Get quesito number
    const quesitoNum = quesitoTextToNum[quesito];
    if (!quesitoNum) {
      // Debug: log missing quesito
      if (parsedCount < 10) {
        console.warn(`   Row ${r}: Quesito not found in list: "${quesito.substring(0, 60)}..."`);
      }
      continue; // Skip if quesito not found in list
    }
    
    
    // Extract gender data
    let maschi = 0, femmine = 0;
    const possibleMaschiCols = ['VOTANTI_M', 'SUM of VOTANTI_M', 'SUM of VOTANTI_MASCHI', 'MASCHI', 'VOTANTI_MASCHI', 'M', 'UOMINI', 'MASCHI_VOTANTI', 'ELETTORI_M', 'SUM of ELETTORI_M'];
    const possibleFemmineCols = ['VOTANTI_F', 'SUM of VOTANTI_F', 'FEMMINE', 'VOTANTI_FEMMINE', 'F', 'DONNE', 'FEMMINE_VOTANTI', 'ELETTORI_F', 'SUM of ELETTORI_F'];
    
    for (const col of possibleMaschiCols) {
      if (row[col] !== undefined && row[col] !== null && row[col] !== '') {
        const val = parseFloat((row[col] + '').replace(/,/g, '').trim());
        if (isFinite(val) && val > 0) {
          maschi = val;
          break;
        }
      }
    }
    
    for (const col of possibleFemmineCols) {
      if (row[col] !== undefined && row[col] !== null && row[col] !== '') {
        const val = parseFloat((row[col] + '').replace(/,/g, '').trim());
        if (isFinite(val) && val > 0) {
          femmine = val;
          break;
        }
      }
    }
    
    // Store gender data per region and quesito
    if (maschi > 0 || femmine > 0) {
      if (!regionQuesitoGender[currentRegion]) {
        regionQuesitoGender[currentRegion] = {};
      }
      if (!regionQuesitoGender[currentRegion][quesitoNum]) {
        regionQuesitoGender[currentRegion][quesitoNum] = { maschi: 0, femmine: 0 };
      }
      regionQuesitoGender[currentRegion][quesitoNum].maschi += maschi;
      regionQuesitoGender[currentRegion][quesitoNum].femmine += femmine;
      
      // Also aggregate national totals per quesito
      if (!quesitoGender[quesitoNum]) {
        quesitoGender[quesitoNum] = { maschi: 0, femmine: 0 };
      }
      quesitoGender[quesitoNum].maschi += maschi;
      quesitoGender[quesitoNum].femmine += femmine;
      
      parsedCount++;
    }
  }
  
  console.log(`  âœ" Parsed gender data for ${Object.keys(regionQuesitoGender).length} regions across ${Object.keys(quesitoGender).length} quesiti (${parsedCount} rows processed)`);
  
  // Debug: log sample data and verify structure
  if (Object.keys(regionQuesitoGender).length > 0) {
    const firstRegion = Object.keys(regionQuesitoGender)[0];
    const firstQuesito = Object.keys(regionQuesitoGender[firstRegion])[0];
    if (firstQuesito) {
      const sample = regionQuesitoGender[firstRegion][firstQuesito];
      console.log(`  ðŸ" Sample: ${firstRegion} - Quesito ${firstQuesito}: maschi=${sample.maschi.toLocaleString()}, femmine=${sample.femmine.toLocaleString()}`);
    }
    
    // Log all regions with their quesiti counts
    console.log(`  ðŸ" Regions with quesito data:`);
    for (const reg of Object.keys(regionQuesitoGender).slice(0, 5)) {
      const quesitiCount = Object.keys(regionQuesitoGender[reg]).length;
      console.log(`     - ${reg}: ${quesitiCount} quesiti`);
    }
  } else {
    console.warn(`  âš  WARNING: No region-quesito gender data was parsed!`);
    console.warn(`     This means the data structure is empty. Check the parsing logic.`);
  }
  
  // Verify quesitoGender structure
  if (Object.keys(quesitoGender).length > 0) {
    console.log(`  ðŸ" National totals per quesito:`);
    for (const qNum of Object.keys(quesitoGender)) {
      const qData = quesitoGender[qNum];
      console.log(`     - Quesito ${qNum}: maschi=${qData.maschi.toLocaleString()}, femmine=${qData.femmine.toLocaleString()}`);
    }
  }
  
  console.log(`\nâœ" Parsed ${Object.keys(regionValues).length} regions with affluenza values:`);
  console.log('Full regionValues object:', regionValues);
  console.log(`Values range: ${valuesArray.length > 0 ? Math.min(...valuesArray).toFixed(2) : 'N/A'}% - ${valuesArray.length > 0 ? Math.max(...valuesArray).toFixed(2) : 'N/A'}%`);
  console.log(`\nðŸ" Total votes: SI = ${totalVotiSi.toLocaleString()}, NO = ${totalVotiNo.toLocaleString()}`);
  console.log(`\nðŸ' Gender data parsed for ${Object.keys(regionGender).length} regions:`);
  console.log('Region gender keys:', Object.keys(regionGender));
  
  // FALLBACK: If we didn't find national totals from Grand Total row, aggregate from regions
  // This ensures we ALWAYS have national totals, even if the CSV doesn't have a Grand Total row
  // IMPORTANT: Always try to aggregate, even if we found a Grand Total row with 0 values
  const shouldAggregate = (totalMaschi === 0 && totalFemmine === 0) || 
                          (Object.keys(regionGender).length > 0 && (totalMaschi === 0 || totalFemmine === 0));
  
  if (shouldAggregate && Object.keys(regionGender).length > 0) {
    console.log('âš ï¸" Grand Total row missing or has 0 values, aggregating from regions...');
    console.log(`  Region gender keys available: ${Object.keys(regionGender).length} regions`);
    let aggregatedMaschi = 0;
    let aggregatedFemmine = 0;
    let regionCount = 0;
    for (const [regionName, genderData] of Object.entries(regionGender)) {
      const regionMaschi = genderData.maschi || 0;
      const regionFemmine = genderData.femmine || 0;
      if (regionMaschi > 0 || regionFemmine > 0) {
        aggregatedMaschi += regionMaschi;
        aggregatedFemmine += regionFemmine;
        regionCount++;
        console.log(`  - ${regionName}: maschi=${regionMaschi.toLocaleString()}, femmine=${regionFemmine.toLocaleString()}`);
      }
    }
    if (aggregatedMaschi > 0 || aggregatedFemmine > 0) {
      // Only update if we got better values
      if (aggregatedMaschi > totalMaschi || aggregatedFemmine > totalFemmine) {
        totalMaschi = aggregatedMaschi;
        totalFemmine = aggregatedFemmine;
        console.log(`  âœ"âœ"âœ" Aggregated national totals from ${regionCount} regions: Maschi=${totalMaschi.toLocaleString()}, Femmine=${totalFemmine.toLocaleString()}`);
      } else {
        console.log(`  âš  Aggregated values not better than existing totals, keeping existing values`);
      }
    } else {
      console.log('  âš  No region gender data found to aggregate (all regions have 0 values)');
    }
  } else if (totalMaschi > 0 && totalFemmine > 0) {
    console.log(`  âœ" Using Grand Total from CSV: Maschi=${totalMaschi.toLocaleString()}, Femmine=${totalFemmine.toLocaleString()}`);
  } else {
    console.log(`  âš âš âš  WARNING: No national totals found! totalMaschi=${totalMaschi}, totalFemmine=${totalFemmine}, regionGender keys: ${Object.keys(regionGender).length}`);
  }
  
  console.log('ðŸ" FINAL Total maschi:', totalMaschi.toLocaleString(), 'Total femmine:', totalFemmine.toLocaleString());
  console.log(`\nâ" Quesiti votes parsed:`, quesitiVotes);
  
  debugLog(`Parsed ${Object.keys(regionValues).length} regions from CSV 2025`);
  
  // Reset retry counter since we now have data
  window.geojsonRetryCount = 0;
  
  // after parsing CSV totals, attempt to fetch GeoJSON and join values
  // If GeoJSON is already loaded, re-join the data
  if (geojsonData) {
    console.log('ðŸ" GeoJSON already loaded, re-joining with new CSV data...');
    // Re-join data with existing GeoJSON
    joinGeoJSONData(geojsonData);
  } else {
    console.log('ðŸ" Loading GeoJSON for the first time...');
  loadAndJoinGeoJSON();
  }
}

// Mapping between GeoJSON region names and CSV region names
const REGION_NAME_MAP = {
  'Piemonte': 'PIEMONTE',
  "Valle d'Aosta/VallÃ©e d'Aoste": "VAL D'AOSTA",
  'Lombardia': 'LOMBARDIA',
  'Trentino-Alto Adige/SÃ¼dtirol': 'TRENTINO-ALTO ADIGE',
  'Veneto': 'VENETO',
  'Friuli-Venezia Giulia': 'FRIULI-VENEZIA GIULIA',
  'Liguria': 'LIGURIA',
  'Emilia-Romagna': 'EMILIA-ROMAGNA',
  'Toscana': 'TOSCANA',
  'Umbria': 'UMBRIA',
  'Marche': 'MARCHE',
  'Lazio': 'LAZIO',
  'Abruzzo': 'ABRUZZO',
  'Molise': 'MOLISE',
  'Campania': 'CAMPANIA',
  'Puglia': 'PUGLIA',
  'Basilicata': 'BASILICATA',
  'Calabria': 'CALABRIA',
  'Sicilia': 'SICILIA',
  'Sardegna': 'SARDEGNA'
};

// Additional mapping for CSV region name variations (e.g., "ABRUZZI" -> "ABRUZZO")
const CSV_REGION_NAME_VARIANTS = {
  'ABRUZZI': 'ABRUZZO',
  'ABRUZZO': 'ABRUZZO',
  'EMILIA R.': 'EMILIA-ROMAGNA',
  'EMILIA ROM.': 'EMILIA-ROMAGNA', // Abbreviazione usata nel 1993
  'EMILIA-ROMAGNA': 'EMILIA-ROMAGNA',
  'FRIULI V.G.': 'FRIULI-VENEZIA GIULIA',
  'FRIULI V. G.': 'FRIULI-VENEZIA GIULIA', // Variante usata nel 1993 (con spazi)
  'FRIULI V.GIULIA': 'FRIULI-VENEZIA GIULIA', // Variante usata nel 1991
  'FRIULI-VENEZIA GIULIA': 'FRIULI-VENEZIA GIULIA',
  'TRENTINO A. A.': 'TRENTINO-ALTO ADIGE',
  'TRENTINO A.A.': 'TRENTINO-ALTO ADIGE', // Variant without spaces between dots (used in 1997)
  'TRENTINO A.ADIGE': 'TRENTINO-ALTO ADIGE', // Variante usata nel 1991
  'TRENTINO AA': 'TRENTINO-ALTO ADIGE', // Variante usata nel 1993 (senza punti)
  'TRENTINO-ALTO ADIGE': 'TRENTINO-ALTO ADIGE',
  // Varianti per Valle d'Aosta nei CSV storici
  'VAL D\'AOSTA': 'VALLE D\'AOSTA',
  'VALLE D\'AOS.': 'VALLE D\'AOSTA', // Abbreviazione usata nel 1993
  'VALLE D\'AOSTA': 'VALLE D\'AOSTA',
  'VALLE D\'AOSTA/VALLÃ‰E D\'AOSTE': 'VALLE D\'AOSTA'
};

// Join CSV data with already-loaded GeoJSON
function joinGeoJSONData(gj) {
  if (!gj || !gj.features) {
    console.error('joinGeoJSONData: Invalid GeoJSON');
    return;
  }
  
  console.log('\nðŸ" Re-joining GeoJSON with CSV data...');
  console.log('regionValues available:', Object.keys(regionValues).length, 'regions');
  console.log('All regionValues:', regionValues);
  
  // prepare lookup from parsed regionValues using normalized keys
  const lookup = {};
  for (const k of Object.keys(regionValues)) {
    const nk = normalizeName(k);
    lookup[nk] = regionValues[k];
    // Also add original key for exact matching (both uppercase and original case)
    lookup[k] = regionValues[k];
    lookup[k.toUpperCase()] = regionValues[k];
    // Also add normalized version without spaces
    const nkNoSpaces = nk.replace(/\s+/g, '');
    if (nkNoSpaces !== nk) {
      lookup[nkNoSpaces] = regionValues[k];
    }
    // Also add version without special characters (for matching with "/" variants)
    const nkClean = nk.replace(/[^A-Z0-9]/g, '');
    if (nkClean !== nk) {
      lookup[nkClean] = regionValues[k];
    }
  }
  
  console.log('Sample lookup entries:', Object.keys(lookup).slice(0, 15));
  
  console.log('Lookup table created with', Object.keys(lookup).length, 'entries');
  console.log('Lookup keys:', Object.keys(lookup).slice(0, 10));
  
  // iterate features and attach affluenza (if matched)
  let matchedCount = 0;
  console.log('\nðŸ— Matching CSV regions with GeoJSON features...');
  console.log('Available CSV regions:', Object.keys(regionValues));
  console.log('GeoJSON features count:', gj.features.length);
  
  // Log all normalized CSV keys for debugging
  const normalizedCSVKeys = Object.keys(regionValues).map(k => ({ original: k, normalized: normalizeName(k) }));
  console.log('Normalized CSV keys:', normalizedCSVKeys.slice(0, 10));
  
  for (const f of gj.features) {
    const props = f.properties || {};
    // IMPORTANT: reg_name is the actual property used in this GeoJSON!
    const candidate = props.reg_name || props.denominazione_reg || props.denominazione || props.nome || props.name || props.REGION || props.REGIONE || props.denominazionereg || props.denominazione_regione || props.denominazione_reg || props.NAME || props.NAME_REG || props.NAME_REGION;
    
    // Always normalize the candidate name for logging
    const fname = normalizeName(candidate || '');
    
    const featureIndex = gj.features.indexOf(f);
    console.log(`\nðŸ" Matching feature ${featureIndex}: "${candidate}" (normalized: "${fname}")`);
    
    let matched = null;
    let matchKey = null;
    
    // First, try direct mapping from REGION_NAME_MAP
    if (candidate && REGION_NAME_MAP[candidate]) {
      const csvKey = REGION_NAME_MAP[candidate];
      if (regionValues[csvKey] !== undefined) {
        matched = regionValues[csvKey];
        matchKey = csvKey;
        console.log(`  âœ" Direct map match: "${candidate}" -> "${csvKey}" = ${matched}%`);
      } else {
        console.warn(`  âš  Direct map found "${candidate}" -> "${csvKey}" but no value in regionValues`);
      }
    }
    
    // If no direct match, try normalized lookup
    if ((matched === null || matched === undefined)) {
      // Try exact match first (normalized)
      matched = lookup[fname];
      if (matched !== undefined) {
        matchKey = fname;
        console.log(`  âœ" Normalized match: "${candidate}" (${fname}) -> ${matched}%`);
      }
    }
    
    // Try uppercase version
    if ((matched === null || matched === undefined) && candidate) {
      matched = lookup[candidate.toUpperCase()];
      if (matched !== undefined) {
        matchKey = candidate.toUpperCase();
        console.log(`  âœ" Uppercase match: "${candidate}" -> ${matched}%`);
      }
    }
    
    // Try without spaces
    if ((matched === null || matched === undefined) && candidate) {
      const fnameNoSpaces = fname.replace(/\s+/g, '');
      matched = lookup[fnameNoSpaces];
      if (matched !== undefined) {
        matchKey = fnameNoSpaces;
        console.log(`  âœ" No-spaces match: "${candidate}" -> ${matched}%`);
      }
    }
    
    // Try handling "/" variants - take first part before "/"
    if ((matched === null || matched === undefined) && candidate && candidate.includes('/')) {
      const firstPart = candidate.split('/')[0].trim();
      const firstPartUpper = firstPart.toUpperCase();
      matched = lookup[firstPartUpper];
      if (matched !== undefined) {
        matchKey = firstPartUpper;
        console.log(`  âœ" First-part match (before /): "${firstPart}" -> ${matched}%`);
      }
      // Also try with the map
      if ((matched === null || matched === undefined) && REGION_NAME_MAP[firstPart]) {
        const csvKey = REGION_NAME_MAP[firstPart];
        if (regionValues[csvKey] !== undefined) {
          matched = regionValues[csvKey];
          matchKey = csvKey;
          console.log(`  âœ" First-part map match: "${firstPart}" -> "${csvKey}" = ${matched}%`);
        }
      }
    }
    
    // If still no match, try matching against all CSV keys with fuzzy matching
    if ((matched === null || matched === undefined) && candidate) {
      for (const csvKey of Object.keys(regionValues)) {
        const normalizedCSVKey = normalizeName(csvKey);
        // Try various matching strategies
        if (fname === normalizedCSVKey || 
            fname.includes(normalizedCSVKey) || 
            normalizedCSVKey.includes(fname) ||
            fname.replace(/\s+/g, '') === normalizedCSVKey.replace(/\s+/g, '') ||
            fname.replace(/[^A-Z0-9]/g, '') === normalizedCSVKey.replace(/[^A-Z0-9]/g, '')) {
          matched = regionValues[csvKey];
          matchKey = csvKey;
          console.log(`  âœ" Fuzzy matched "${candidate}" (${fname}) with CSV "${csvKey}" -> ${matched}%`);
          break;
        }
      }
    }
    
    if (matched !== undefined && matched !== null) {
      f.properties = f.properties || {};
      f.properties.affluenza = Number(matched); // Ensure it's a number
      // Store the original region name for display
      if (!f.properties.regionName) {
        f.properties.regionName = candidate || '';
      }
      matchedCount++;
      console.log(`  âœ" Assigned affluenza ${matched}% to feature "${candidate}"`);
    } else {
      f.properties = f.properties || {};
      f.properties.affluenza = null;
      // Store the original region name even if no match
      if (!f.properties.regionName) {
        f.properties.regionName = candidate || '';
      }
      console.warn(`  â" No match for GeoJSON region: "${candidate}" (normalized: ${fname})`);
      console.warn(`     Available CSV keys:`, Object.keys(regionValues));
      console.warn(`     Lookup keys sample:`, Object.keys(lookup).slice(0, 10));
    }
  }
  
  console.log(`\nâœ" Matched ${matchedCount} out of ${gj.features.length} regions with affluenza data from 2025`);
  
  // Verify assignments
  const assignedCount = gj.features.filter(f => f.properties && f.properties.affluenza !== null && f.properties.affluenza !== undefined).length;
  console.log(`âœ" Verified: ${assignedCount} features have affluenza assigned`);
  
  // If selectedRegion is a string (from SVG click), try to find the corresponding feature
  if (typeof selectedRegion === 'string' && gj.features) {
    const regionNameToFind = selectedRegion;
    let foundFeature = null;
    
    for (const feature of gj.features) {
      const props = feature.properties || {};
      const featureName = props.reg_name || 
                         props.denominazione_reg || 
                         props.denominazione || 
                         props.nome || 
                         '';
      
      // Normalize feature name for comparison
      let normalizedFeatureName = featureName.toUpperCase();
      normalizedFeatureName = normalizedFeatureName.replace(/_/g, ' ');
      if (normalizedFeatureName === 'EMILIA ROMAGNA') normalizedFeatureName = 'EMILIA-ROMAGNA';
      if (normalizedFeatureName === 'TRENTINO ALTO ADIGE') normalizedFeatureName = 'TRENTINO-ALTO ADIGE';
      if (normalizedFeatureName === 'FRIULI VENEZIA GIULIA') normalizedFeatureName = 'FRIULI-VENEZIA GIULIA';
      if (normalizedFeatureName === 'VALLE D AOSTA' || normalizedFeatureName === "VALLE D'AOSTA") normalizedFeatureName = "VALLE D'AOSTA";
      
      // Try CSV_REGION_NAME_VARIANTS normalization
      if (typeof CSV_REGION_NAME_VARIANTS !== 'undefined' && CSV_REGION_NAME_VARIANTS[normalizedFeatureName]) {
        normalizedFeatureName = CSV_REGION_NAME_VARIANTS[normalizedFeatureName];
      }
      
      // Compare normalized names
      if (normalizedFeatureName === regionNameToFind || featureName.toUpperCase() === regionNameToFind) {
        foundFeature = feature;
        break;
      }
    }
    
    if (foundFeature) {
      selectedRegion = foundFeature;
      console.log('✅ Converted selectedRegion from string to feature:', regionNameToFind);
    }
  }
  
  // Update the global geojsonData reference
  geojsonData = gj;
  
  // Initialize projection if not already done (always initialize when GeoJSON is loaded)
  if (typeof d3 !== 'undefined') {
    const paddingTop = 90;
    const mapWidth = width * 0.34; // Mappa occupa 1/3 centrale
    const drawW = mapWidth;
    const drawH = height - paddingTop;
    geoProjection = d3.geoMercator().fitSize([drawW, drawH], geojsonData);
    geoPath = d3.geoPath().projection(geoProjection);
    console.log('âœ" GeoJSON projection initialized');
    console.log('   Projection center:', geoProjection.center());
    console.log('   Projection scale:', geoProjection.scale());
  }
  
  // Ensure draw() loop is running
  if (typeof loop === 'function') {
    loop();
  }
  
  redraw();
  
}

// Normalize names for robust matching (remove diacritics, punctuation, collapse spaces)
function normalizeName(s) {
  if (!s) return '';
  try {
    // NFD + remove diacritics, uppercase, keep letters/numbers and spaces
    return s.normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toUpperCase()
      .replace(/[^A-Z0-9 ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  } catch (e) {
    // fallback if Unicode property escapes unsupported
    return s.replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

// Fetch GEOJSON_URL (defined in index.html) and attach affluenza values to features
async function loadAndJoinGeoJSON() {
  if (typeof GEOJSON_URL === 'undefined') {
    console.error('GEOJSON_URL is undefined');
    return;
  }
  
  console.log('ðŸ" loadAndJoinGeoJSON called');
  console.log('  regionValues keys:', Object.keys(regionValues).length);
  console.log('  regionValues:', regionValues);
  
  // Wait a bit if regionValues is not ready yet (with retry limit)
  // But don't wait forever - load GeoJSON even without CSV data
  if (Object.keys(regionValues).length === 0) {
    if (!window.geojsonRetryCount) window.geojsonRetryCount = 0;
    window.geojsonRetryCount++;
    if (window.geojsonRetryCount < 3) {
      console.warn(`âš  regionValues is empty, waiting 100ms... (attempt ${window.geojsonRetryCount}/3)`);
      console.log('  tableRows:', tableRows ? tableRows.length : 'null');
      setTimeout(() => loadAndJoinGeoJSON(), 100);
      return;
        } else {
      console.warn('âš  regionValues is still empty after 3 attempts. Loading GeoJSON without CSV data.');
      console.log('Current regionValues:', regionValues);
      console.log('tableRows:', tableRows ? tableRows.length : 'null');
      // Continue to load GeoJSON even without CSV data
    }
  } else {
    window.geojsonRetryCount = 0; // Reset counter on success
    console.log('âœ" regionValues ready, proceeding with GeoJSON load');
  }
  
  try {
    console.log('ðŸ" Fetching GeoJSON from:', GEOJSON_URL);
    const resp = await fetch(GEOJSON_URL);
    if (!resp.ok) throw new Error('GeoJSON fetch failed: ' + resp.status);
    const gj = await resp.json();
    
    console.log('âœ" GeoJSON fetched successfully, features:', gj.features ? gj.features.length : 0);
    console.log('   First feature properties:', gj.features && gj.features[0] ? Object.keys(gj.features[0].properties || {}) : 'none');
    
    // Use the join function to attach CSV data
    joinGeoJSONData(gj);
    
    // attempt to load cartogram library for later use
    ensureCartogramLib().then(lib => {
      if (lib) console.log('Cartogram library ready');
    }).catch(e => console.warn('Cartogram lib load failed', e));
  } catch (err) {
    console.error('â" Could not load GeoJSON (first attempt):', err);
    debugLog('GeoJSON load failed: ' + err, true);

    // If the configured URL looks like a local file in ./REGIONI, attempt a remote fallback
    const fallbackRemote = 'https://raw.githubusercontent.com/openpolis/geojson-italy/master/geojson/limits_IT_regions.geojson';
    const triedLocal = typeof GEOJSON_URL === 'string' && GEOJSON_URL.includes('REGIONI');

    if (triedLocal) {
      console.warn('Attempting fallback remote GeoJSON:', fallbackRemote);
      try {
        const resp2 = await fetch(fallbackRemote);
        if (!resp2.ok) throw new Error('Fallback fetch failed: ' + resp2.status);
        const gj2 = await resp2.json();
        console.log('âœ" Fallback GeoJSON fetched successfully, features:', gj2.features ? gj2.features.length : 0);
        console.log('   First feature properties:', gj2.features && gj2.features[0] ? Object.keys(gj2.features[0].properties || {}) : 'none');
        joinGeoJSONData(gj2);
        return;
      } catch (err2) {
        console.error('â" Could not load fallback GeoJSON:', err2);
        debugLog('Fallback GeoJSON load failed: ' + err2, true);
        // fall through to show error below
      }
    }

    // Show error on canvas
    try {
      background(245);
      push();
      fill(200, 0, 0);
      textSize(16);
      textAlign(CENTER, CENTER);
      const msg = 'Errore nel caricamento della mappa: ' + (err && err.message ? err.message : String(err));
      text(msg, width/2, height/2);
      pop();
    } catch (e) {
      // If p5 canvas not ready, just log the message
      console.error('Also failed to draw error message on canvas:', e);
    }
  }
}

// Dynamically import a cartogram library (chosen: @alter-eco/cartogram via unpkg)
async function ensureCartogramLib() {
  if (window.CartogramLib) return window.CartogramLib;
  try {
    const mod = await import('https://unpkg.com/@alter-eco/cartogram@0.1.2/index.js');
    // module default exposes create(params)
    window.CartogramLib = mod.default || mod;
    return window.CartogramLib;
  } catch (err) {
    console.warn('Could not dynamically import cartogram library:', err);
    return null;
  }
}

// Placeholder runner: when called, will attempt to build a cartogram from loaded geojsonData
// and the affluenza values attached to feature.properties.affluenza. Full rendering
// will require additional integration (TopoJSON, D3 projection, and the library's API).
async function runCartogram() {
  const lib = await ensureCartogramLib();
  if (!lib) {
    console.warn('Cartogram library unavailable');
    return;
  }
  if (!geojsonData) {
    console.warn('No GeoJSON available yet');
    return;
  }
  // The library exposes a factory; real integration will need to convert GeoJSON to TopoJSON
  // and call the cartogram routine with a projection and a value accessor. We'll leave
  // this as the next implementation step once you confirm how you'd like topojson/d3 handled.
  console.log('runCartogram() called â€" cartogram lib present, geojson features:', geojsonData.features.length);
}

function draw() {
  function draw() {
    document.body.style.cursor = 'default'; // <--- AGGIUNGI QUESTA RIGA IN CIMA
    

  }
  


  // Hide debug panel if it exists
  const debugPanel = document.getElementById('debug-panel');
  if (debugPanel) {
    debugPanel.style.display = 'none';
  }
  
  // Use STIX font for all text
  if (stixFont) {
    textFont(stixFont);
  } else {
    textFont('serif'); // Fallback to serif
  }
  
  // Sfondo solo a sinistra e a destra, NON sulla fascia alta sopra la mappa
  background(245, 240, 220);

// fascia navbar già disegnata dall'HTML, non serve coprirla

// fascia centrale dove stanno mappa + grafici
// NON disegnare sopra la riga alta (dove deve stare il toggle)
noStroke();
fill(245, 240, 220);

  // Calcolo l'altezza corretta per arrivare fino allo slider
  const colH = height - 90 - 130 - 10; // (Altezza totale - header - footer - margine)

  rect(0, 90, width * 0.33, colH);            // Colonna sinistra allungata
  rect(width * 0.67, 90, width * 0.33, colH); // Colonna destra allungata






// NON disegnare nulla nella riga subito sopra la mappa (es. da y=60 a y=90)

  
  // No card - content directly on background (matching image layout)
  const navbarHeight = 100; // Space for navbar at top
  const sliderHeight = 130; // Space for slider, year labels and back button at bottom // Space for slider at bottom
  const cardMargin = 0; // No margin - full width
  const cardX = 0;
  const cardY = navbarHeight-100; // Start right after navbar
  const cardWidth = width;
  const cardHeight = height - navbarHeight + sliderHeight;
  
  // Section dividers (vertical lines between sections) - matching image exactly
  // Lines should be dark blue and go from top to bottom
  const sectionStartY = cardY; // Start from top of card area
  const sectionEndY = cardY + cardHeight; // Go all the way to bottom
  stroke(THEME_DARK[0], THEME_DARK[1], THEME_DARK[2]); // Dark blue matching image
  strokeWeight(0);
  // Left divider (between quesiti and map) - at 34% of width (moved right)
  line(cardX + cardWidth * 0.67, sectionStartY, cardX + cardWidth * 0.34, sectionEndY);
  // Right divider (between map and charts) - at 67% of width
  line(cardX + cardWidth * 0.67, sectionStartY, cardX + cardWidth * 0.67, sectionEndY);
  
  // Draw content sections within the card
  // The three windows (quesiti, map, charts) will be drawn inside this card
  // Draw header showing Italia or selected region
  drawRegionHeader();
  
  // Debug: log state
  if (frameCount % 60 === 0) { // Log every second
    console.log('draw() called - geojsonData:', !!geojsonData, 'geoProjection:', !!geoProjection, 'geoPath:', !!geoPath);
  }
  
  
  // Draw quesiti window on the left
  drawQuesitiWindow();
  
  // Draw shared background for SEZIONE 3 charts FIRST (before any charts)
  drawSezione3Background();
  
  // Draw affluenza chart (semi-circular progress bar)
  drawAffluenzaChart();
  
  // Draw pie chart for votes
  drawPieChart();
  
  // Draw gender stick figure chart
  drawGenderChart();
  
  // Draw date at bottom center (above slider, matching image) - larger and more visible
  push();
   // Dark blue text
  fill("#1E52A6");
  textSize(10);
  textFont('Stix Two text'); // Increased from 14 to 24 for better visibility
  textStyle(BOLD);
  textAlign(CENTER, TOP);
  
 // --- START: NUOVO BLOCCO PER LA DATA SOPRA L'ITALIA ---
 // --- INIZIO: BLOCCO RISOLUTIVO PER LA DATA (TITOLO) ---
 push();
  
 // 1. STILE DEL TESTO
 fill("#1B4A95"); // Blu Scuro
 textSize(25);   // Grande
 textFont('Stix Two Text');
 textStyle(BOLD); // Grassetto
 textAlign(CENTER, CENTER); 

 // 2. RECUPERO DEL DATO (DATA DEL REFERENDUM)
 let dateText = '';
 const yearKey = String(selectedYear);
 if (contestoByYear && contestoByYear[yearKey] && contestoByYear[yearKey].referendumDate) {
   const referendumDate = contestoByYear[yearKey].referendumDate;
   dateText = referendumDate.toUpperCase();
 } else {
   // Fallback: mostra solo l'anno
   dateText = String(selectedYear);
 }

 // 3. RECUPERO NOME REGIONE O ITALIA
 let locationText = 'Italia'
 if (selectedRegion) {
   let rawName = selectedRegion.properties.reg_name || selectedRegion.properties.denominazione_reg || selectedRegion.properties.denominazione || selectedRegion.properties.nome || 'ITALIA';
   // Rimuovi la parte " - SUDTIROL" se presente
   locationText = rawName.replace('/Südtirol', '').replace('/Südtirol', '').trim();
 }

 // 4. CREAZIONE TESTO COMPLETO
 const fullText = dateText + '  ' + locationText;

 // 5. POSIZIONAMENTO E SFONDO
 let dateY = 120; 
 const dateX = width / 2;
 
 // Disegna uno sfondo beige (stesso colore della pagina) per pulizia
 const textW = textWidth(fullText);
 const padding = 20; 
 const bgHeight = 45;
 fill(245, 240, 220); 
 noStroke();
 rect(dateX - textW/2 - padding, dateY - bgHeight/3, textW + padding * 2, bgHeight);

 // 6. DISEGNO TESTO - DATA IN BOLD E LOCATION IN REGULAR
 fill("#1B4A95");
 
 // Calcola posizioni per disegnare i due testi separatamente
 const dateTextW = textWidth(dateText);
 const fullTextW = textWidth(fullText);
 const startX = dateX - fullTextW / 2;
 
 // Disegna data in BOLD
 textStyle(BOLD);
 text(dateText, startX + dateTextW / 2, dateY + 18);
 
 // Disegna location in NORMAL (regular)
 textStyle(NORMAL);
 const locationStartX = startX + dateTextW + textWidth('  ');
 const locationTextW = textWidth(locationText);
 text(locationText, locationStartX + locationTextW / 2, dateY + 18);
 
 pop();
 // --- FINE: BLOCCO RISOLUTIVO PER LA DATA (TITOLO) ---
 
 // Da qui in poi, il tuo codice continua con:
 // noStroke();
 // fill(245, 240, 220); 
 // ...
 // --- END: NUOVO BLOCCO PER LA DATA SOPRA L'ITALIA ---
  
  // Draw national totals gender chart at the bottom - DISABLED (user wants only one chart)
  // drawNationalTotalsGenderChart();

  // ========== HELP MODE BLUR (OSCURA AREE NON IN HOVER) ==========
  if (helpModeActive && currentHoveredSection) {
    drawHelpModeBlur();  // Oscura le aree NON in hover
  }
  // ================================================================

  // Draw help mode overlay LAST (sopra tutto) - disegna i bordi brillanti
  drawHelpModeOverlay();

  drawHelpHintBubble();
}




// --- D3 + SVG renderer for GeoJSON (map + approximate cartogram) ---
// Create SVG overlay and UI controls
function ensureSVG() {
  if (document.getElementById('cartogram-svg')) return;
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '0';
  container.style.top = '0';
  container.style.pointerEvents = 'none';
  container.id = 'cartogram-container';
  document.body.appendChild(container);

  const svg = d3.select(container).append('svg')
    .attr('id', 'cartogram-svg')
    .attr('width', width)
    .attr('height', height)
    .style('pointer-events', 'auto');

  // UI controls
  const ui = document.createElement('div');
  ui.style.position = 'absolute';
  ui.style.left = '12px';
  ui.style.top = '12px';
  ui.style.pointerEvents = 'auto';
  ui.innerHTML = `
    <button id="cg-show">Show map</button>
    <button id="cg-cartogram">Approx cartogram</button>
    <button id="cg-reset">Reset</button>
  `;
  document.body.appendChild(ui);
  document.getElementById('cg-show').addEventListener('click', drawGeoSVG);
  document.getElementById('cg-cartogram').addEventListener('click', runApproxCartogram);
  document.getElementById('cg-reset').addEventListener('click', resetGeoSVG);
}

function drawGeoSVG() {
  if (!geojsonData) {
    alert('GeoJSON not loaded yet');
    return;
  }
  ensureSVG();
  const svg = d3.select('#cartogram-svg');
  svg.selectAll('*').remove();

  const paddingTop = 90; // leave space for canvas title
  const mapLeft = width * 0.33; // Mappa inizia dopo la finestra sinistra
  const mapWidth = width * 0.34; // Mappa occupa 1/3 centrale della pagina
  const drawW = mapWidth;
  const drawH = height - paddingTop;

  const proj = d3.geoMercator()
    .fitSize([drawW, drawH], geojsonData);
  const path = d3.geoPath().projection(proj);

  // build color scale (blue high, orange low)
  const vals = geojsonData.features.map(f => f.properties && f.properties.affluenza ? f.properties.affluenza : 0);
  const minV = d3.min(vals);
  const maxV = d3.max(vals);
  const color = d3.scaleLinear().domain([minV || 0, maxV || 100]).range(['#ff8c00', '#1678d6']);

  // group for map
  const g = svg.append('g').attr('transform', `translate(0, ${paddingTop})`);

  g.selectAll('path')
    .data(geojsonData.features)
    .join('path')
    .attr('d', path)
    .attr('fill', d => d.properties && d.properties.affluenza != null ? color(d.properties.affluenza) : '#ccc')
    .attr('stroke', '#444')
    .attr('stroke-width', 0.6)
    .attr('opacity', 0.95)
    .on('mouseover', function(event, d) {
      const pct = d.properties && d.properties.affluenza != null ? d.properties.affluenza.toFixed(2) + '%' : '--';
      showTooltip(d.properties.denominazione_reg || d.properties.nome || d.properties.name || d.id || 'Regione', pct, event.clientX, event.clientY);
    })
    .on('mouseout', () => redraw());
}

// Draw header (center top) - removed "Italia" text as requested
function drawRegionHeader() {
  // Function kept for potential future use, but no longer draws anything
  return;
}

drawRegionHeader();

console.log('draw(): selectedRegion =', selectedRegion, 'currentRegion =', window.currentRegion);


// A very simple approx cartogram: scale each feature about its centroid by factor = affluenza / mean
function runApproxCartogram() {
  const svg = d3.select('#cartogram-svg');
  if (svg.empty() || !geojsonData) {
    alert('Map not ready');
    return;
  }
  const paddingTop = 90;
  const mapLeft = width * 0.33; // Mappa inizia dopo la finestra sinistra
  const mapWidth = width * 0.34; // Mappa occupa 1/3 centrale della pagina
  const drawW = mapWidth;
  const drawH = height - paddingTop;
  const proj = d3.geoMercator().fitSize([drawW, drawH], geojsonData);
  const path = d3.geoPath().projection(proj);

  const feats = geojsonData.features;
  const vals = feats.map(f => f.properties && f.properties.affluenza ? f.properties.affluenza : 0);
  const mean = d3.mean(vals.filter(v => v > 0)) || 1;

  svg.selectAll('path')
    .transition()
    .duration(800)
    .attrTween('transform', function(d) {
      const el = d3.select(this);
      const centroid = path.centroid(d);
      const cx = centroid[0];
      const cy = centroid[1] + paddingTop;
      const aff = d.properties && d.properties.affluenza ? d.properties.affluenza : mean;
      const scale = Math.max(0.3, aff / mean);
      const i = d3.interpolateString('translate(0,0) scale(1)', `translate(${cx},${cy}) scale(${scale}) translate(${-cx},${-cy})`);
      return function(t) { return i(t); };
    });
}

function resetGeoSVG() {
  const svg = d3.select('#cartogram-svg');
  if (svg.empty()) return;
  svg.selectAll('path')
    .transition()
    .duration(500)
    .attr('transform', '');
}

function drawTitle() {
  // Title function disabled - title is now drawn in the ballot card header
  return;
}

// Draw realistic GeoJSON map on p5.js canvas
function drawGeoMap() {
  if (!geojsonData || !geoProjection) return;
  
  // Position matching layout (no card, full width)
  const navbarHeight = 100;
  const sliderHeight = 130; // Space for slider, year labels and back button at bottom
  const cardMargin = 0; // No margin - full width (matching layout)
  const cardX = 0;
  const cardY = navbarHeight; // Start right after navbar (matching layout)
  const cardWidth = width;
  const cardHeight = height - navbarHeight - sliderHeight;
  const sectionStartY = cardY + 20; // Same as layout
  const bottomPadding = 3;
  
  // Center map perfectly in the page (horizontally and vertically)
  const mapWidth = cardWidth * 0.34;        // Mappa occupa il 34% della larghezza
  const mapLeft = (cardWidth - mapWidth) / 2; // Centra orizzontalmente nella pagina
  const drawW = mapWidth;
  
  // Center map vertically - spostata più in basso
  const availableTop = sectionStartY + 30; // Aggiunto offset per spostare la mappa più in basso
  const availableBottom = cardY + cardHeight - bottomPadding;
  const totalAvailableHeight = availableBottom - availableTop;
  const drawH = totalAvailableHeight - 20; // Leave some padding
  const paddingTop = availableTop + (totalAvailableHeight - drawH) / 2; // Center vertically
  
  // Update projection if window was resized
  geoProjection.fitSize([drawW, drawH], geojsonData);
  geoPath = d3.geoPath().projection(geoProjection);
  
  // Debug: check affluenza values in features
  const affluenzaValues = geojsonData.features.map(f => {
    const aff = f.properties && f.properties.affluenza;
    const name = f.properties && (f.properties.reg_name || f.properties.denominazione_reg || f.properties.denominazione || f.properties.nome || 'Unknown');
    return { name, aff };
  });
  const validValues = affluenzaValues.filter(v => v.aff !== null && v.aff !== undefined && !isNaN(v.aff));
  console.log(`ðŸŽ¨ Drawing map: ${validValues.length} regions with valid affluenza values out of ${affluenzaValues.length}`);
  if (validValues.length > 0) {
    console.log('Sample values:', validValues.slice(0, 5).map(v => `${v.name}: ${v.aff}%`));
  } else {
    console.error('â" NO VALID AFFLUENZA VALUES FOUND IN GEOJSON FEATURES!');
    console.log('All features:', affluenzaValues.map(v => `${v.name}: ${v.aff}`));
  }
  
  // Calculate color scale (store globally for getColor function)
  const vals = geojsonData.features.map(f => f.properties && f.properties.affluenza ? f.properties.affluenza : null).filter(v => v !== null);
  window.minAffluenza = vals.length > 0 ? Math.min(...vals) : 0;
  window.maxAffluenza = vals.length > 0 ? Math.max(...vals) : 100;
  
  console.log(`Color scale: ${window.minAffluenza}% - ${window.maxAffluenza}%`);
  
  // Reset hovered region
  hoveredRegion = null;
  
  // Draw each region
  push();
  translate(mapLeft, paddingTop);
  
  // First pass: draw all regions with colors based on affluenza
  for (const feature of geojsonData.features) {
    const affluenza = feature.properties && feature.properties.affluenza;
    const regionColor = getColor(affluenza);
    
    // Highlight selected region
    if (selectedRegion && selectedRegion === feature) {
      fill(red(regionColor), green(regionColor), blue(regionColor), 180);
      stroke(255, 100, 0);
      strokeWeight(3);
    } else {
      // Ensure region is always colored (even if no data, it will be gray)
      fill(regionColor);
      stroke(60);
      strokeWeight(0.8);
    }
    
    drawGeoFeature(feature);
  }
 
  
  
  // Second pass: check for hovered region and draw label only on hover
  hoveredRegion = null;
  // Convert mouse coordinates to map coordinates (subtract mapLeft offset)
  const mapMouseX = mouseX - mapLeft;
  const mapMouseY = mouseY - paddingTop;
  // Only check hover if mouse is within map bounds
  if (mouseX >= mapLeft && mouseX < mapLeft + mapWidth && mouseY > paddingTop) {
    for (const feature of geojsonData.features) {
      const isHovered = isPointInFeature(mapMouseX, mapMouseY, feature);
      if (isHovered) {
        hoveredRegion = feature;
        // Draw highlight (only if not selected) with better styling
        if (selectedRegion !== feature) {
          push();
          const affluenza = feature.properties && feature.properties.affluenza;
          const regionColor = getColor(affluenza);
          fill(red(regionColor), green(regionColor), blue(regionColor), 220);
          stroke(255, 200, 0, 200); // Gold border on hover
          strokeWeight(2.5);
          drawGeoFeature(feature);
  pop();
}

        // Draw label only for hovered region
        const affluenza = feature.properties && feature.properties.affluenza;
        drawRegionLabel(feature, affluenza);
        break; // Only one hovered region at a time
      }
    }
  }
  
  pop();
}

// Draw a GeoJSON feature (handles MultiPolygon and Polygon)
function drawGeoFeature(feature) {
  const geometry = feature.geometry;
  
  if (geometry.type === 'Polygon') {
    drawPolygon(geometry.coordinates[0]);
  } else if (geometry.type === 'MultiPolygon') {
    for (const polygon of geometry.coordinates) {
      drawPolygon(polygon[0]);
    }
  }
}

// Draw a polygon from coordinates
function drawPolygon(coordinates) {
  beginShape();
  for (const coord of coordinates) {
    const projected = geoProjection(coord);
    if (projected) {
      vertex(projected[0], projected[1]);
    }
  }
  endShape(CLOSE);
}

// Check if a point is inside a GeoJSON feature
function isPointInFeature(x, y, feature) {
  if (!geoProjection || !feature) return false;
  
  try {
    // Convert screen coordinates to geographic coordinates
    const geoCoord = geoProjection.invert([x, y]);
    if (!geoCoord) return false;
    
    // Use D3's geoContains to check if point is in feature
    return d3.geoContains(feature, geoCoord);
  } catch (e) {
    return false;
  }
}

// Draw label with region name and affluenza value on a region
function drawRegionLabel(feature, affluenza) {
  if (!geoPath || !geoProjection) {
    console.warn('drawRegionLabel: geoPath or geoProjection not available');
    return;
  }
  
  try {
    // Calculate centroid of the region
    const centroid = geoPath.centroid(feature);
    if (!centroid || isNaN(centroid[0]) || isNaN(centroid[1])) {
      console.warn('drawRegionLabel: Invalid centroid for feature', feature.properties);
      return;
    }
    
    const x = centroid[0];
    const y = centroid[1];
    
    // Debug: log first few regions
    const featureIndex = geojsonData.features.indexOf(feature);
    if (featureIndex < 3) {
      console.log(`Drawing label for region ${featureIndex}:`, {
        affluenza: affluenza,
        centroid: [x, y],
        properties: feature.properties
      });
    }
    
    // Get region name from properties - try all possible property names
    const props = feature.properties || {};
    let regionName = props.regionName ||  // Use stored name first
                     props.denominazione_reg || 
                     props.denominazione || 
                     props.nome || 
                     props.name || 
                     props.REGIONE || 
                     props.REGION ||
                     props.denominazione_regione ||
                     props.denominazionereg ||
                     props.NAME ||
                     props.NAME_REG ||
                     null;
    
    // Try to find a property that contains a name
    if (!regionName || regionName === '') {
      const nameKeys = Object.keys(props).filter(k => 
        k.toLowerCase().includes('nome') || 
        k.toLowerCase().includes('name') || 
        k.toLowerCase().includes('denominazione') ||
        k.toLowerCase().includes('region')
      );
      if (nameKeys.length > 0) {
        regionName = props[nameKeys[0]];
      }
    }
    
    // Fallback: use first non-numeric property value
    if (!regionName || regionName === '') {
      const keys = Object.keys(props);
      for (const key of keys) {
        if (key !== 'affluenza' && typeof props[key] === 'string' && props[key].trim() !== '') {
          regionName = props[key];
          break;
        }
      }
    }
    
    // Final fallback
    if (!regionName || regionName === '') {
      regionName = 'Regione';
    }
    
    // Debug: log first few regions to see what's available (featureIndex already declared above)
    if (featureIndex < 3) {
      console.log(`Region ${featureIndex} properties:`, props);
      console.log(`  - Extracted region name: ${regionName}`);
      console.log(`  - Affluenza value: ${affluenza}`);
      console.log(`  - All properties keys:`, Object.keys(props));
    }
    
    // Format the value - check if affluenza is actually in properties
    let valueText = 'N/A';
    // Try to get affluenza from properties if not passed correctly
    if ((affluenza === null || affluenza === undefined || isNaN(affluenza)) && props.affluenza !== undefined) {
      affluenza = props.affluenza;
      if (featureIndex < 3) {
        console.log(`  âœ" Got affluenza from properties: ${affluenza}`);
      }
    }
    
    // Convert to number if it's a string
    if (typeof affluenza === 'string') {
      affluenza = parseFloat(affluenza);
    }
    
    if (affluenza !== null && affluenza !== undefined && !isNaN(affluenza) && affluenza > 0) {
      valueText = nf(affluenza, 0, 1) + '%';
    } else {
      // Debug: log why we're showing N/A
      if (featureIndex < 3) {
        console.warn(`  âš  Showing N/A because affluenza is:`, affluenza, 'type:', typeof affluenza, 'props.affluenza:', props.affluenza);
      }
    }
    
    // Draw text with background for better readability
    push();
    
    // Set text properties first (use STIX font)
    if (stixFont) {
      textFont(stixFont);
    } else {
      textFont('serif'); // Fallback to serif
    }
    textAlign(CENTER, CENTER);

    // Calculate text dimensions with compact sizes
    textSize(12);
    const nameW = textWidth(regionName);
    textSize(13);
    const valueW = textWidth(valueText);
    const maxW = Math.max(nameW, valueW, 80); // Minimum width

    const padding = 12;
    const textW = maxW + padding * 2;
    const lineHeight = 16;
    const textH = lineHeight * 2 + padding * 2;
    
    // Draw semi-transparent white background with black border
    fill(255, 255, 255, 220); // Semi-transparent white
    stroke(0, 0, 0, 180); // Semi-transparent black border
    strokeWeight(2);
    rect(x - textW/2, y - textH/2, textW, textH);
    
    // Draw region name (compact and legible)
    fill(0, 0, 0, 240);
    noStroke();
    textSize(12);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text(regionName, x, y - lineHeight/2);

    // Draw affluenza value
    textSize(13);
    textStyle(NORMAL);
    fill(0, 0, 0, 240);
    textAlign(CENTER, CENTER);
    text(valueText, x, y + lineHeight/2);
    
    pop();
  } catch (e) {
    console.warn('Error drawing region label:', e);
    console.log('Feature properties:', feature.properties);
  }
}

// Helper function to get color for affluenza value
// Affluenza alta -> blu completamente opaco (alpha=255)
// Affluenza bassa -> blu completamente trasparente (alpha=0)
// Usa un range fisso 0-100% per tutti gli anni (gradiente unico)
function getColor(affluenza) {
  if (affluenza === null || affluenza === undefined) return color(200, 200, 200);

  // Range fisso per tutti gli anni: 0-100%
  const minV = 0;
  const maxV = 100;
  const norm = (maxV - minV) > 0 ? (affluenza - minV) / (maxV - minV) : 0;
  // Clamp norm tra 0 e 1 per valori fuori range
  const clampedNorm = Math.max(0, Math.min(1, norm));

  // Use the theme blue color and vary alpha according to normalized value
  const r = THEME_BLUE[0];
  const g = THEME_BLUE[1];
  const b = THEME_BLUE[2];
  const a = lerp(0, 255, clampedNorm); // 0 = fully transparent (bassa), 255 = fully opaque (alta)
  return color(r, g, b, a);
}


function showTooltip(name, pct, mx, my) {
  const w = max(120, textWidth(name) + 20);
  const h = 44;
  const tx = constrain(mx + 12, 10, width - w - 10);
  const ty = constrain(my + 12, 50, height - h - 10);
  push();
  fill(255);
  stroke(60);
  rect(tx, ty, w, h);
  noStroke();
  fill(30);
  textSize(13);
  textAlign(LEFT, TOP);
  text(name, tx + 8, ty + 6);
  textSize(12);
  text('Affluenza: ' + pct, tx + 8, ty + 24);
  pop();
}

function createHtmlLegend() {
  // Controlla se esiste già per non duplicarla
  if (document.getElementById('html-legend')) return;

  const legendDiv = document.createElement('div');
  legendDiv.id = 'html-legend';
  
  // Stili CSS via JS per posizionarlo sopra il footer
  Object.assign(legendDiv.style, {
    position: 'absolute',
    bottom: '38px',        // Altezza dal fondo (regola tu)
    left: '40px',          // Distanza da sinistra
    display: 'flex',
    gap: '30px',
    fontFamily: '"STIX Two Text", serif',
    fontSize: '16px',
    color: '#1E52A6',
    zIndex: '2000',        // Z-Index altissimo per stare sopra a tutto!
    pointerEvents: 'none'  // Così non interferisce coi click
  });

  // Contenuto HTML della legenda
  legendDiv.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <div style="width: 14px; height: 14px; border: 2px solid #1E52A6; border-radius: 4px;"></div>
      <span>Quorum non richiesto</span>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <div style="width: 16px; height: 16px; background-color: #a4afc1; border-radius: 4px;"></div>
      <span>Quorum non raggiunto</span>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <div style="width: 16px; height: 16px; background-color: #1E52A6; border-radius: 4px;"></div>
      <span>Quorum raggiunto</span>
    </div>
  `;

  // Appendi al body o al footer container
  document.body.appendChild(legendDiv);
}


// Setup year slider with referendum years
function setupYearSlider() {
  console.log("🔧 Setup Year Slider AVVIATO"); // Debug per vedere se parte

  // Usa solo lo slider visibile (la timeline in alto è stata rimossa)
  const visibleSlider = document.getElementById('year-slider-visible');
  const sliderDots = document.getElementById('slider-dots');

  if (!visibleSlider || !sliderDots) {
      console.error("❌ Slider visibile o SliderDots non trovati nel DOM!");
      console.error("VisibleSlider:", visibleSlider, "SliderDots:", sliderDots);
      return;
  }
  
  console.log("✅ Slider visibile e SliderDots trovati nel DOM");

  // --- Calcoli ---
  const yearToPosition = {};
  REFERENDUM_YEARS_ARRAY.forEach((yearKey, index) => {
    const position = (REFERENDUM_YEARS_ARRAY.length > 1) 
      ? (index / (REFERENDUM_YEARS_ARRAY.length - 1)) * 100 
      : 0;
    yearToPosition[yearKey] = position;
  });

  // --- Setup Slider Visibile ---
  visibleSlider.min = 0;
  visibleSlider.max = 100;
  visibleSlider.step = 0.01;
  
  // Normalizza selectedYear per trovare la posizione corretta
  let normalizedYear = selectedYear;
  // Prova come stringa prima
  if (typeof selectedYear === 'number') {
    normalizedYear = String(selectedYear);
  }
  // Se non trovato, prova come numero
  if (!yearToPosition[normalizedYear] && typeof selectedYear === 'string' && !selectedYear.includes('-')) {
    const numYear = parseInt(selectedYear);
    if (yearToPosition[numYear] !== undefined) {
      normalizedYear = numYear;
    }
  }
  
  const sliderValue = yearToPosition[normalizedYear] || yearToPosition[String(selectedYear)] || yearToPosition[selectedYear] || 100;
  visibleSlider.value = sliderValue;
  console.log('Slider visibile impostato - selectedYear:', selectedYear, 'tipo:', typeof selectedYear, 'normalized:', normalizedYear, 'value:', sliderValue);

  const findClosestYear = (pos) => {
    let closest = REFERENDUM_YEARS_ARRAY[0];
    let minDst = Infinity;
    REFERENDUM_YEARS_ARRAY.forEach(k => {
      const d = Math.abs(pos - yearToPosition[k]);
      if (d < minDst) { minDst = d; closest = k; }
    });
    return closest;
  };

  // --- Funzione Aggiornamento Grafico (solo per slider visibile) ---
  const refreshVisuals = () => {
      // Aggiorna i dots dello slider visibile
      if (window.refreshSliderDots) {
        window.refreshSliderDots();
      }
      return; // Timeline rimossa, non serve più
  };

  // Timeline rimossa - non serve più creare yearDots
  // Aggiornamento iniziale
  refreshVisuals();

  // --- Setup Slider Visibile con Dots ---
  // (sliderDots e visibleSlider già definiti all'inizio della funzione)
  const autoPlayBtn = document.getElementById('auto-play-btn');
  
  // Crea i dots nello slider (stesso stile della timeline)
  if (sliderDots) {
    sliderDots.innerHTML = ''; // Pulisce tutto
    
    // Create slider line
    const sliderLine = document.createElement('div');
    sliderLine.style.cssText = 'position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-50%); height: 3px; width: 100%; background-color: #0F3D88; z-index: 1; pointer-events: none; opacity: 1; display: block; visibility: visible;';
    sliderDots.appendChild(sliderLine);
    
    REFERENDUM_YEARS_ARRAY.forEach((yearKey) => {
      const percentage = yearToPosition[yearKey];
      
      // Container per il dot
      const container = document.createElement('div');
      container.setAttribute('data-slider-year-key', yearKey);
      Object.assign(container.style, {
        position: 'absolute', 
        left: `${percentage}%`, 
        top: '50%',
        transform: 'translate(-50%, -50%)', 
        cursor: 'pointer', 
        zIndex: '20',
        pointerEvents: 'auto',
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center'
      });
      
      // Quadratino visivo
      const dot = document.createElement('div');
      dot.className = 'slider-dot-element';
      const baseSize = 18;
      Object.assign(dot.style, {
        width: baseSize + 'px', 
        height: baseSize + 'px', 
        borderRadius: '6px', 
        transition: 'all 0.18s ease', 
        boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
        display: 'block', 
        visibility: 'visible', 
        opacity: '1',
        position: 'relative', 
        zIndex: '21'
      });
      
      // Get quorum status for colors
      const qStatus = quorumStatusByYear[yearKey];
      const fallbackMap = {
        '1946': 'NON_RICHIESTO', '1974': 'RAGGIUNTO', '1978': 'RAGGIUNTO', '1981': 'RAGGIUNTO',
        '1985': 'RAGGIUNTO', '1987': 'RAGGIUNTO', '1989': 'NON_RICHIESTO', '1990': 'NON_RAGGIUNTO',
        '1991': 'RAGGIUNTO', '1993': 'RAGGIUNTO', '1995': 'RAGGIUNTO', '1997': 'NON_RAGGIUNTO',
        '1999': 'NON_RAGGIUNTO', '2000': 'NON_RAGGIUNTO', '2001': 'NON_RICHIESTO', '2003': 'NON_RAGGIUNTO',
        '2005': 'NON_RAGGIUNTO', '2006': 'NON_RICHIESTO', '2009': 'NON_RAGGIUNTO', '2011': 'RAGGIUNTO',
        '2016-1': 'NON_RAGGIUNTO', '2016-2': 'NON_RICHIESTO', '2020': 'NON_RICHIESTO', '2022': 'NON_RAGGIUNTO',
        '2025': 'NON_RAGGIUNTO'
      };
      const status = qStatus || fallbackMap[yearKey];
      
      const FILLED_BLUE = '#1E52A6';
      const BORDER_BLUE = '#1E52A6';
      const LIGHT_BLUE = '#a4afc1ff';
      const NON_RICHIESTO_COLOR = '#F6ECE1';
      
      // Apply color based on quorum status
      if (status === 'RAGGIUNTO') {
        dot.style.backgroundColor = FILLED_BLUE;
        dot.style.border = 'none';
      } else if (status === 'NON_RICHIESTO') {
        dot.style.backgroundColor = NON_RICHIESTO_COLOR;
        dot.style.border = `2px solid ${BORDER_BLUE}`;
      } else if (status === 'NON_RAGGIUNTO') {
        dot.style.backgroundColor = LIGHT_BLUE;
        dot.style.border = 'none';
      } else {
        dot.style.backgroundColor = '#E1E1E1';
        dot.style.border = `2px solid ${BORDER_BLUE}`;
      }
      
      // Highlight selected year
      if (yearKey === String(selectedYear)) {
        const selectedSize = 22;
        dot.style.width = selectedSize + 'px';
        dot.style.height = selectedSize + 'px';
        dot.style.boxShadow = '0 3px 6px rgba(0,0,0,0.25)';
      }
      
      // Label Data - positioned BELOW slider (same as overview timeline)
      const label = document.createElement('div');
      label.className = 'slider-label-element';
      label.setAttribute('data-slider-label-year', yearKey);
      const displayYear = getYearDisplayName(yearKey);
      label.textContent = displayYear;
      Object.assign(label.style, {
        position: 'absolute',
        left: `${percentage}%`,
        transform: 'translateX(-50%)',
        top: 'calc(50% + 30px)', // Below slider (same as overview timeline)
        fontFamily: "'STIX Two Text', serif",
        fontSize: '16px',
        fontWeight: 'bold',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        opacity: '1',
        zIndex: '1',
        lineHeight: '16px',
        height: '16px',
        marginTop: '0',
        paddingTop: '0',
        marginBottom: '0',
        paddingBottom: '0'
      });
      
      // Set label color based on selection
      if (yearKey === String(selectedYear)) {
        label.style.color = '#255077';
      } else {
        label.style.color = '#255096';
      }
      
      // Eventi hover
      container.addEventListener('mouseenter', () => {
        const hoverSize = 24;
        dot.style.width = hoverSize + 'px';
        dot.style.height = hoverSize + 'px';
        dot.style.boxShadow = '0 6px 12px rgba(0,0,0,0.25)';
        dot.style.borderRadius = '6px';
      });
      
      container.addEventListener('mouseleave', () => {
        if (yearKey !== String(selectedYear)) {
          dot.style.width = '18px';
          dot.style.height = '18px';
          dot.style.boxShadow = '0 1px 2px rgba(0,0,0,0.12)';
        } else {
          dot.style.width = '22px';
          dot.style.height = '22px';
          dot.style.boxShadow = '0 3px 6px rgba(0,0,0,0.25)';
        }
      });
      
      // Evento Click
      container.onclick = () => {
        visibleSlider.value = yearToPosition[yearKey];
        visibleSlider.dispatchEvent(new Event('input'));
      };
      
      container.appendChild(dot);
      sliderDots.appendChild(container);
      // Append label directly to sliderDots container (below slider)
      sliderDots.appendChild(label);
    });
    
    // Funzione per aggiornare i dots dello slider quando cambia l'anno
    const refreshSliderDots = () => {
      const dots = sliderDots.querySelectorAll('.slider-dot-element');
      dots.forEach((dot, index) => {
        const container = dot.parentElement;
        const yearKey = container.getAttribute('data-slider-year-key');
        if (yearKey === String(selectedYear)) {
          dot.style.width = '22px';
          dot.style.height = '22px';
          dot.style.boxShadow = '0 3px 6px rgba(0,0,0,0.25)';
        } else {
          dot.style.width = '18px';
          dot.style.height = '18px';
          dot.style.boxShadow = '0 1px 2px rgba(0,0,0,0.12)';
        }
      });
      
      // Aggiorna anche i colori delle etichette
      const labels = sliderDots.querySelectorAll('.slider-label-element');
      labels.forEach((label) => {
        const yearKey = label.getAttribute('data-slider-label-year');
        if (yearKey === String(selectedYear)) {
          label.style.color = '#255077';
        } else {
          label.style.color = '#255096';
        }
      });
    };
    
    // Salva la funzione per aggiornare i dots dello slider
    window.refreshSliderDots = refreshSliderDots;
  }
  
  // Variabili per lo scorrimento automatico
  let autoPlayInterval = null;
  let autoPlayAnimationFrame = null;
  let isAutoPlaying = false;
  let autoPlayStartTime = null;
  let autoPlayDuration = 30000; // durata totale dello scorrimento in millisecondi (30 secondi)
  let autoPlayStartPosition = 0;
  
  if (visibleSlider) {
    // Inizializza lo slider visibile con gli stessi valori
    visibleSlider.min = 0;
    visibleSlider.max = 100;
    visibleSlider.step = 0.01;
    visibleSlider.value = sliderValue;
    
    // Funzione per avviare/fermare lo scorrimento automatico continuo
    const toggleAutoPlay = () => {
      if (isAutoPlaying) {
        // Ferma lo scorrimento automatico
        if (autoPlayAnimationFrame) {
          cancelAnimationFrame(autoPlayAnimationFrame);
          autoPlayAnimationFrame = null;
        }
        if (autoPlayInterval) {
          clearInterval(autoPlayInterval);
          autoPlayInterval = null;
        }
        isAutoPlaying = false;
        if (autoPlayBtn) {
          autoPlayBtn.textContent = '▶';
          autoPlayBtn.style.background = '#0F3D88';
          autoPlayBtn.title = 'Avvia scorrimento automatico';
        }
      } else {
        // Avvia lo scorrimento automatico continuo
        isAutoPlaying = true;
        autoPlayStartTime = Date.now();
        autoPlayStartPosition = parseFloat(visibleSlider.value);
        
        if (autoPlayBtn) {
          autoPlayBtn.textContent = '⏸';
          autoPlayBtn.style.background = '#1E52A6';
          autoPlayBtn.title = 'Ferma scorrimento automatico';
        }
        
        // Funzione di animazione continua
        const animate = () => {
          if (!isAutoPlaying) return;
          
          const elapsed = Date.now() - autoPlayStartTime;
          const progress = Math.min(elapsed / autoPlayDuration, 1); // 0 a 1
          
          // Calcola la posizione corrente (da start a 100)
          const currentPosition = autoPlayStartPosition + (100 - autoPlayStartPosition) * progress;
          
          // Aggiorna entrambi gli slider
          visibleSlider.value = currentPosition;
          slider.value = currentPosition;
          
          // Trova l'anno più vicino alla posizione corrente
          const currentYear = findClosestYear(currentPosition);
          
          // Aggiorna solo se l'anno è cambiato per evitare troppi aggiornamenti
          if (currentYear && currentYear !== selectedYear) {
            selectedYear = currentYear;
            refreshVisuals();
            
            // Carica dati CSV per il nuovo anno
            if (REFERENDUM_YEARS[currentYear] && typeof loadCSVForYear === 'function') {
              loadCSVForYear(REFERENDUM_YEARS[currentYear]);
            }
          }
          
          if (progress < 1) {
            autoPlayAnimationFrame = requestAnimationFrame(animate);
          } else {
            // Scorrimento completato
            isAutoPlaying = false;
            if (autoPlayBtn) {
              autoPlayBtn.textContent = '▶';
              autoPlayBtn.style.background = '#0F3D88';
              autoPlayBtn.title = 'Avvia scorrimento automatico';
            }
          }
        };
        
        autoPlayAnimationFrame = requestAnimationFrame(animate);
      }
    };
    
    // Aggiungi event listener al pulsante play/pause
    if (autoPlayBtn) {
      autoPlayBtn.addEventListener('click', toggleAutoPlay);
    }
    
    // Ferma lo scorrimento automatico quando l'utente muove manualmente lo slider
    visibleSlider.addEventListener('input', () => {
      if (isAutoPlaying) {
        toggleAutoPlay(); // Ferma lo scorrimento automatico
      }
    });
    
    // Stili CSS per lo slider visibile - stesse dimensioni della timeline
    const style = document.createElement('style');
    style.textContent = `
      #year-slider-visible-container {
        position: relative;
        width: 100%;
        max-width: 1450px;
        height: 60px; /* Aumentato per dare spazio alle etichette degli anni */
        display: flex;
        align-items: center;
        gap: 15px;
        padding: 0;
        margin: 0 auto;
        box-sizing: border-box;
        overflow: visible !important; /* Permette alle etichette degli anni di essere visibili */
      }
      
      #auto-play-btn {
        margin-left: 20px;
      }
      
      #auto-play-btn {
        background: #0F3D88;
        color: white;
        border: none;
        border-radius: 50%;
        width: 36px;
        height: 36px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        padding: 0;
        flex-shrink: 0;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        transition: all 0.2s ease;
      }
      
      #auto-play-btn:hover {
        background: #1E52A6;
        transform: scale(1.1);
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      }
      
      #auto-play-btn:active {
        transform: scale(0.95);
      }
      
      #year-slider-visible-container > div {
        position: relative;
        flex: 1;
        height: 60px; /* Aumentato per dare spazio alle etichette degli anni */
        overflow: visible !important; /* Permette alle etichette degli anni di essere visibili */
      }
      
      #slider-dots {
        position: relative;
        width: 100%;
        height: 100%;
        z-index: 2;
        overflow: visible !important; /* Permette alle etichette degli anni di essere visibili sotto */
      }
      
      #year-slider-visible {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 100%;
        background: transparent;
        outline: none;
        cursor: pointer;
        z-index: 5;
        position: absolute;
        top: 0;
        left: 0;
        margin: 0;
        padding: 0;
      }
      
      #year-slider-visible::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #0F3D88;
        cursor: pointer;
        box-shadow: 0 3px 6px rgba(15, 61, 136, 0.4), 0 0 0 3px rgba(255, 255, 255, 0.9);
        transition: all 0.2s ease;
        border: 2px solid #ffffff;
        margin-top: -8px;
      }
      
      #year-slider-visible::-webkit-slider-thumb:hover {
        background: #1E52A6;
        transform: scale(1.1);
        box-shadow: 0 4px 8px rgba(15, 61, 136, 0.5), 0 0 0 3px rgba(255, 255, 255, 1);
      }
      
      #year-slider-visible::-webkit-slider-thumb:active {
        transform: scale(1.15);
        box-shadow: 0 6px 12px rgba(15, 61, 136, 0.6), 0 0 0 4px rgba(255, 255, 255, 1);
      }
      
      #year-slider-visible::-webkit-slider-runnable-track {
        width: 100%;
        height: 4px;
        background: transparent;
        cursor: pointer;
        border: none;
      }
      
      #year-slider-visible::-moz-range-thumb {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #0F3D88;
        cursor: pointer;
        border: 2px solid #ffffff;
        box-shadow: 0 3px 6px rgba(15, 61, 136, 0.4), 0 0 0 3px rgba(255, 255, 255, 0.9);
        transition: all 0.2s ease;
      }
      
      #year-slider-visible::-moz-range-thumb:hover {
        background: #1E52A6;
        transform: scale(1.1);
        box-shadow: 0 4px 8px rgba(15, 61, 136, 0.5), 0 0 0 3px rgba(255, 255, 255, 1);
      }
      
      #year-slider-visible::-moz-range-thumb:active {
        transform: scale(1.15);
        box-shadow: 0 6px 12px rgba(15, 61, 136, 0.6), 0 0 0 4px rgba(255, 255, 255, 1);
      }
      
      #year-slider-visible::-moz-range-track {
        width: 100%;
        height: 4px;
        background: #0F3D88;
        border: none;
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);
    
    // Funzione per aggiornare entrambi gli slider
    const updateSliders = (newPos, newYear) => {
      slider.value = newPos;
      visibleSlider.value = newPos;
      // Aggiorna i dots dello slider
      if (window.refreshSliderDots) {
        window.refreshSliderDots();
      }
    };
    
    // Evento input per lo slider visibile
    
  }

  // --- Evento Input Slider Visibile ---
  let isUpdating = false; // Flag per evitare aggiornamenti multipli simultanei
  
  visibleSlider.addEventListener('input', (e) => {
      if (isUpdating) return; // Evita aggiornamenti multipli
      
      const pos = parseFloat(e.target.value);
      const newYear = findClosestYear(pos);

      if (newYear && newYear !== selectedYear) {
          isUpdating = true;
          console.log('🔄 Cambio anno da slider:', selectedYear, '->', newYear);
          
          selectedYear = newYear;
          dataFile = REFERENDUM_YEARS[newYear]; 

          
          // Aggiorna grafica slider (accende nuovo, spegne vecchio)
          refreshVisuals();

          // Snap slider alla posizione esatta dell'anno
          if (yearToPosition[selectedYear] !== undefined) {
            const exactPos = yearToPosition[selectedYear];
            visibleSlider.value = exactPos;
          }
          
          // Reset selezioni
          currentPresidenteMode = 0;
          quesitiScrollOffset = 0;
          presidenteDescScrollOffset = 0;
          selectedQuesito = null;
          selectedRegion = null;
          
          // Carica dati CSV per il nuovo anno
          if (REFERENDUM_YEARS[newYear] && typeof loadCSVForYear === 'function') {
            console.log('📊 Caricamento dati CSV per anno:', newYear, 'file:', REFERENDUM_YEARS[newYear]);
            loadCSVForYear(REFERENDUM_YEARS[newYear]);
          } else {
            console.warn('⚠️ Nessun file CSV trovato per anno:', newYear);
            // Forza redraw anche senza CSV per aggiornare almeno la timeline
          redraw();
          }
          
          // Carica immagini presidente per il nuovo anno
          let presidenteData = contestoByYear[String(newYear)];
          if (!presidenteData && !isNaN(newYear)) {
            presidenteData = contestoByYear[parseInt(newYear)];
          }
          if (!presidenteData) {
            const numericYear = getYearNumeric(String(newYear));
            for (const key in contestoByYear) {
              if (getYearNumeric(key) === numericYear) {
                presidenteData = contestoByYear[key];
                break;
              }
            }
          }
          
          if (presidenteData && typeof loadPresidenteImages === 'function') {
            console.log('📸 Caricamento immagini presidente per nuovo anno:', newYear);
            loadPresidenteImages(presidenteData, false);
          }
          
          // Reset flag dopo un breve delay
          setTimeout(() => {
            isUpdating = false;
          }, 100);
      }
  });
}


// Load CSV for a specific year
function loadCSVForYear(filePath) {
  console.log('🔄 Loading CSV for year:', selectedYear, 'from:', filePath);
  
  // Reset selected region and quesito when changing year
  selectedRegion = null;
  selectedQuesito = null;
  
  // Show loading state (optional - you could add a loading indicator here)
  
  fetch(filePath).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.text();
  }).then(txt => {
    // Parse CSV data - parseTableTotals() handles all parsing (affluenza, quesiti, gender)
    tableRows = parseCSV(txt);
    parseTableTotals();
    
    console.log('✅ CSV loaded and parsed for year:', selectedYear);
    console.log('📊 Dati disponibili - Affluenza regions:', Object.keys(regionValues).length, 
                'Quesiti:', quesitiList.length, 
                'Gender regions:', Object.keys(regionGender).length);
    
    // Re-join data with GeoJSON if already loaded
    if (geojsonData) {
      console.log('🔄 GeoJSON already loaded, re-joining with CSV data for year', selectedYear);
      joinGeoJSONData(geojsonData);
      updateSvgRegionOpacityFromAffluenza();
    } else {
      // Load GeoJSON if not already loaded
      loadAndJoinGeoJSON();
    }
    
    // Update timeline colors
    updateTimelineColors();
    
    // Force redraw to update all charts (affluenza, voti SI/NO, gender)
    console.log('🎨 Forcing redraw to update all charts');
    redraw();
  }).catch(err => {
    console.error('❌ Error loading CSV for year', selectedYear, ':', err);
    console.warn('Could not load CSV:', err);
    // Still redraw even if CSV fails to show current state
    redraw();
  });
}



// ----- Debug panel utilities (visible on page) -----
function createDebugPanel() {
  // Debug panel disabled - hide if exists
  const existingPanel = document.getElementById('debug-panel');
  if (existingPanel) {
    existingPanel.style.display = 'none';
  }
  return;
}

function debugLog(msg, isError) {
  try {
    console[isError ? 'error' : 'log']('[debug] ' + msg);
    const panel = document.getElementById('debug-panel');
    if (!panel) return;
    const line = document.createElement('div');
    line.textContent = (new Date()).toLocaleTimeString() + ' â€" ' + msg;
    line.style.color = isError ? '#b00020' : '#111';
    line.style.marginBottom = '6px';
    panel.insertBefore(line, panel.firstChild);
  } catch (e) {
    console.log('debugLog failed', e);
  }
}

// Draw 3 separate windows for SEZIONE 3 charts
function drawSezione3Background() {
  const navbarHeight = 100;
  const sliderHeight = 130; // Space for slider, year labels and back button at bottom // Space for timeline and visible slider at bottom
  const cardX = 0;
  const cardY = navbarHeight;
  const cardWidth = width;
  const cardHeight = height - navbarHeight - sliderHeight;
  const sectionStartY = cardY + 10; // Same as quesiti window to align them
  const bottomPadding = 3; // Same as quesiti window
  
  const chartAreaLeft = cardX + cardWidth * 0.67 + 5;
  const chartAreaWidth = cardWidth * 0.33 - 40;
  
  push();
  const bgPadding = 10;
  const windowSpacing = 10;
  
  const availableTop = sectionStartY;
  const availableBottom = cardY + cardHeight - bottomPadding; // Ensure no overlap with timeline
  const totalAvailableHeight = availableBottom - availableTop;
  
  // All windows same height - divide available space equally, but reduce by 5% to make them slightly smaller
  const windowHeight = ((totalAvailableHeight - windowSpacing * 2) / 3) * 0.95; // 5% smaller windows

  // Calculate quesitiWindowTop using the same method as drawQuesitiWindow to align windows
  const presidentSliderHeight = 250; // Same as in drawQuesitiWindow
  const quesitiWindowSpacing = 20; // Same as in drawQuesitiWindow
  const totalWindowsHeightQuesiti = totalAvailableHeight - 20; // Same as in drawQuesitiWindow
  const quesitiWindowTop = availableTop + (totalAvailableHeight - totalWindowsHeightQuesiti) / 2;
  
  // Window 1: Affluenza chart (top) - align with quesiti window
  const window1Top = quesitiWindowTop;
  push();
  noFill();
  stroke(THEME_BLUE[0], THEME_BLUE[1], THEME_BLUE[2], 220);
  strokeWeight(1);
  rect(chartAreaLeft + bgPadding, window1Top, chartAreaWidth - bgPadding * 2, windowHeight);
  pop();
  
  // Window 2: Pie chart (middle) - same size
  const window2Top = window1Top + windowHeight + windowSpacing;
  push();
  noFill();
  stroke(THEME_BLUE[0], THEME_BLUE[1], THEME_BLUE[2], 220);
  strokeWeight(1);
  rect(chartAreaLeft + bgPadding, window2Top, chartAreaWidth - bgPadding * 2, windowHeight);
  pop();
  
  // Window 3: Gender chart (bottom) - same size
  const window3Top = window2Top + windowHeight + windowSpacing;
  push();
  noFill();
  stroke(THEME_BLUE[0], THEME_BLUE[1], THEME_BLUE[2], 220);
  strokeWeight(1);
  rect(chartAreaLeft + bgPadding, window3Top, chartAreaWidth - bgPadding * 2, windowHeight);
  pop();
  
  // Store window positions per le altre funzioni - all use same height now
  window.sezione3Window1Top = window1Top;
  window.sezione3Window2Top = window2Top;
  window.sezione3Window3Top = window3Top;
  window.sezione3WindowHeight = windowHeight; // Same height for all windows
  window.sezione3ChartAreaLeft = chartAreaLeft;
  window.sezione3ChartAreaWidth = chartAreaWidth;
  window.sezione3BgPadding = bgPadding;
  
  pop();
}

// Draw gradient showing affluenza color scale (vertical design)
// drawAffluenzaGradient removed (legend not needed for this visual design)

// Calculate affluenza (use selected region if available, otherwise national total or average)
function calculateTotalAffluenza() {
  if (!regionValues || Object.keys(regionValues).length === 0) {
    return null;
  }
  
  // Priority 1: If a region is selected, use that region's affluenza
  if (selectedRegion && geojsonData && selectedRegion.properties) {
    const feature = selectedRegion;
    const name = feature.properties.reg_name || 
                 feature.properties.denominazione_reg || 
                 feature.properties.denominazione || 
                 feature.properties.nome || 
                 null;
    
    if (name) {
      // Use the same matching logic as for pie chart
      let matchedAffluenzaKey = null;
      let matchedAffluenza = null;
      
      // Try direct mapping from REGION_NAME_MAP
      if (REGION_NAME_MAP[name]) {
        const csvKey = REGION_NAME_MAP[name];
        if (regionValues[csvKey] !== undefined && regionValues[csvKey] !== null) {
          matchedAffluenzaKey = csvKey;
          matchedAffluenza = regionValues[csvKey];
        }
      }
      
      // Try normalized name
      if (!matchedAffluenzaKey) {
        const normalizedName = normalizeName(name);
        if (regionValues[normalizedName] !== undefined && regionValues[normalizedName] !== null) {
          matchedAffluenzaKey = normalizedName;
          matchedAffluenza = regionValues[normalizedName];
        }
      }
      
      // Try uppercase
      if (!matchedAffluenzaKey) {
        const upperName = name.toUpperCase();
        if (regionValues[upperName] !== undefined && regionValues[upperName] !== null) {
          matchedAffluenzaKey = upperName;
          matchedAffluenza = regionValues[upperName];
        }
      }
      
      // Try handling "/" variants
      if (!matchedAffluenzaKey && name.includes('/')) {
        const firstPart = name.split('/')[0].trim();
        const firstPartUpper = firstPart.toUpperCase();
        if (regionValues[firstPartUpper] !== undefined && regionValues[firstPartUpper] !== null) {
          matchedAffluenzaKey = firstPartUpper;
          matchedAffluenza = regionValues[firstPartUpper];
        }
        // Also try with map
        if (!matchedAffluenzaKey && REGION_NAME_MAP[firstPart]) {
          const csvKey = REGION_NAME_MAP[firstPart];
          if (regionValues[csvKey] !== undefined && regionValues[csvKey] !== null) {
            matchedAffluenzaKey = csvKey;
            matchedAffluenza = regionValues[csvKey];
          }
        }
      }
      
      // Try fuzzy matching against all keys
      if (!matchedAffluenzaKey) {
        const normalizedName = normalizeName(name);
        for (const csvKey of Object.keys(regionValues || {})) {
          const normalizedCSVKey = normalizeName(csvKey);
          if (normalizedName === normalizedCSVKey || 
              normalizedName.includes(normalizedCSVKey) || 
              normalizedCSVKey.includes(normalizedName)) {
            matchedAffluenzaKey = csvKey;
            matchedAffluenza = regionValues[csvKey];
            break;
          }
        }
      }
      
      // Also try getting from feature properties directly
      if (!matchedAffluenzaKey && feature.properties.affluenza !== undefined && feature.properties.affluenza !== null) {
        matchedAffluenza = Number(feature.properties.affluenza);
      }
      
      if (matchedAffluenza !== null && matchedAffluenza !== undefined && isFinite(matchedAffluenza) && matchedAffluenza > 0) {
        return matchedAffluenza;
      }
    }
  }
  
  // Priority 2: Check if we have a national total (ITALIA)
  if (regionValues['ITALIA'] !== undefined && regionValues['ITALIA'] !== null && isFinite(regionValues['ITALIA']) && regionValues['ITALIA'] > 0) {
    return regionValues['ITALIA'];
  }
  
  // Priority 3: Calculate average affluenza from all regions
  const affluenzaValues = Object.values(regionValues).filter(v => v !== null && v !== undefined && isFinite(v) && v > 0);
  
  if (affluenzaValues.length === 0) {
    return null;
  }
  
  const sum = affluenzaValues.reduce((a, b) => a + b, 0);
  const average = sum / affluenzaValues.length;
  
  return average;
}

// Calculate affluenza value to show in the chart, taking into account the selected quesito (if any)
// - Se NON c'Ã¨ un quesito selezionato: usa l'affluenza totale (logica esistente)
// - Se c'Ã¨ un quesito selezionato:
//    * con regione selezionata: (votanti M+F per quel quesito in quella regione) / (votanti M+F totali della regione)
//    * senza regione selezionata: (votanti M+F per quel quesito in tutta Italia) / (votanti M+F totali nazionali)
function calculateAffluenzaForChart() {
  // Nessun quesito selezionato â†' affluenza totale classica
  if (selectedQuesito === null) {
    return calculateTotalAffluenza();
  }

  // Prova prima a calcolare affluenza per regione + quesito
  if (selectedRegion && geojsonData && selectedRegion.properties) {
    const feature = selectedRegion;
    const name = feature.properties.reg_name ||
                 feature.properties.denominazione_reg ||
                 feature.properties.denominazione ||
                 feature.properties.nome ||
                 null;

    if (name && regionQuesitoGender) {
      let matchedRegionKey = null;

      // 1) Mappatura diretta tramite REGION_NAME_MAP (se esiste)
      if (REGION_NAME_MAP && REGION_NAME_MAP[name]) {
        const csvKey = REGION_NAME_MAP[name];
        if (regionQuesitoGender[csvKey]) {
          matchedRegionKey = csvKey;
        }
      }

      // 2) Nome normalizzato
      if (!matchedRegionKey && typeof normalizeName === 'function') {
        const normalizedName = normalizeName(name);
        if (regionQuesitoGender[normalizedName]) {
          matchedRegionKey = normalizedName;
        }
      }

      // 3) Nome maiuscolo
      if (!matchedRegionKey) {
        const upperName = name.toUpperCase();
        if (regionQuesitoGender[upperName]) {
          matchedRegionKey = upperName;
        }
      }

      // 4) Fallback: cerca per similaritÃ  sulle chiavi esistenti
      if (!matchedRegionKey) {
        const allKeys = Object.keys(regionQuesitoGender);
        const normalizedTarget = typeof normalizeName === 'function' ? normalizeName(name) : name.toUpperCase();
        for (const key of allKeys) {
          const normKey = typeof normalizeName === 'function' ? normalizeName(key) : key.toUpperCase();
          if (normKey === normalizedTarget || normKey.includes(normalizedTarget) || normalizedTarget.includes(normKey)) {
            matchedRegionKey = key;
            break;
          }
        }
      }

      if (matchedRegionKey &&
          regionQuesitoGender[matchedRegionKey] &&
          regionQuesitoGender[matchedRegionKey][selectedQuesito]) {

        const qData = regionQuesitoGender[matchedRegionKey][selectedQuesito];
        const numVotantiQ = (qData.maschi || 0) + (qData.femmine || 0);

        // Denominatore: tutti i votanti della regione (indipendentemente dal quesito)
        let denom = 0;
        if (regionGender && regionGender[matchedRegionKey]) {
          denom = (regionGender[matchedRegionKey].maschi || 0) + (regionGender[matchedRegionKey].femmine || 0);
        }

        if (denom > 0 && numVotantiQ > 0) {
          return (numVotantiQ / denom) * 100;
        }
      }
    }
  }

  // Nessuna regione o dati mancanti â†' usa livello nazionale per quesito
  if (quesitoGender && quesitoGender[selectedQuesito]) {
    const qNat = quesitoGender[selectedQuesito];
    const numVotantiQNat = (qNat.maschi || 0) + (qNat.femmine || 0);
    const denomNat = (totalMaschi || 0) + (totalFemmine || 0);

    if (denomNat > 0 && numVotantiQNat > 0) {
      return (numVotantiQNat / denomNat) * 100;
    }
  }

// Fallback finale: se non riusciamo a calcolare affluenza per quesito, mostra quella totale
  return calculateTotalAffluenza();
}


// Placeholder generico con omino grigio quando i dati non sono disponibili
function drawNoDataPlaceholder(windowTop, windowHeight, mainMessage) {
  if (!window.sezione3ChartAreaLeft || !window.sezione3ChartAreaWidth || !omino3Img) {
    return;
  }

  const chartAreaLeft  = window.sezione3ChartAreaLeft;
  const chartAreaWidth = window.sezione3ChartAreaWidth;
  const bgPadding      = window.sezione3BgPadding || 10;

  const centerX = chartAreaLeft + chartAreaWidth / 2;
  const centerY = windowTop + windowHeight / 2;

  // Mantieni le proporzioni originali dell'SVG
  const maxH = windowHeight * 0.45;
  const maxW = chartAreaWidth * 0.35;
  const aspect = omino3Img.width / omino3Img.height || 1;

  let drawW = maxW;
  let drawH = drawW / aspect;

  if (drawH > maxH) {
    drawH = maxH;
    drawW = drawH * aspect;
  }

  push();
  imageMode(CENTER);
  // Omino grigio (lo stile grigio è già nell'SVG, quindi niente filtro colore qui)
  image(omino3Img, centerX, centerY - drawH * 0.1, drawW, drawH);

  // Testo "Dati non disponibili" più in basso rispetto all'omino
  noStroke();
  fill(20, 50, 100);
  textFont('STIX Two Text');
  textAlign(CENTER, TOP);
  textSize(16);
  text(mainMessage || 'Dati non disponibili', centerX, centerY + drawH * 0.6);

  pop();
}


function drawAffluenzaChart() {
  // 1. Definizioni colori
  const cLightBlue = color(200, 220, 242); 
  const cBlue = color(30, 82, 166);        
  const cDark = color(22, 50, 100);
  const cYellow = color(255, 183, 0);

  // 2. Controllo e Calcolo Valori
  if (!window.sezione3Window1Top) return;

  const chartAreaLeft = window.sezione3ChartAreaLeft;
  const chartAreaWidth = window.sezione3ChartAreaWidth;
  const bgPadding = window.sezione3BgPadding;
  const windowTop = window.sezione3Window1Top;
  const windowHeight = window.sezione3WindowHeight;

  const windowLeft = chartAreaLeft + bgPadding;
  const windowWidth = chartAreaWidth - bgPadding * 2;
  const affluenzaChartX = windowLeft + windowWidth / 2;
  const radius = getAffluenzaSemicircleRadius(); 
  const affluenzaChartY = windowTop + windowHeight * 0.65; 

  let affluenza = calculateAffluenzaForChart();
  
  if (typeof affluenza === 'string') affluenza = parseFloat(affluenza);
  if (affluenza === null || affluenza === undefined || !isFinite(affluenza)) return;

  const startAngle = PI;
  const endAngle = 2 * PI;
  const totalAngle = PI;
  const progressAngle = Math.min(startAngle + (affluenza / 100) * totalAngle, endAngle);
  const centerX = affluenzaChartX;
  const centerY = affluenzaChartY;

  // 3. Disegna SFONDO (Arco Grigio)
  push();
  stroke(0, 0, 0, 20);
  strokeWeight(18);
  strokeCap(ROUND); // Lo sfondo lo lasciamo tutto tondo per bellezza
  noFill();
  arc(centerX, centerY, radius * 2, radius * 2, startAngle, endAngle);
  pop();

  // 4. Disegna ARCO CON GRADIENTE (Misto: Inizio Tondo, Fine Piatta)
  push();
  strokeWeight(18);
  strokeCap(SQUARE); // ✅ IMPORTANTE: Usiamo SQUARE per default (fine piatta)
  noFill();

  if (progressAngle > startAngle) {
    const steps = 80;
    const angleSpan = progressAngle - startAngle;
    const fullSpan = endAngle - startAngle;
    
    // A. Disegna il gradiente a segmenti
    for (let i = 0; i < steps; i++) {
      const t1 = i / steps;
      const t2 = (i + 1) / steps;
      
      const a1 = startAngle + t1 * angleSpan;
      const a2 = startAngle + t2 * angleSpan;
      
      const globalT = (a1 - startAngle) / fullSpan; 
      const col = lerpColor(cLightBlue, cBlue, globalT);
      
      stroke(col);
      // Piccola sovrapposizione per evitare buchi
      arc(centerX, centerY, radius * 2, radius * 2, a1, a2 + 0.015);
    }

    // B. Aggiungi MANUALMENTE il "tappo" rotondo solo all'inizio (0%)
    // Disegniamo un punto (point) dello spessore della linea esattamente all'inizio
    stroke(cLightBlue); // Colore iniziale
    strokeWeight(18);   // Stesso spessore dell'arco
    strokeCap(ROUND);
    // Calcoliamo le coordinate esatte dell'inizio dell'arco (a sinistra)
    const startX = centerX + radius * cos(startAngle);
    const startY = centerY + radius * sin(startAngle);
    point(startX, startY);
  }
  pop();

  // 5. Asticella (Needle)
  push();
  stroke(cYellow);
  strokeWeight(4);
  strokeCap(ROUND);
  const indicatorAngle = progressAngle;
  const rOuter = radius + 18;
  const rInner = radius - 18;
  line(
    centerX + rInner * cos(indicatorAngle), centerY + rInner * sin(indicatorAngle),
    centerX + rOuter * cos(indicatorAngle), centerY + rOuter * sin(indicatorAngle)
  );
  pop();

  // 6. Testi e Etichette
  push();
  noStroke();
  fill(cBlue);
  if (typeof stixFont !== 'undefined') textFont(stixFont);
  textSize(45);
  textAlign(CENTER, CENTER);
  text(affluenza.toFixed(1) + "%", centerX, centerY);
  pop();

  push();
  textSize(14);
  fill(cBlue);
  textAlign(CENTER, CENTER);
  text("0%", centerX - radius - 25, centerY);
  text("100%", centerX + radius + 25, centerY);
  pop();

  // Titolo
  const titleX = chartAreaLeft + chartAreaWidth - bgPadding - 8;
  const titleY = windowTop + 8;
  push();
  textAlign(RIGHT, TOP);
  textSize(20);
  fill(cDark);
  if (typeof stixFont !== 'undefined') textFont(stixFont);
  text("AFFLUENZA", titleX, titleY);
  pop();
}




// Helper: draw a split semi-circle (left portion = percentLeft, right = remainder)
function drawSplitSemicircle(cx, cy, radius, percentLeft, colorLeft, colorRight, strokeW = 20) {
  const startAngle = PI;
  const endAngle = 2 * PI;
  const semiSpan = PI;
  const pct = constrain(percentLeft, 0, 100) / 100;
  const stop = startAngle + pct * semiSpan;

  push();
  translate(cx, cy);

  // shadow
  noStroke();
  fill(0, 0, 0, 0);
  arc(1, 1, radius * 2, radius * 2, startAngle, endAngle);

  // background arc
  // (removed grey background arc to keep semicircle clean)

  // left arc
  if (Array.isArray(colorLeft)) stroke(color(colorLeft[0], colorLeft[1], colorLeft[2]));
  else stroke(colorLeft.levels ? colorLeft : color(colorLeft));
  strokeWeight(strokeW);
  strokeCap(ROUND);
  arc(0, 0, radius * 2, radius * 2, startAngle, stop);

  // right arc
  if (Array.isArray(colorRight)) stroke(color(colorRight[0], colorRight[1], colorRight[2]));
  else stroke(colorRight.levels ? colorRight : color(colorRight));
  strokeWeight(strokeW);
  strokeCap(ROUND);
  arc(0, 0, radius * 2, radius * 2, stop, endAngle);


  pop();
}

// Helper to compute a shared semicircle radius so all three charts match
function getCommonSemicircleRadius() {
  const chartAreaWidth = window.sezione3ChartAreaWidth || (width * 0.33);
  const windowH = window.sezione3WindowHeight || Math.max(120, height * 0.18);
  // Keep it compact so semicircles fit comfortably in each window
  // Increased size for better visibility
  return Math.min(chartAreaWidth * 0.35, windowH * 0.50, 80);
}

// Helper to compute radius specifically for affluenza chart (larger)
function getAffluenzaSemicircleRadius() {
  const chartAreaWidth = window.sezione3ChartAreaWidth || (width * 0.33);
  const windowH = window.sezione3WindowHeight || Math.max(120, height * 0.18);
  // Larger radius for affluenza chart
  return Math.min(chartAreaWidth * 0.40, windowH * 0.55, 90);
}

// Draw pie chart comparing SI and NO votes for 2025
function drawPieChart() {
  // Determine which data to use: selected quesito, selected region, or national totals
  let votiSi = 0, votiNo = 0, chartTitle, regionName = null;

  // Priority 1: se c'è un quesito selezionato, usa quello (logica invariata)
  if (selectedQuesito !== null && quesitiVotes[selectedQuesito]) {
    votiSi = quesitiVotes[selectedQuesito].si || 0;
    votiNo = quesitiVotes[selectedQuesito].no || 0;
    chartTitle = `Quesito ${selectedQuesito} - Voti Referendum}`;
    regionName = null;

  } else if (selectedRegion) {
    // Priority 2: se c'è una regione selezionata, prova a trovare i voti
    let regionNameFromFeature = null;
    
    // Estrai il nome della regione dal feature GeoJSON
    if (typeof selectedRegion === 'object' && selectedRegion.properties) {
      regionNameFromFeature = selectedRegion.properties.reg_name || 
                              selectedRegion.properties.denominazione_reg || 
                              selectedRegion.properties.denominazione || 
                              selectedRegion.properties.nome || null;
    } else if (typeof selectedRegion === 'string') {
      regionNameFromFeature = selectedRegion;
    }
    
    if (regionNameFromFeature) {
      regionName = regionNameFromFeature;
      let matchedVotes = null;
      
      // Prova a trovare i voti con vari metodi di matching
      if (regionVotes && regionVotes[regionNameFromFeature]) {
        matchedVotes = regionVotes[regionNameFromFeature];
      } else if (regionVotes && REGION_NAME_MAP[regionNameFromFeature] && regionVotes[REGION_NAME_MAP[regionNameFromFeature]]) {
        matchedVotes = regionVotes[REGION_NAME_MAP[regionNameFromFeature]];
      } else if (regionVotes) {
        // Prova normalizzazione
        const normalizedName = normalizeName(regionNameFromFeature);
        for (const key of Object.keys(regionVotes)) {
          if (normalizeName(key) === normalizedName) {
            matchedVotes = regionVotes[key];
            break;
          }
        }
      }
      
      if (matchedVotes) {
        votiSi = matchedVotes.si || 0;
        votiNo = matchedVotes.no || 0;
      } else {
        // Fallback: usa i totali nazionali
        votiSi = totalVotiSi || 0;
        votiNo = totalVotiNo || 0;
      }
    } else {
      // Fallback: usa i totali nazionali
      votiSi = totalVotiSi || 0;
      votiNo = totalVotiNo || 0;
      regionName = null;
    }
    
    chartTitle = 'VOTI REFERENDUM';

  } else {
    // Fallback: usa i totali nazionali
    votiSi = totalVotiSi || 0;
    votiNo = totalVotiNo || 0;
    chartTitle = 'VOTI REFERENDUM' ;
    regionName = null;
  }

  // Ensure votiSi and votiNo are numbers
  votiSi = Number(votiSi) || 0;
  votiNo = Number(votiNo) || 0;

  // Use window 2 (middle window) for pie chart
  if (!window.sezione3Window2Top) return; // Wait for background to be drawn

  const chartAreaLeft   = window.sezione3ChartAreaLeft;
  const chartAreaWidth  = window.sezione3ChartAreaWidth;
  const bgPadding       = window.sezione3BgPadding;
  const windowTop       = window.sezione3Window2Top;
  const windowHeight    = window.sezione3WindowHeight;

  const windowWidthHalf = (chartAreaWidth - bgPadding * 2) /2;
  const leftHalfX       = chartAreaLeft + bgPadding;
  const rightHalfX      = chartAreaLeft + bgPadding + windowWidthHalf;

  const chartX          = chartAreaLeft + chartAreaWidth / 2;
  const titleHeight     = 20;
  const availableHeight = windowHeight - titleHeight - 15;
  const radius          = getCommonSemicircleRadius();
  const bottomPadding   = 10; // Padding dal fondo della finestra

  // Baseline at the bottom of the window
  const baselineY          = windowTop + windowHeight - bottomPadding;
  const pieChartTitleStart = windowTop + 8;

  // Se non ci sono dati, mostra omino grigio al posto del grafico
  if (votiSi === 0 && votiNo === 0) {
    drawNoDataPlaceholder(windowTop, windowHeight, 'Dati SI/NO non disponibili');
    return;
  }

  const total = votiSi + votiNo;
  if (total === 0 || !isFinite(total)) {
    drawNoDataPlaceholder(windowTop, windowHeight, 'Dati SI/NO non disponibili');
    return;
  }

  const siPercent = (votiSi / total) * 100;
  const noPercent = (votiNo / total) * 100;

  push();

  // Clip alla finestra dei SI/NO
  try {
    drawingContext.save();
    const clipLeft = chartAreaLeft + bgPadding;
    const clipTop  = windowTop;
    const clipW    = chartAreaWidth - bgPadding * 2;
    const clipH    = windowHeight;
    drawingContext.beginPath();
    drawingContext.rect(clipLeft, clipTop, clipW, clipH);
    drawingContext.clip();
  } catch (e) {}

  // Titolo
fill("#1B4A95");
  noStroke();
  textSize(20);
  textFont('STIX Two Text');
  const pieTitleX = chartAreaLeft + chartAreaWidth - bgPadding - 8;
  textAlign(RIGHT, TOP);
  text(chartTitle, pieTitleX, pieChartTitleStart);

  // Sottotitolo
  let subtitle = null;
  if (selectedQuesito !== null && regionName) {
    subtitle = `Quesito ${selectedQuesito} - ${regionName}`;
  } else if (selectedQuesito !== null) {
    subtitle = `Quesito ${selectedQuesito} - Italia`;
  } else if (regionName) {
    subtitle = regionName;
  }
  
  if (subtitle) {
    textAlign(RIGHT, TOP);
    textSize(16);
    fill("#1B4A95");
    text(subtitle, pieTitleX, pieChartTitleStart + 22);
  }

  // Layout con omini + barre - barre partono dal fondo
  const maxBarHeight = Math.min(radius * 1.0, availableHeight * 0.5); // Barre più alte
  const barWidth     = radius * 0.5;

  const gapBetweenBars = radius * 0.7;
  const leftBarX  = chartX - gapBetweenBars / 2;
  const rightBarX = chartX + gapBetweenBars / 2;

  const siBarHeight = (siPercent / 100) * maxBarHeight;
  const noBarHeight = (noPercent / 100) * maxBarHeight;

  function drawPersonIcon(px, py, personHeight, img) {
    if (!img) return;
    push();
    imageMode(CENTER);
    const imgAspectRatio = img.width / img.height;
    const imgWidth = personHeight * imgAspectRatio;
    image(img, px, py - personHeight / 2, imgWidth, personHeight);
    pop();
  }

  rectMode(CORNER);

  // SI (giallo) - barra parte dal fondo
  push();
  fill(THEME_YELLOW[0], THEME_YELLOW[1], THEME_YELLOW[2]);
  noStroke();
  const siBarY = baselineY - siBarHeight; // Parte dal fondo
  rect(leftBarX - barWidth / 2, siBarY, barWidth, siBarHeight);
  pop();

  // NO (blu) - barra parte dal fondo
  push();
  fill(THEME_BLUE[0], THEME_BLUE[1], THEME_BLUE[2]);
  noStroke();
  const noBarY = baselineY - noBarHeight; // Parte dal fondo
  rect(rightBarX - barWidth / 2, noBarY, barWidth, noBarHeight);
  pop();

  // Omini più grandi
  const personHeight     = Math.min(radius * 1.3, maxBarHeight * 1.2); // Omini più grandi
  const personBaseOffset = radius * 0.05;

  drawPersonIcon(leftBarX,  siBarY - personBaseOffset, personHeight, omino1Img);
  drawPersonIcon(rightBarX, noBarY  - personBaseOffset, personHeight, omino2Img);

  // Percentuali ai lati - posizionate sopra le barre
  textAlign(LEFT, CENTER);
  textSize(16);
  textStyle(BOLD);

  const siLabelX       = leftBarX - barWidth / 2 - 45;
  const commonLabelY   = baselineY - maxBarHeight / 2; // Centrato rispetto all'altezza massima delle barre
  const siLabelY       = commonLabelY;
  fill(THEME_YELLOW[0], THEME_YELLOW[1], THEME_YELLOW[2]);
  text(`${siPercent.toFixed(1)}%`, siLabelX, siLabelY);

  textAlign(RIGHT, CENTER);
  const noLabelX = rightBarX + barWidth / 2 + 45;
  const noLabelY = commonLabelY;
  fill(THEME_BLUE[0], THEME_BLUE[1], THEME_BLUE[2]);
  text(`${noPercent.toFixed(1)}%`, noLabelX, noLabelY);

  // Etichette "SI" e "NO"
  textSize(20);
  textFont('Stix Two Text');
  textStyle(BOLD);

  textAlign(LEFT, BOTTOM);
  fill(THEME_YELLOW[0], THEME_YELLOW[1], THEME_YELLOW[2]);
  const commonLabelTextY = commonLabelY - 3;
  text('SI', siLabelX, commonLabelTextY);

  textAlign(RIGHT, BOTTOM);
  fill(THEME_BLUE[0], THEME_BLUE[1], THEME_BLUE[2]);
  text('NO', noLabelX, commonLabelTextY);

  try { drawingContext.restore(); } catch (e) {}

  pop();
}


// Draw gender chart with stick figures (3 males and 3 females)
function drawGenderChart() {
  let maschi = 0, femmine = 0, chartTitle = 'VOTANTI PER GENERE', regionName = null;

  // --- CASO 1: QUESITO + REGIONE ---
  if (selectedQuesito !== null && selectedRegion && geojsonData && selectedRegion.properties) {
    const feature = selectedRegion;
    const name = feature.properties.reg_name || 
                 feature.properties.denominazione_reg || 
                 feature.properties.denominazione || 
                 feature.properties.nome || null;

    regionName = name;
    let matchedKey = null;

    // Trova il match nel CSV
    if (REGION_NAME_MAP[name] && regionQuesitoGender[REGION_NAME_MAP[name]] && regionQuesitoGender[REGION_NAME_MAP[name]][selectedQuesito]) {
      matchedKey = REGION_NAME_MAP[name];
    } else if (regionQuesitoGender[normalizeName(name)] && regionQuesitoGender[normalizeName(name)][selectedQuesito]) {
      matchedKey = normalizeName(name);
    } else if (regionQuesitoGender[name.toUpperCase()] && regionQuesitoGender[name.toUpperCase()][selectedQuesito]) {
      matchedKey = name.toUpperCase();
    }

    if (!matchedKey) {
      for (const csvKey of Object.keys(regionQuesitoGender)) {
        const normalizedCSVKey = normalizeName(csvKey);
        if (normalizedCSVKey.includes(normalizeName(name)) || normalizeName(name).includes(normalizedCSVKey)) {
          if (regionQuesitoGender[csvKey][selectedQuesito]) {
            matchedKey = csvKey;
            break;
          }
        }
      }
    }

    if (matchedKey) {
      const data = regionQuesitoGender[matchedKey][selectedQuesito];
      maschi = data.maschi || 0;
      femmine = data.femmine || 0;
    } else if (quesitoGender[selectedQuesito]) {
      // fallback nazionale quesito
      maschi = quesitoGender[selectedQuesito].maschi || 0;
      femmine = quesitoGender[selectedQuesito].femmine || 0;
      regionName = null;
    } else {
      maschi = totalMaschi || 0;
      femmine = totalFemmine || 0;
      regionName = null;
    }

  // --- CASO 2: SOLO QUESITO ---
  } else if (selectedQuesito !== null) {
    if (quesitoGender[selectedQuesito]) {
      maschi = quesitoGender[selectedQuesito].maschi || 0;
      femmine = quesitoGender[selectedQuesito].femmine || 0;
    } else {
      maschi = totalMaschi || 0;
      femmine = totalFemmine || 0;
    }

  // --- CASO 3: SOLO REGIONE ---
  } else if (selectedRegion && geojsonData && selectedRegion.properties) {
    const feature = selectedRegion;
    const name = feature.properties.reg_name || 
                 feature.properties.denominazione_reg || 
                 feature.properties.denominazione || 
                 feature.properties.nome || null;

    regionName = name;
    let matchedKey = null;

    if (REGION_NAME_MAP[name] && regionGender[REGION_NAME_MAP[name]]) matchedKey = REGION_NAME_MAP[name];
    if (!matchedKey && regionGender[name]) matchedKey = name;
    if (!matchedKey && regionGender[name.toUpperCase()]) matchedKey = name.toUpperCase();

    if (!matchedKey && name.includes('/')) {
      const firstPart = name.split('/')[0].trim();
      if (regionGender[firstPart]) matchedKey = firstPart;
      else if (REGION_NAME_MAP[firstPart] && regionGender[REGION_NAME_MAP[firstPart]]) matchedKey = REGION_NAME_MAP[firstPart];
    }

    if (!matchedKey) {
      const normalizedName = normalizeName(name);
      for (const csvKey of Object.keys(regionGender)) {
        if (normalizeName(csvKey) === normalizedName) {
          matchedKey = csvKey;
          break;
        }
      }
    }

    if (matchedKey) {
      maschi = regionGender[matchedKey].maschi || 0;
      femmine = regionGender[matchedKey].femmine || 0;
    } else {
      maschi = totalMaschi || 0;
      femmine = totalFemmine || 0;
      regionName = null;
    }

  // --- CASO 4: NESSUNA SELEZIONE â†' ITALIA ---
  } else {
    maschi = totalMaschi || 0;
    femmine = totalFemmine || 0;
    regionName = null;
  }

  // --- CALCOLO PERCENTUALI ---
  let total = maschi + femmine;
  const maschiPct = total > 0 ? (maschi / total) * 100 : 0;
  const femminePct = total > 0 ? (femmine / total) * 100 : 0;

  // --- DISEGNO GRAFICO ---
  if (!window.sezione3Window3Top) return;
  const chartAreaLeft = window.sezione3ChartAreaLeft;
  const chartAreaWidth = window.sezione3ChartAreaWidth;
  const bgPadding = window.sezione3BgPadding;
  const windowTop = window.sezione3Window3Top;
  const windowHeight = window.sezione3WindowHeight;
  const chartX = chartAreaLeft + chartAreaWidth / 2;

  // Se non ci sono dati, mostra placeholder
  if (maschi === 0 && femmine === 0) {
    drawNoDataPlaceholder(windowTop, windowHeight, 'Dati genere non disponibili');
    return;
  }

  const titleAreaHeight = 25;
  const symbolSize = 18;
  const rowSpacing = 8;
  const textHeight = 12;
  const labelHeight = 25;
  const totalSymbolsHeight = textHeight + symbolSize + rowSpacing + textHeight + symbolSize + labelHeight;
  const titleY = windowTop + 8;
  // Abbassa il grafico spostandolo più in basso nella finestra
  const chartY = windowTop + titleAreaHeight + (windowHeight - titleAreaHeight - totalSymbolsHeight) / 2 + textHeight + symbolSize / 2 + windowHeight * 0.15;

  const radius = getCommonSemicircleRadius();
  const centerX = chartX;
  const centerY = chartY + 40;

  push();
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(chartAreaLeft + bgPadding, windowTop, chartAreaWidth - bgPadding * 2, windowHeight);
  drawingContext.clip();

  fill(0, 71, 171);
  noStroke();
  textSize(20);
  textStyle(BOLD);
  const genderTitleX = chartAreaLeft + chartAreaWidth - bgPadding - 8;
  textAlign(RIGHT, TOP);
  text(chartTitle, genderTitleX, titleY);

  // Sottotitolo
  let subtitle = ' ';
  if (selectedQuesito !== null) {
    subtitle = `Quesito ${selectedQuesito}`;
    if (regionName) subtitle += ` " ${regionName}`;
    else subtitle += ` Italia`;
  } else if (regionName) {
    subtitle = regionName;
  }
  textAlign(RIGHT, TOP);
  textSize(16);
  fill("#1B4A95");
  text(subtitle, genderTitleX, titleY + 22);

  // Disegna l'arco
  drawSplitSemicircle(centerX, centerY, radius, maschiPct, THEME_BLUE, THEME_ORANGE, 16);

  const sideOffset = 70;
  const leftLabelX = centerX - radius - sideOffset;
  const rightLabelX = centerX + radius + sideOffset;
  // Alzo leggermente le etichette per centrarle meglio verticalmente senza il numero assoluto
  const labelTopY = centerY - radius * 0.8;
  const percentY = centerY - radius * 0.5;

  // --- MASCHI (UOMINI) ---
  push();
  textAlign(CENTER, TOP);
  
  // Titolo
  textSize(20);
  textFont('Stix Two Text');
  textStyle(BOLD);
  fill(THEME_BLUE[0], THEME_BLUE[1], THEME_BLUE[2]);
  text('UOMINI', leftLabelX, labelTopY);
  
  // Percentuale (INGRANDITA A 32px)
  textSize(32); 
  text(maschiPct.toFixed(1) + '%', leftLabelX, percentY);
  
  // Numero assoluto RIMOSSO
  pop();

  // --- FEMMINE (DONNE) ---
  push();
  textAlign(CENTER, TOP);
  textFont('Stix Two Text');
  textStyle(BOLD);
  
  // Titolo
  noStroke();
  fill(THEME_ORANGE[0], THEME_ORANGE[1], THEME_ORANGE[2]);
  textSize(20);
  text('DONNE', rightLabelX, labelTopY);
  
  // Percentuale (INGRANDITA A 32px)
  textSize(28);
  text(femminePct.toFixed(1) + '%', rightLabelX, percentY);
  
  // Numero assoluto RIMOSSO
  pop();

  drawingContext.restore();
  pop();
}



// Draw national totals gender chart at the bottom of the right window
function drawNationalTotalsGenderChart() {
  // Only show when no region is selected
  if (selectedRegion !== null) {
    return; // Don't draw if a region is selected
  }
  
  // Always use national totals
  const maschi = totalMaschi || 0;
  const femmine = totalFemmine || 0;
  const total = maschi + femmine;
  
  // Calculate percentages
  const maschiPct = total > 0 ? (maschi / total) * 100 : 0;
  const femminePct = total > 0 ? (femmine / total) * 100 : 0;
  
  // Position within the ballot card (same layout as other charts)
  const navbarHeight = 100;
  const sliderHeight = 130; // Space for slider, year labels and back button at bottom
  const cardMargin = 0; // No margin - full width (matching layout)
  const cardX = 0;
  const cardY = navbarHeight; // Start right after navbar (matching layout)
  const cardWidth = width;
  const cardHeight = height - navbarHeight - sliderHeight;
  const sectionStartY = cardY + 20; // Same as layout
  const bottomPadding = 3; // Minimized bottom padding to maximize window height
  
  const chartAreaLeft = cardX + cardWidth * 0.67 + 5;
  const chartAreaWidth = cardWidth * 0.33 - 20;
  const bgPadding = 15;
  
  // Use window 3 if available, otherwise calculate position
  let windowTop, windowHeight;
  if (window.sezione3Window3Top) {
    windowTop = window.sezione3Window3Top;
    windowHeight = window.sezione3WindowHeight;
  } else {
    // Fallback calculation
    windowTop = sectionStartY + 10;
    windowHeight = (cardY + cardHeight - bottomPadding - 5) - windowTop;
  }
  
  // Position at the bottom of window 3 - ensure it's visible
  const chartHeight = 130; // Height for the chart
  const bottomPaddingChart = 15; // Padding from bottom of window
  let chartY = windowTop + windowHeight - chartHeight - bottomPaddingChart;
  const chartX = chartAreaLeft + chartAreaWidth / 2; // Center horizontally
  
  // Ensure chartY is within bounds
  chartY = Math.max(windowTop + 10, Math.min(chartY, windowTop + windowHeight - chartHeight - 5));
  
  // Debug log - ALWAYS log to see what's happening
  console.log('ðŸ" drawNationalTotalsGenderChart (year=' + selectedYear + '): chartY=' + chartY + ', chartHeight=' + chartHeight + ', windowBottom=' + (windowTop + windowHeight) + ', maschi=' + maschi + ', femmine=' + femmine + ', totalMaschi=' + totalMaschi + ', totalFemmine=' + totalFemmine);
  
  // ALWAYS draw the chart, even if values are 0
  // This ensures it's visible for all years
  
  push();
  
  // Apply clipping to ensure everything stays inside window 3
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(chartAreaLeft + bgPadding, windowTop, chartAreaWidth - bgPadding * 2, windowHeight);
  drawingContext.clip();
  
  // Draw background rectangle to make chart area visible
  fill(255, 250, 235, 220); // Vintage yellowed paper
  stroke(THEME_BLUE[0], THEME_BLUE[1], THEME_BLUE[2], 220);
  strokeWeight(1);
  rect(chartAreaLeft + bgPadding + 5, chartY - 5, chartAreaWidth - bgPadding * 2 - 10, chartHeight);
  
  // Draw title - make sure it's visible with high contrast
  fill(22, 50, 100, 255);
  noStroke();
  textSize(10
  );
  textFont('Stix Two Text');
  textStyle(regular);
    textAlign(CENTER, TOP);
  const titleY = chartY + 5;
  text('Votanti Totali - ' + getYearDisplayName(selectedYear), chartX, titleY);
  
  
  // Start drawing from title
  let currentY = titleY + 40;
  
  // Draw percentage label for males
  textSize(14);
  textFont('STIX Two Text');
  textStyle(BOLD);
  fill(THEME_DARK[0], THEME_DARK[1], THEME_DARK[2], 250);
  textAlign(CENTER, BOTTOM);
  text(maschiPct.toFixed(1) + '%', chartX, currentY);
  currentY += 15;
  
  // Draw row of circles for males
  const maschiRowY = currentY;
  for (let i = 0; i < totalSymbols; i++) {
    const x = startX + i * symbolSpacing;
    const isColored = i < coloredMaschi;
    const symbolColor = isColored ? maschiColor : fadedColor;
    
    push();
    noStroke();
    fill(symbolColor);
    ellipse(x, maschiRowY, symbolSize, symbolSize);
  pop();
}
  currentY = maschiRowY + symbolSize + 8;
  
  // Draw percentage label for females
  text(femminePct.toFixed(1) + '%', chartX, currentY);
  currentY += 15;
  
  // Draw row of triangles for females
  const femmineRowY = currentY;
  for (let i = 0; i < totalSymbols; i++) {
    const x = startX + i * symbolSpacing;
    const isColored = i < coloredFemmine;
    const symbolColor = isColored ? femmineColor : fadedColor;
    
  push();
    noStroke();
    fill(symbolColor);
    const triangleSize = symbolSize;
    triangle(x, femmineRowY - triangleSize/2, 
             x - triangleSize/2, femmineRowY + triangleSize/2, 
             x + triangleSize/2, femmineRowY + triangleSize/2);
    pop();
  }
  currentY = femmineRowY + symbolSize + 8;
  
  // Draw labels
  textSize(11);
  textStyle(BOLD);
  fill(22, 50, 100, 250);
  textAlign(CENTER, TOP);
  text('Maschi', chartX, currentY);
  text('Femmine', chartX, currentY + 12);
  
  // Draw values
  textSize(10);
  textStyle(NORMAL);
  fill(22, 50, 100, 220);
  text(maschi.toLocaleString('it-IT'), chartX, currentY + 24);
  text(femmine.toLocaleString('it-IT'), chartX, currentY + 36);
  
  // Restore clipping
  drawingContext.restore();
  pop();
}

// Draw circles for males and triangles for females
function drawStickFigure(x, y, size, col, isMale) {
  push();
    noStroke();
  fill(col);
  
  if (isMale) {
    // Draw a circle/dot for males
    ellipse(x, y, size/2, size/2);
  } else {
    // Draw a triangle for females (pointing up)
    const triangleSize = size/2;
    triangle(x, y - triangleSize/2, 
             x - triangleSize/2, y + triangleSize/2, 
             x + triangleSize/2, y + triangleSize/2);
  }
  
  pop();
}

// Draw quesiti window on the left
function drawQuesitiWindow() {
  const quesiti2025 = quesitiList.length > 0 ? quesitiList : [];
  const titleColor = color(30, 82, 166);  // Blu per i titoli
  
  const navbarHeight = 100;
  const sliderHeight = 130; // Space for slider, year labels and back button at bottom
  const cardX = 0;
  const cardY = navbarHeight;
  const cardWidth = width;
  const cardHeight = height - navbarHeight - sliderHeight;
  const sectionStartY = cardY + 10;
  const bottomPadding = 3;
  
  const windowLeft = cardX + 40;
  const windowWidth = cardWidth * 0.34 - 60;
  
  const availableTop = sectionStartY;
  const availableBottom = cardY + cardHeight - bottomPadding;
  const totalAvailableHeight = availableBottom - availableTop;
  const bgPadding = 15;
  
  const presidentSliderHeight = 250; // Reduced from 280
  const windowSpacing = 20;
  const totalWindowsHeight = totalAvailableHeight - 20;
  const quesitiWindowHeight = totalWindowsHeight - presidentSliderHeight - windowSpacing - 60; // Reduced to make space for legend
  const quesitiWindowTop = availableTop + (totalAvailableHeight - totalWindowsHeight) / 2;
  const presidentWindowTop = quesitiWindowTop + quesitiWindowHeight + windowSpacing;

  push();
fill('rgba(45, 70, 160, 1)'); // Usa il var(--blue-color)
textSize(20); // Dimensione appropriata per un sottotitolo
textFont('STIX Two Text', 20);
textAlign(LEFT, TOP); // Centrato orizzontalmente, allineato in alto

// 1. Titolo del Box Quesiti (a sinistra, sotto la mappa)
// Posizionamento: centrato orizzontalmente nell'area della mappa (width * 0.34)
// Verticale: sotto la mappa, prima del contenuto dei quesiti (es. a Y = 420)
const mapAreaWidth = width * 0.34;
text("QUESITI", mapAreaWidth / 2-190, 130); 


pop();
  
  // Draw quesiti window
  push();
  noFill();
  stroke(THEME_BLUE[0], THEME_BLUE[1], THEME_BLUE[2], 220);
  strokeWeight(1);
  rect(windowLeft + bgPadding, quesitiWindowTop, windowWidth - bgPadding * 2, quesitiWindowHeight);
  
  pop();
  
  // Draw president window
  push();
  noFill();
  stroke(THEME_BLUE[0], THEME_BLUE[1], THEME_BLUE[2], 220);
  strokeWeight(1);
  //rect(windowLeft + bgPadding, presidentWindowTop, windowWidth - bgPadding * 2, presidentSliderHeight);
  pop();
  
  const startY = quesitiWindowTop + 30;
  const rightPaddingExtra = 30;
  const textEndX = windowLeft + windowWidth - bgPadding * 2 - rightPaddingExtra;
  const textStartX = windowLeft + bgPadding * 2 + 30;
  const maxTextWidth = textEndX - textStartX;
  
  const circleRadius = 15;
  const quesitiAreaTopPadding = circleRadius + 5;
  const quesitiAreaTop = startY + quesitiAreaTopPadding;
  const quesitiAreaBottom = quesitiWindowTop + quesitiWindowHeight - bgPadding;
  const quesitiAreaHeight = quesitiAreaBottom - quesitiAreaTop;
  
  const minQuesitoHeight = 40;
  const quesitiHeights = [];
  let totalQuesitiHeight = 0;
  
  // Calculate height per quesito
  textSize(18);
  quesiti2025.forEach((quesito) => {
    const words = quesito.testo.split(' ');
    let line = '';
    let lineCount = 1;
    for (let i = 0; i < words.length; i++) {
      const testLine = line + (line ? ' ' : '') + words[i];
      if (textWidth(testLine) > maxTextWidth && line.length > 0) {
        line = words[i];
        lineCount++;
      } else {
        line = testLine;
      }
    }
    const lineHeight = 23;
    const quesitoHeight = Math.max(minQuesitoHeight, 20 + lineCount * lineHeight);
    quesitiHeights.push(quesitoHeight);
    totalQuesitiHeight += quesitoHeight;
  });
  
  const needsScroll = totalQuesitiHeight > quesitiAreaHeight;
  const maxScrollOffset = needsScroll ? Math.max(0, totalQuesitiHeight - quesitiAreaHeight) : 0;
  quesitiScrollOffset = constrain(quesitiScrollOffset, 0, maxScrollOffset);
  
  // Clipping
  push();
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(windowLeft + bgPadding, startY - circleRadius, windowWidth - bgPadding * 2, quesitiAreaHeight + quesitiAreaTopPadding + circleRadius);
  drawingContext.clip();
  
  let currentY = startY - quesitiScrollOffset;
  
  quesiti2025.forEach((quesito, index) => {
    const quesitoHeight = quesitiHeights[index];
    const y = currentY;
    
    if (y + quesitoHeight < quesitiAreaTop || y > quesitiAreaBottom) {
      currentY += quesitoHeight;
      return;
    }
    
    const isSelected = selectedQuesito === quesito.numero;
    const isHovered = hoveredQuesito === quesito.numero && !isSelected;
    
    // Hover background (solo se non è già selezionato)
    if (isHovered) {
      push();
      fill(255, 183, 0, 20); // Sfondo giallo chiaro per hover
      noStroke();
      rect(windowLeft + bgPadding, y, windowWidth - bgPadding * 2, quesitoHeight);
      noFill();
      stroke(255, 183, 0, 150);
      strokeWeight(1.5);
      rect(windowLeft + bgPadding, y, windowWidth - bgPadding * 2, quesitoHeight);
      pop();
    }
    
    // Selection background
    if (isSelected) {
      push();
      fill(255, 183, 0, 40);
      noStroke();
      rect(windowLeft + bgPadding, y, windowWidth - bgPadding * 2, quesitoHeight);
      noFill();
      stroke(255, 183, 0, 220);
      strokeWeight(2);
      rect(windowLeft + bgPadding, y, windowWidth - bgPadding * 2, quesitoHeight);
      pop();
    }
    
    // Compute top Y for content alignment
    const contentY = y + 20; // top of first text line
    
    // Blue arrow (triangolino) aligned
    push();
    fill(22, 50, 100);
    noStroke();
    const arrowX = windowLeft + bgPadding;
    const arrowY = contentY + 5; // vertical offset to center with text
    const arrowSize = 10;
    beginShape();
    vertex(arrowX, arrowY - arrowSize/2);
    vertex(arrowX + arrowSize * 0.6, arrowY);
    vertex(arrowX, arrowY + arrowSize/2);
    endShape(CLOSE);
    pop();
    
    // Number aligned
    push();
    noStroke();
    fill(255, 140, 0);
    textStyle(BOLD);
    textSize(20);
    if (stixFontBold) textFont(stixFontBold);
    else if (stixFont) textFont(stixFont);
    else textFont('serif');
    textAlign(LEFT, TOP);
    const numberX = windowLeft + bgPadding * 2;
    const numberY = contentY; // allineato con il testo
    text(`${quesito.numero}.`, numberX, numberY);
    pop();
    
    // Text aligned
    push();
    noStroke();
    fill(titleColor);
    textStyle(NORMAL);
    textSize(18);
    textAlign(LEFT, TOP);
    let textY = contentY;
    const words = quesito.testo.split(' ');
    let line = '';
    for (let i = 0; i < words.length; i++) {
      const testLine = line + (line ? ' ' : '') + words[i];
      if (textWidth(testLine) > maxTextWidth && line.length > 0) {
        if (textY >= quesitiAreaTop && textY <= quesitiAreaBottom) text(line, textStartX, textY);
        line = words[i];
        textY += 25;
      } else {
        line = testLine;
      }
    }
    if (line && textY <= quesitiAreaBottom) text(line, textStartX, textY);
    pop();
    
    currentY += quesitoHeight;
  });
  
  drawingContext.restore();

  
  // Scrollbar
  if (needsScroll && maxScrollOffset > 0) {
    const scrollbarWidth = 6;
    const scrollbarX = windowLeft + windowWidth - bgPadding - scrollbarWidth;
    const scrollbarHeight = quesitiAreaHeight;
    const scrollbarY = quesitiAreaTop;
    fill(200,200,200,150);
    noStroke();
    rect(scrollbarX, scrollbarY, scrollbarWidth, scrollbarHeight);
    const thumbHeight = (quesitiAreaHeight / totalQuesitiHeight) * scrollbarHeight;
    const thumbY = scrollbarY + (quesitiScrollOffset / maxScrollOffset) * (scrollbarHeight - thumbHeight);
    fill(22,50,100,200);
    rect(scrollbarX, thumbY, scrollbarWidth, thumbHeight);
  }
  
  drawPresidentSlider(
    windowLeft + bgPadding, 
    presidentWindowTop, 
    windowWidth - bgPadding * 2, 
    presidentSliderHeight + 50);
  
  // Draw quorum legend below the boxes (not in a box)
  drawQuorumLegend(windowLeft + bgPadding, presidentWindowTop + presidentSliderHeight + 40, windowWidth - bgPadding * 2);
  
  pop();
}

// Draw quorum legend (small, without box)
function drawQuorumLegend(x, y, w) {

}

function drawPresidentSlider(x, y, w, h) {
  push();
  
  // 1. Reset delle zone cliccabili per questo frame
  presidentClickZones = [];
  
  // 2. Recupero Dati
  const yearKey = String(selectedYear);
  let presidenteData = contestoByYear[yearKey];
  
  if (!presidenteData && !isNaN(selectedYear)) {
    presidenteData = contestoByYear[parseInt(selectedYear)];
  }
  
  if (!presidenteData) {
    // Disegna comunque il box vuoto
    noFill(); stroke(30, 82, 166); strokeWeight(1);
    rect(x, y, w, h);
    fill(100); textSize(14); textAlign(CENTER, CENTER);
    text('Dati contesto non disponibili', x + w/2, y + h/2);
    pop();
    return;
  }

  // --- CONFIGURAZIONE VISIVA ---
  const borderColor = color(30, 82, 166); 
  const nameColor = color(255, 183, 0);   
  const titleColor = color(30, 82, 166);  
  const circleBgColor = color(255, 183, 0); 
  
  const imgSize = 100; 
  const padding = 20;
  
  // 3. DISEGNO BOX
  noFill();
  stroke(borderColor);
  strokeWeight(1);
  rect(x, y, w, h);
  
  // --- TITOLO CONTESTO ---
  fill(titleColor); 
  noStroke();
  textAlign(LEFT, TOP);
  textSize(20); 
  textStyle(BOLD);
  textFont('STIX Two Text');
  text("CONTESTO", x + 10, y + 10);

  // --- FUNZIONE INTERNA PER DISEGNARE UN PRESIDENTE ---
  function drawSinglePresident(pName, pRole, pImgFilename, px, py, align, pLink, type) {
    if (!pName) return;

    // Coordinate Immagine
    let imgCenterX;
    if (align === 'left') {
        imgCenterX = px + imgSize/2;
    } else {
        imgCenterX = px + w - imgSize/2 - padding; 
    }
    const imgCenterY = py;

    // --- ANIMAZIONE SMOOTH & HOVER ---
    let targetScale = 1.0; 
    
    // Check Hover: Usa DOM cursor per affidabilità
    if (dist(mouseX, mouseY, imgCenterX, imgCenterY) < imgSize/2) {
        document.body.style.cursor = 'pointer'; // FORZA IL CURSORE
        targetScale = 1.15; // Target zoom (115%)
    } else {
        // Se c'è un link testuale sotto e siamo sopra il testo, gestiamo dopo
    }

    // Aggiorna lo stato dell'animazione (lerp)
    if (presidentAnimState[type] !== undefined) {
        presidentAnimState[type] = lerp(presidentAnimState[type], targetScale, 0.15);
    } else {
        presidentAnimState[type] = 1.0;
    }

    const currentScale = presidentAnimState[type];

    // Gestione Click (URL) - per l'immagine
    if (pLink && pLink.length > 3) {
        presidentClickZones.push({ type: 'circle', x: imgCenterX, y: imgCenterY, r: imgSize/2, url: pLink, name: pName });
    }

    // --- DISEGNO IMMAGINE ---
    push();
    translate(imgCenterX, imgCenterY); 
    scale(currentScale); // Zoom fluido
    
    // Cerchio sfondo
    noStroke(); fill(circleBgColor);
    ellipse(0, 0, imgSize, imgSize); 

    // Immagine
    if (pImgFilename && pImgFilename.trim() !== '') {
        const img = presidenteImages[pImgFilename];
        if (img && img.width > 0) {
            drawingContext.save();
            drawingContext.beginPath();
            drawingContext.arc(0, 0, imgSize/2, 0, TWO_PI);
            drawingContext.clip();
            const aspect = img.width / img.height;
            let dw = imgSize; let dh = imgSize;
            if (aspect > 1) dh = imgSize / aspect; else dw = imgSize * aspect;          
            dw *= 1.0; dh *= 1.0;
            imageMode(CENTER);
            image(img, 0, 0, dw, dh);
            drawingContext.restore();
        } else {
             if (img && img.width === 0) loadPresidenteImages(presidenteData, true);
        }
    }
    pop(); 

    // --- POSIZIONE TESTI ---
    let textX;
    let alignMode;
    if (align === 'left') {
        textX = imgCenterX + imgSize/2 + 15; 
        alignMode = LEFT;
    } else {
        textX = imgCenterX - imgSize/2 - 15; 
        alignMode = RIGHT;
    }

    // Calcolo altezza testo
    const roleLines = pRole.split(" DEL");
    const hasSecondLine = roleLines.length > 1;
    let totalTextHeight = 22 + 6 + 15; 
    if (hasSecondLine) totalTextHeight += 18;

    let currentY = imgCenterY - (totalTextHeight / 2) + 8;

    push();
    textAlign(alignMode, BASELINE); 
    
    // NOME
    fill(nameColor); noStroke(); textSize(22); textStyle(ITALIC); textFont('STIX Two Text'); 
    text(pName, textX, currentY);
    
    // Click su Nome (Link testuale)
    const nameW = textWidth(pName); const nameH = 22; 
    let linkBoxX = (alignMode === LEFT) ? textX : textX - nameW;
    let linkBoxY = currentY - nameH + 5; 
    
    if (pLink && pLink.length > 3) {
        presidentClickZones.push({ type: 'rect', x: linkBoxX, y: linkBoxY, w: nameW, h: nameH, url: pLink, name: pName });
        // Se il mouse è sopra il nome, attiviamo anche qui la manina
        if (mouseX >= linkBoxX && mouseX <= linkBoxX + nameW && mouseY >= linkBoxY && mouseY <= linkBoxY + nameH) {
            document.body.style.cursor = 'pointer'; // FORZA IL CURSORE ANCHE QUI
            stroke(nameColor); strokeWeight(2);
            line(linkBoxX, currentY + 3, linkBoxX + nameW, currentY + 3); noStroke();
        }
    }

    currentY += 22; // Spazio

    // RUOLO
    fill(titleColor); textSize(18); textStyle(NORMAL); noStroke();
    if (hasSecondLine) {
        text(roleLines[0] + (pRole.includes("DELL") ? "" : ""), textX, currentY);
        currentY += 18; 
        text(pRole.replace(roleLines[0], "").trim(), textX, currentY);
    } else {
        text(pRole, textX, currentY);
    }
    pop();
  }

  // --- POSIZIONAMENTO CONTENUTI ---
  const titleOffset = 40; 
  const contentYStart = y + titleOffset;
  const availableContentH = h - titleOffset - 10;
  
  const repY = contentYStart + (availableContentH * 0.25); 
  const consY = contentYStart + (availableContentH * 0.75); 

  // 1. Presidente della Repubblica
  drawSinglePresident(
      presidenteData.presidenteRepubblica, 
      "Presidente della Repubblica", 
      presidenteData.imgRepubblica, 
      x + padding, 
      repY, 
      'left',
      presidenteData.linkRepubblica,
      'rep' 
  );

  // 2. Presidente del Consiglio
  drawSinglePresident(
      presidenteData.presidenteConsiglio, 
      "Presidente del Consiglio", 
      presidenteData.imgConsiglio, 
      x, 
      consY, 
      'right',
      presidenteData.linkConsiglio,
      'cons' 
  );

  pop();
}





function mouseWheel(event) {
  // Handle scrolling for quesiti list - use same coordinates as drawQuesitiWindow
  const navbarHeight = 100;
  const sliderHeight = 130; // Space for slider, year labels and back button at bottom
  const cardMargin = 0;
  const cardX = 0;
  const cardY = navbarHeight;
  const cardWidth = width;
  const cardHeight = height - navbarHeight - sliderHeight;
  const sectionStartY = cardY + 20;
  const bottomPadding = 3;
  const windowLeft = cardX + 20;
    const windowWidth = cardWidth * 0.34 - 40; // Width matching the left divider at 34%
  const bgPadding = 15;
  const presidentSliderHeight = 280;
  const windowSpacing = 20;
  
  // Calculate window positions (same as drawQuesitiWindow)
  const availableTop = sectionStartY;
  const availableBottom = cardY + cardHeight - bottomPadding;
  const totalAvailableHeight = availableBottom - availableTop;
  const totalWindowsHeight = totalAvailableHeight - 20;
  const quesitiWindowHeight = (totalWindowsHeight - presidentSliderHeight - windowSpacing);
  const quesitiWindowTop = availableTop + (totalAvailableHeight - totalWindowsHeight) / 2;
  
  const circleRadius = 11;
  const quesitiAreaTop = quesitiWindowTop + 20 + circleRadius + 5;
  const quesitiAreaBottom = quesitiWindowTop + quesitiWindowHeight - bgPadding;
  
  // Check if mouse is over quesiti area
  if (mouseX >= windowLeft + bgPadding && mouseX < windowLeft + windowWidth - bgPadding &&
      mouseY >= quesitiAreaTop && mouseY < quesitiAreaBottom) {
    // Scroll quesiti
    const scrollSpeed = 30;
    quesitiScrollOffset += event.delta > 0 ? scrollSpeed : -scrollSpeed;
    
    // Calculate heights for quesiti (same logic as drawQuesitiWindow)
    const quesiti2025 = quesitiList.length > 0 ? quesitiList : [];
    const minQuesitoHeight = 50;
    const quesitiHeights = [];
    let totalQuesitiHeight = 0;
    
    // Calculate text width for wrapping (same as drawQuesitiWindow)
    const textStartX = windowLeft + bgPadding * 2 + 30;
    const rightPaddingExtra = 30; // Extra padding to avoid slider
    const textEndX = windowLeft + windowWidth - bgPadding * 2 - rightPaddingExtra;
    const maxTextWidth = textEndX - textStartX;
    const lineHeight = 22; // Allineato con la nuova dimensione del testo
    
    // Calculate height for each quesito
    textSize(16); // Allineato con drawQuesitiWindow
    textStyle(NORMAL);
    quesiti2025.forEach((quesito) => {
      const words = quesito.testo.split(' ');
      let line = '';
      let lineCount = 1;
      
      for (let i = 0; i < words.length; i++) {
        const testLine = line + (line ? ' ' : '') + words[i];
        const testWidth = textWidth(testLine);
        
        if (testWidth > maxTextWidth && line.length > 0) {
          line = words[i];
          lineCount++;
        } else {
          line = testLine;
        }
      }
      
      const quesitoHeight = Math.max(minQuesitoHeight, 20 + (lineCount * lineHeight) + 5); // Reduced padding to decrease spacing
      quesitiHeights.push(quesitoHeight);
      totalQuesitiHeight += quesitoHeight;
    });
    
    // Calculate max scroll offset (same as drawQuesitiWindow)
    const circleRadius = 11;
    const quesitiAreaTopPadding = circleRadius + 5;
    const quesitiAreaHeight = quesitiAreaBottom - quesitiAreaTop;
    // Use full area height (padding is already accounted for in quesitiAreaHeight)
    const needsScroll = totalQuesitiHeight > quesitiAreaHeight;
    const maxScrollOffset = needsScroll ? Math.max(0, totalQuesitiHeight - quesitiAreaHeight) : 0;
    quesitiScrollOffset = constrain(quesitiScrollOffset, 0, maxScrollOffset);
    
    redraw();
    return false; // Prevent default scrolling
  }
  
  // Handle scrolling for president description - use same coordinates as above
  const presidentSliderHeight2 = 280;
  const windowSpacing2 = 20;
  const totalWindowsHeight2 = totalAvailableHeight - 20;
  const quesitiWindowHeight2 = (totalWindowsHeight2 - presidentSliderHeight2 - windowSpacing2);
  const quesitiWindowTop2 = availableTop + (totalAvailableHeight - totalWindowsHeight2) / 2;
  const presidentWindowTop2 = quesitiWindowTop2 + quesitiWindowHeight2 + windowSpacing2;
  const sliderAreaY2 = presidentWindowTop2;
  
  // Check if mouse is over president carousel description area
  if (mouseX >= windowLeft + bgPadding && mouseX < windowLeft + windowWidth - bgPadding &&
      mouseY >= sliderAreaY2 && mouseY < sliderAreaY2 + presidentSliderHeight2) {
    const carouselX = windowLeft + bgPadding;
    const carouselWidth = windowWidth - bgPadding * 2;
    const carouselPadding = 15;
    const headerY = sliderAreaY2 + 15;
    const contentAreaHeight = presidentSliderHeight2 - headerY - carouselPadding * 2;
    const imageSize = 120; // Increased size to match drawPresidentSlider
    const rightShift = 30;
    const imagePadding = carouselPadding + 10 + rightShift;
    const imageX = carouselX + imagePadding + imageSize/2;
    const textAreaX = imageX + imageSize/2 + 15;
    const scrollbarWidth = 6;
    const textAreaWidth = carouselWidth - textAreaX - carouselPadding - scrollbarWidth - 5;
    const contentY = headerY + carouselPadding + Math.max(0, (contentAreaHeight - imageSize) / 2);
    const nameY = contentY;
    const titleY = nameY + 22;
    const descY = titleY + 28; // Match drawPresidentSlider
    const descAreaTop = descY;
    const bottomPaddingExtra = 20; // Extra padding at bottom to prevent text from being covered
    const descAreaBottom = sliderAreaY2 + presidentSliderHeight2 - carouselPadding - bottomPaddingExtra; // Match drawPresidentSlider
    
    // Check if mouse is over description area
    if (mouseX >= textAreaX && mouseX < textAreaX + textAreaWidth &&
        mouseY >= descAreaTop && mouseY < descAreaBottom) {
      // Scroll president description
      const scrollSpeed = 20;
      presidenteDescScrollOffset += event.delta > 0 ? scrollSpeed : -scrollSpeed;
      
      // Constrain scroll offset (will be constrained in drawPresidentSlider)
      const yearKey = String(selectedYear);
      const presidenteData = contestoByYear[yearKey];
      if (presidenteData) {
          const currentDesc = currentPresidenteMode === 0 ? presidenteData.descrizioneRep : presidenteData.descrizioneConsiglio;
        if (currentDesc && currentDesc.trim() !== '') {
          // Use same text size and line height as drawPresidentSlider
          textSize(15); // Increased from 11
          textStyle(NORMAL);
          const lineHeight = 18; // Increased from 15
          const words = currentDesc.split(' ');
          let line = '';
          let lineCount = 0;
          
          for (let i = 0; i < words.length; i++) {
            const testLine = line + (line ? ' ' : '') + words[i];
            const testWidth = textWidth(testLine);
            
            if (testWidth > textAreaWidth && line.length > 0) {
              line = words[i];
              lineCount++;
            } else {
              line = testLine;
            }
          }
          if (line) lineCount++;
          
          const descAreaHeight = descAreaBottom - descAreaTop;
          const totalDescHeight = lineCount * lineHeight;
          const maxDescScrollOffset = totalDescHeight > descAreaHeight ? totalDescHeight - descAreaHeight : 0;
          presidenteDescScrollOffset = constrain(presidenteDescScrollOffset, 0, maxDescScrollOffset);
        }
      }
      
      redraw();
      return false; // Prevent default scrolling
    }
  }
  
  return true; // Allow default scrolling for other areas
}

function mousePressed() {
  console.log('🖱️ mousePressed CHIAMATO');
  
  // --- NUOVO: GESTIONE CLICK LINK PRESIDENTI ---
  if (presidentClickZones && presidentClickZones.length > 0) {
    for (let zone of presidentClickZones) {
      let clicked = false;
      
      if (zone.type === 'rect') {
        // Controllo rettangolo (testo)
        if (mouseX >= zone.x && mouseX <= zone.x + zone.w &&
            mouseY >= zone.y && mouseY <= zone.y + zone.h) {
          clicked = true;
        }
      } else if (zone.type === 'circle') {
        // Controllo cerchio (immagine)
        if (dist(mouseX, mouseY, zone.x, zone.y) < zone.r) {
          clicked = true;
        }
      }
      
      if (clicked && zone.url) {
        console.log("🔗 Apertura link Wikipedia per:", zone.name, zone.url);
        window.open(zone.url, '_blank');
        return; // Interrompi altri controlli se abbiamo cliccato un link
      }
    }
  }
  console.log('   mouseX:', mouseX, 'mouseY:', mouseY);
  console.log('   Canvas size:', width, 'x', height);
  
  // First check if click is on president slider - use EXACTLY the same coordinates as drawQuesitiWindow
  const navbarHeight = 100;
  const sliderHeight = 130; // Space for slider, year labels and back button at bottom
  const cardX = 0;
  const cardY = navbarHeight;
  const cardWidth = width;
  const cardHeight = height - navbarHeight - sliderHeight;
  const sectionStartY = cardY + 10; // IMPORTANTE: deve essere +10 come in drawQuesitiWindow (riga 4403)
  const bottomPadding = 3;
  const windowLeft = cardX + 40; // IMPORTANTE: deve essere +40 come in drawQuesitiWindow (riga 4406)
  const windowWidth = cardWidth * 0.34 - 60; // IMPORTANTE: deve essere -60 come in drawQuesitiWindow (riga 4407)
  const bgPadding = 15;
  const presidentSliderHeight = 250; // DEVE corrispondere a quello usato in drawQuesitiWindow
  const windowSpacing = 20;
  
  // Calculate window positions (EXACTLY same as drawQuesitiWindow)
  const availableTop = sectionStartY + 30; // Stesso offset di drawGeoMap per spostare la mappa più in basso
  const availableBottom = cardY + cardHeight - bottomPadding;
  const totalAvailableHeight = availableBottom - availableTop;
  const totalWindowsHeight = totalAvailableHeight - 20;
  const quesitiWindowHeight = totalWindowsHeight - presidentSliderHeight - windowSpacing - 60; // IMPORTANTE: -60 come in drawQuesitiWindow (riga 4417)
  const quesitiWindowTop = availableTop + (totalAvailableHeight - totalWindowsHeight) / 2;
  const presidentWindowTop = quesitiWindowTop + quesitiWindowHeight + windowSpacing;
  
  const quesitiAreaTop = quesitiWindowTop + 20 + 11 + 5; // startY + circleRadius + padding
  const quesitiAreaBottom = quesitiWindowTop + quesitiWindowHeight - bgPadding;
  const sliderAreaY = presidentWindowTop;
  
  // Check if click is in carousel area
  const carouselLeft = windowLeft + bgPadding;
  const carouselRight = windowLeft + windowWidth - bgPadding;
  const carouselTop = sliderAreaY;
  const carouselBottom = sliderAreaY + presidentSliderHeight;
  const inCarouselArea = mouseX >= carouselLeft && mouseX < carouselRight && 
      mouseY >= carouselTop && mouseY < carouselBottom;
  
  console.log('📍📍📍 AREA CAROUSEL 📍📍📍');
  console.log('   Boundaries:', { left: carouselLeft, right: carouselRight, top: carouselTop, bottom: carouselBottom });
  console.log('   Mouse position:', { x: mouseX, y: mouseY });
  console.log('   Canvas size:', { width: width, height: height });
  console.log('   Window dimensions:', { windowLeft: windowLeft, windowWidth: windowWidth, sliderAreaY: sliderAreaY, presidentSliderHeight: presidentSliderHeight });
  console.log('   Click IN carousel area?', inCarouselArea);
  
  // Test: se il click è nella zona sinistra (dove dovrebbero essere i pallini), logga sempre
  if (mouseX < width * 0.4) {
    console.log('⚠️⚠️⚠️ CLICK NELLA ZONA SINISTRA ⚠️⚠️⚠️');
    console.log('   Questo dovrebbe essere dove ci sono i pallini del presidente');
  }
  
  if (!inCarouselArea) {
    console.log('⚠️ Click FUORI dall\'area carousel - continuo con altri controlli...');
  }
  
  if (inCarouselArea) {
    
    // Calculate carousel dimensions (same as drawPresidentSlider)
    // IMPORTANTE: usa le STESSE coordinate di drawPresidentSlider
    const carouselX = windowLeft + bgPadding;  // Questo corrisponde a x in drawPresidentSlider
    const carouselWidth = windowWidth - bgPadding * 2;  // Questo corrisponde a w in drawPresidentSlider
    const carouselY = sliderAreaY;  // Questo corrisponde a y in drawPresidentSlider
    const headerY = carouselY + 15;  // y + 15 come in drawPresidentSlider
    
    // PRIMA controlla se il click è sui pallini indicatori (priorità massima)
    // Usa ESATTAMENTE le stesse coordinate di drawPresidentSlider
    const dotSize = 8;
    const dotSpacing = 20;
    const carouselCenterX = carouselX + carouselWidth / 2;  // x + w / 2
    const dotsStartX = carouselCenterX - dotSpacing / 2;
    const dotY = headerY;  // y + 15
    
    console.log('📍 Coordinate pallini:', {
      carouselX: carouselX,
      carouselWidth: carouselWidth,
      carouselCenterX: carouselCenterX,
      dotsStartX: dotsStartX,
      dotY: dotY,
      headerY: headerY,
      carouselY: carouselY
    });
    
    // Usa sia area rettangolare che distanza per massima affidabilità
    // Area cliccabile molto grande per facilitare il click
    const dotClickAreaWidth = 150; // Area molto grande per facilitare il click (aumentato da 100)
    const dotClickAreaHeight = 150; // Area molto grande (aumentato da 100)
    const maxClickDistance = 75; // Distanza massima dal centro del pallino (aumentato da 50)
    
    // Left dot (Repubblica) - controllo con area rettangolare E distanza
    const leftDotCenterX = dotsStartX;
    const leftDotCenterY = dotY;
    const leftDotX = leftDotCenterX - dotClickAreaWidth / 2;
    const leftDotY = leftDotCenterY - dotClickAreaHeight / 2;
    const leftDotRight = leftDotX + dotClickAreaWidth;
    const leftDotBottom = leftDotY + dotClickAreaHeight;
    const distToLeftDot = dist(mouseX, mouseY, leftDotCenterX, leftDotCenterY);
    const inLeftArea = (mouseX >= leftDotX && mouseX <= leftDotRight && mouseY >= leftDotY && mouseY <= leftDotBottom) ||
                       distToLeftDot <= maxClickDistance;
    
    console.log('🔵 Pallino sinistro (Repubblica):', {
      center: { x: leftDotCenterX, y: leftDotCenterY },
      area: { left: leftDotX, right: leftDotRight, top: leftDotY, bottom: leftDotBottom },
      mousePos: { x: mouseX, y: mouseY },
      distance: distToLeftDot,
      inArea: inLeftArea
    });
    
    if (inLeftArea) {
      console.log('✅✅✅ Click sul pallino sinistro (Repubblica) ✅✅✅');
      if (currentPresidenteMode !== 0) {
        console.log('🔄 Cambio modalità da Consiglio a Repubblica');
        currentPresidenteMode = 0;
        presidenteDescScrollOffset = 0;
        console.log('Nuova modalità:', currentPresidenteMode);
        redraw();
        return true; // Indica che il click è stato gestito
      } else {
        console.log('Già in modalità Repubblica');
      }
      return true; // Indica che il click è stato gestito anche se già in modalità corretta
    }
    
    // Right dot (Consiglio) - controllo con area rettangolare E distanza
    const rightDotCenterX = dotsStartX + dotSpacing;
    const rightDotCenterY = dotY;
    const rightDotX = rightDotCenterX - dotClickAreaWidth / 2;
    const rightDotY = rightDotCenterY - dotClickAreaHeight / 2;
    const rightDotRight = rightDotX + dotClickAreaWidth;
    const rightDotBottom = rightDotY + dotClickAreaHeight;
    const distToRightDot = dist(mouseX, mouseY, rightDotCenterX, rightDotCenterY);
    const inRightArea = (mouseX >= rightDotX && mouseX <= rightDotRight && mouseY >= rightDotY && mouseY <= rightDotBottom) ||
                        distToRightDot <= maxClickDistance;
    
    console.log('🔴🔴🔴 Pallino destro (Consiglio) 🔴🔴🔴');
    console.log('   Center:', { x: rightDotCenterX, y: rightDotCenterY });
    console.log('   Click area:', { left: rightDotX, right: rightDotRight, top: rightDotY, bottom: rightDotBottom });
    console.log('   Mouse position:', { x: mouseX, y: mouseY });
    console.log('   Distance to center:', distToRightDot, '(max:', maxClickDistance, ')');
    console.log('   In rectangular area?', mouseX >= rightDotX && mouseX <= rightDotRight && mouseY >= rightDotY && mouseY <= rightDotBottom);
    console.log('   Within distance?', distToRightDot <= maxClickDistance);
    console.log('   FINAL RESULT - Click detected?', inRightArea);
    
    if (inRightArea) {
      console.log('✅✅✅ Click sul pallino destro (Consiglio) ✅✅✅');
      console.log('Modalità corrente:', currentPresidenteMode, '(0=Repubblica, 1=Consiglio)');
      
      if (currentPresidenteMode !== 1) {
        console.log('🔄 Cambio modalità da Repubblica a Consiglio');
        currentPresidenteMode = 1;
        presidenteDescScrollOffset = 0;
        console.log('✅ Nuova modalità impostata:', currentPresidenteMode);
        
        // Verifica che i dati siano presenti
        const yearKey = String(selectedYear);
        console.log('Cercando dati per anno:', yearKey, '(tipo:', typeof selectedYear, ')');
        console.log('Anni disponibili in contestoByYear:', Object.keys(contestoByYear));
        
        // Try multiple formats to find the data
        let presidenteData = contestoByYear[yearKey];
        
        // If not found, try as number
        if (!presidenteData && !isNaN(selectedYear)) {
          presidenteData = contestoByYear[parseInt(selectedYear)];
          if (presidenteData) console.log('✅ Dati trovati con chiave numerica:', parseInt(selectedYear));
        }
        
        // If still not found, try to find by numeric year
        if (!presidenteData) {
          const numericYear = getYearNumeric(yearKey);
          for (const key in contestoByYear) {
            if (getYearNumeric(key) === numericYear) {
              presidenteData = contestoByYear[key];
              console.log(`✅ Dati trovati con chiave alternativa: ${key}`);
              break;
            }
          }
        }
        
        if (presidenteData) {
          console.log('✅ Dati Consiglio disponibili:', {
            nome: presidenteData.presidenteConsiglio,
            img: presidenteData.imgConsiglio,
            descrizione: presidenteData.descrizioneConsiglio ? presidenteData.descrizioneConsiglio.substring(0, 50) + '...' : 'Manca'
          });
          
          // Forza sempre il caricamento dell'immagine quando si cambia modalità
          if (presidenteData.imgConsiglio) {
            const cachedImg = presidenteImages[presidenteData.imgConsiglio];
            const needsLoad = !cachedImg || (cachedImg && cachedImg.width === 0);
            
            if (needsLoad) {
              console.log('📸 Immagine Consiglio non in cache o non ancora caricata, forzo il caricamento...');
              loadPresidenteImages(presidenteData, true); // Force reload
            } else {
              console.log('✅ Immagine Consiglio già in cache e caricata:', presidenteData.imgConsiglio);
              console.log('   Dimensioni:', cachedImg.width, 'x', cachedImg.height);
            }
          } else {
            console.warn('⚠️ Nessun nome immagine Consiglio nei dati per anno:', yearKey);
            console.warn('   Dati disponibili:', Object.keys(presidenteData));
          }
        } else {
          console.error('❌ Nessun dato presidente trovato per anno:', yearKey);
          console.error('   Anni disponibili in contestoByYear:', Object.keys(contestoByYear));
          console.error('   selectedYear:', selectedYear, 'tipo:', typeof selectedYear);
        }
        
        // Forza sempre un redraw dopo il cambio di modalità
        console.log('🔄 Chiamata redraw() dopo cambio modalità...');
        redraw();
        console.log('✅ redraw() completato');
        return true; // Indica che il click è stato gestito
      } else {
        console.log('Già in modalità Consiglio - verifico che i dati siano presenti...');
        
        // Verifica che i dati siano ancora presenti e che l'immagine sia caricata
        const yearKey = String(selectedYear);
        let presidenteData = contestoByYear[yearKey];
        if (!presidenteData && !isNaN(selectedYear)) {
          presidenteData = contestoByYear[parseInt(selectedYear)];
        }
        if (!presidenteData) {
          const numericYear = getYearNumeric(yearKey);
          for (const key in contestoByYear) {
            if (getYearNumeric(key) === numericYear) {
              presidenteData = contestoByYear[key];
              break;
            }
          }
        }
        
        if (presidenteData && presidenteData.imgConsiglio) {
          const cachedImg = presidenteImages[presidenteData.imgConsiglio];
          if (!cachedImg || (cachedImg && cachedImg.width === 0)) {
            console.log('⚠️ Immagine Consiglio non caricata anche se in modalità Consiglio, ricarico...');
            loadPresidenteImages(presidenteData, true);
          }
        }
        
        // Anche se già in modalità Consiglio, forza un redraw per assicurarsi che tutto sia visualizzato
        redraw();
      }
      return true; // Indica che il click è stato gestito anche se già in modalità corretta
    }
    
    console.log('⚠️ Click nell\'area carousel ma non sui pallini');
    console.log('   Potrebbe essere un click su altro elemento del carousel');
    
    // Se non è un click sui pallini, continua con gli altri controlli (scrollbar, ecc.)
    
    // Check if click is on description scrollbar
    if (window.presidenteScrollbarX !== null && window.presidenteScrollbarX !== undefined) {
      const scrollbarX = window.presidenteScrollbarX;
      const scrollbarY = window.presidenteScrollbarY;
      const scrollbarWidth = window.presidenteScrollbarWidth;
      const scrollbarHeight = window.presidenteScrollbarHeight;
      const thumbY = window.presidenteScrollbarThumbY;
      const thumbHeight = window.presidenteScrollbarThumbHeight;
      
      // Check if click is on scrollbar track or thumb (con area cliccabile piÃ¹ ampia)
      const scrollbarClickMargin = 5; // Margine per facilitare il click
      if (mouseX >= scrollbarX - scrollbarClickMargin && mouseX <= scrollbarX + scrollbarWidth + scrollbarClickMargin &&
          mouseY >= scrollbarY && mouseY <= scrollbarY + scrollbarHeight) {
        // Check if click is on thumb
        if (mouseY >= thumbY && mouseY <= thumbY + thumbHeight) {
          isDraggingDescScrollbar = true;
          return;
        } else {
          // Click on track - jump to that position (calcolo corretto considerando l'altezza del thumb)
          const thumbHeight = window.presidenteScrollbarThumbHeight;
          const scrollableHeight = scrollbarHeight - thumbHeight;
          // Quando si clicca, il thumb si posiziona con il centro sul punto cliccato
          const clickY = constrain(mouseY, scrollbarY + thumbHeight / 2, scrollbarY + scrollbarHeight - thumbHeight / 2);
          const clickRatio = scrollableHeight > 0 
            ? (clickY - scrollbarY - thumbHeight / 2) / scrollableHeight
            : 0;
          presidenteDescScrollOffset = clickRatio * window.presidenteScrollbarMaxOffset;
          // Assicurati che possa raggiungere il massimo
          presidenteDescScrollOffset = constrain(presidenteDescScrollOffset, 0, window.presidenteScrollbarMaxOffset);
          redraw();
          return;
        }
      }
    }
  }
  
  // Then check if click is on a quesito - use same dimensions as above
  if (mouseX >= windowLeft + bgPadding && mouseX < windowLeft + windowWidth - bgPadding &&
      mouseY >= quesitiAreaTop && mouseY < quesitiAreaBottom) {
    // Check which quesito was clicked (account for scroll offset)
    const quesiti2025 = quesitiList.length > 0 ? quesitiList : [];
    
    // Calculate heights for quesiti (same logic as drawQuesitiWindow)
    const minQuesitoHeight = 40;
    const quesitiHeights = [];
    textSize(16); // Allineato con drawQuesitiWindow
    textStyle(NORMAL);
    const textStartX2 = windowLeft + bgPadding * 2 + 30;
    const rightPaddingExtra2 = 30;
    const textEndX2 = windowLeft + windowWidth - bgPadding * 2 - rightPaddingExtra2;
    const maxTextWidth2 = textEndX2 - textStartX2;
    
    quesiti2025.forEach((quesito) => {
      const words = quesito.testo.split(' ');
      let line = '';
      let lineCount = 1;
      
      for (let i = 0; i < words.length; i++) {
        const testLine = line + (line ? ' ' : '') + words[i];
        const testWidth = textWidth(testLine);
        
        if (testWidth > maxTextWidth2 && line.length > 0) {
          line = words[i];
          lineCount++;
        } else {
          line = testLine;
        }
      }
      
      const lineHeight = 22; // Same as drawQuesitiWindow
      const quesitoHeight = Math.max(minQuesitoHeight, 20 + (lineCount * lineHeight) + 0); // Same as drawQuesitiWindow
      quesitiHeights.push(quesitoHeight);
    });
    const startY = quesitiWindowTop + 20;
    
    let currentY = startY - quesitiScrollOffset;
    for (let i = 0; i < quesiti2025.length; i++) {
      const quesitoHeight = quesitiHeights[i];
      const y = currentY;
      const quesitoClickTop = y;
      const quesitoClickBottom = y + quesitoHeight;
      
      if (mouseY >= quesitoClickTop && mouseY < quesitoClickBottom) {
        // Toggle selection: if same quesito clicked again, deselect
        if (selectedQuesito === quesiti2025[i].numero) {
          selectedQuesito = null;
          console.log(`â" Quesito ${quesiti2025[i].numero} deselected`);
        } else {
          selectedQuesito = quesiti2025[i].numero;
          // Keep region selected if it exists - allow both to be selected
          if (selectedRegion) {
            const regionName = selectedRegion.properties?.reg_name || selectedRegion.properties?.denominazione_reg || 'Unknown';
            console.log(`â" Quesito ${selectedQuesito} selected (filter active). Current region: ${regionName}`);
          } else {
            console.log(`â" Quesito ${selectedQuesito} selected (filter active)`);
          }
        }
        redraw();
        return;
      }
      currentY += quesitoHeight;
    }
  }
  
  // Then check if click is on a region (only check if click is on the map area)
  if (!geojsonData || !geoPath || !geoProjection) {
    return; // Don't process clicks if map not loaded
  }
  
  // Use same dimensions as drawGeoMap (must match exactly!)
  // Reuse variables already declared above
      // Use same centering logic as drawGeoMap
      const mapWidth = cardWidth * 0.34;

      const mapLeft = (cardWidth - mapWidth) / 2;
  const drawH = totalAvailableHeight - 20;
  const paddingTop = availableTop + (totalAvailableHeight - drawH) / 2; // Center vertically (same as drawGeoMap)
  const mapBottom = cardY + cardHeight - bottomPadding - 5;
  
  // Only process clicks on the map area (center third of card)
  if (mouseX >= mapLeft && mouseX < mapLeft + mapWidth && mouseY > paddingTop && mouseY < mapBottom) {
    // Convert mouse coordinates to map coordinates (subtract mapLeft offset)
    const mapX = mouseX - mapLeft;
    const mapY = mouseY - paddingTop;
    
    for (const feature of geojsonData.features) {
      const isClicked = isPointInFeature(mapX, mapY, feature);
      if (isClicked) {
        const regionName = feature.properties.reg_name || feature.properties.denominazione_reg || feature.properties.denominazione || feature.properties.nome || 'Unknown';
        // Toggle selection: if same region clicked again, deselect
        if (selectedRegion === feature) {
          selectedRegion = null;
          console.log(`ðŸ" Region deselected: ${regionName}`);
        } else {
          selectedRegion = feature;
          // Keep quesito selected if it exists - allow both to be selected
          if (selectedQuesito !== null) {
            console.log(`ðŸ" Region selected: ${regionName} (Quesito ${selectedQuesito} filter is active)`);
          } else {
            console.log(`ðŸ" Region selected: ${regionName}`);
          }
        }
        redraw();
        break;
      }
    }
  }
}

function mouseDragged() {
  // Handle dragging description scrollbar
  if (isDraggingDescScrollbar && window.presidenteScrollbarX !== null && window.presidenteScrollbarX !== undefined) {
    const scrollbarY = window.presidenteScrollbarY;
    const scrollbarHeight = window.presidenteScrollbarHeight;
    const thumbHeight = window.presidenteScrollbarThumbHeight;
    const maxOffset = window.presidenteScrollbarMaxOffset;
    
    // Calculate new scroll position based on mouse Y position
    // Il thumb si muove con il mouse, permettendo di arrivare fino in fondo
    const scrollableHeight = scrollbarHeight - thumbHeight;
    // Il mouse puÃ² essere ovunque lungo lo scrollbar, il thumb segue il mouse
    const mouseYRelative = constrain(mouseY, scrollbarY + thumbHeight / 2, scrollbarY + scrollbarHeight - thumbHeight / 2);
    // Calcola il rapporto: quando mouse Ã¨ in alto (scrollbarY + thumbHeight/2) -> 0, quando Ã¨ in basso -> 1
    const clickRatio = scrollableHeight > 0 
      ? (mouseYRelative - scrollbarY - thumbHeight / 2) / scrollableHeight
      : 0;
    presidenteDescScrollOffset = clickRatio * maxOffset;
    // Assicurati che possa raggiungere il massimo
    presidenteDescScrollOffset = constrain(presidenteDescScrollOffset, 0, maxOffset);
    redraw();
    return;
  }
  
  // Handle dragging quesiti scrollbar (existing code)
  if (isDraggingQuesitiScrollbar) {
    // ... existing quesiti scrollbar drag code ...
  }
}

function mouseReleased() {
  // Stop dragging president slider
  isDraggingPresidentSlider = false;
  // Stop dragging quesiti scrollbar
  isDraggingQuesitiScrollbar = false;
  // Stop dragging description scrollbar
  isDraggingDescScrollbar = false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  
  // Update projection for new canvas size
  if (geojsonData && typeof d3 !== 'undefined') {
    const paddingTop = 90;
    const mapWidth = width * 0.34; // Mappa occupa 1/3 centrale // Mappa occupa 2/3 della pagina
    const drawW = mapWidth;
    const drawH = height - paddingTop;
    geoProjection = d3.geoMercator().fitSize([drawW, drawH], geojsonData);
    geoPath = d3.geoPath().projection(geoProjection);
  }
  
  redraw();
}


//Modalità help

function drawHelpModeBlur() {
  if (!helpModeActive || !currentHoveredSection) return;

  push();

  const uniformPadding = 0;

  for (const [sectionKey, section] of Object.entries(HELP_SECTIONS)) {
    if (sectionKey === currentHoveredSection) continue; // oscura tutto tranne la sezione sotto il mouse

    const bounds = section.bounds();

    fill(0, 0, 0, 120);
    noStroke();
    rect(bounds.x, bounds.y, bounds.w, bounds.h);
  }

  pop();
}


