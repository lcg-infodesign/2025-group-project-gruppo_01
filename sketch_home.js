let omino3Img;
let omino1Img;
let omino4Img;
let stixFont; // nuovo font

let contentHeight;
let scrollOffset = 0;

// Variabili per gli omini (se necessario)
let numOmini3 = 5;
let startX3 = 100;
let spacing3 = 80;
let colYOmini = 400;
let ominoWSmall = 60;
let ominoHSmall = 60;

function preload() {
  // Carica le immagini degli omini
  omino3Img = loadImage("omino3.svg");
  omino1Img = loadImage("omino1.svg");
  omino4Img = loadImage("omino4.svg");

  // Carica il font STIX dalla cartella fonts
  // Usa il font statico invece della variabile per maggiore compatibilità
  stixFont = loadFont("font/STIX_Two_Text/static/STIXTwoText-Regular.ttf");
}

function setup() {
  // Crea canvas come background, posizionato dietro il contenuto HTML
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.position(0, 0);
  canvas.style('z-index', '-1'); // Posiziona dietro il contenuto HTML
  canvas.style('position', 'fixed');
  canvas.style('pointer-events', 'none'); // Permette il click attraverso il canvas
  
  if (stixFont) {
    textFont(stixFont); // usa STIX come font di default
  }
  textAlign(CENTER, CENTER);
  computeContentHeight();
  
  // Non ridisegnare continuamente se non necessario
  noLoop();
}

function draw() {
  // Background trasparente per non coprire il contenuto HTML
  clear();
  
  // Se vuoi un background colorato, usa questo invece di clear():
  // background(245, 240, 220, 0); // Colore di sfondo con trasparenza

  // Disegna gli omini solo se le immagini sono caricate
  if (omino1Img && omino3Img && omino4Img) {
    push();
    translate(0, -scrollOffset);

    imageMode(CENTER);

    // Disegna gli omini nella seconda sezione (2025)
    for (let i = 0; i < numOmini3; i++) {
      let xPos3 = startX3 + i * spacing3;
      // Posiziona gli omini nella parte bassa della pagina
      let yPos = height * 0.6 + scrollOffset;
      
      if (i < 3) {
        image(omino4Img, xPos3, yPos, ominoWSmall, ominoHSmall);
      } else {
        image(omino3Img, xPos3, yPos, ominoWSmall, ominoHSmall);
      }
    }

    pop();
  }

  // Scrollbar opzionale (commentata per non interferire con il design)
  // noStroke();
  // fill(0, 0, 0, 80);
  // let scrollbarHeight = 80;
  // let scrollbarY = map(scrollOffset, 0, contentHeight - height, 20, height - scrollbarHeight - 20);
  // rect(width - 12, scrollbarY, 6, scrollbarHeight, 3);
}

function mouseWheel(event) {
  scrollOffset += event.delta;
  scrollOffset = constrain(scrollOffset, 0, contentHeight - height);
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  computeContentHeight();
  scrollOffset = constrain(scrollOffset, 0, contentHeight - height);
}

function computeContentHeight() {
  contentHeight = windowHeight * 2;
}

// Funzione per testo centrato e avvolto
function drawWrappedCentered(str, centerX, bottomY, maxWidth, lineHeight) {
  const words = str.split(/\s+/);
  let lines = [];
  let current = "";

  for (let i = 0; i < words.length; i++) { 
    const test = current.length ? current + " " + words[i] : words[i];
    if (textWidth(test) <= maxWidth) {
      current = test;
    } else {
      if (current.length) lines.push(current);
      current = words[i];
    }
  }
  if (current.length) lines.push(current);

  const totalHeight = lines.length * lineHeight;
  let y = bottomY - totalHeight;

  textAlign(CENTER, CENTER);
  for (let i = 0; i < lines.length; i++) {
    text(lines[i], centerX, y + i * lineHeight);
  }
}
