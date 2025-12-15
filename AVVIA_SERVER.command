#!/bin/bash

# Script per macOS - doppio click per avviare
# Questo file si apre automaticamente nel Terminale quando fai doppio click

# Ottieni la directory dello script (gestisce anche percorsi con spazi)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

clear
echo "════════════════════════════════════════════════════════════"
echo "  🚀 SERVER HTTP LOCALE"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Avvio del server..."
echo ""

# Prova prima con python3, poi con python
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo "❌ ERRORE: Python non trovato!"
    echo ""
    echo "Installa Python 3 da: https://www.python.org/"
    echo ""
    read -p "Premi INVIO per chiudere..."
    exit 1
fi

echo "Usando: $PYTHON_CMD"
echo ""
echo "Il browser si aprirà automaticamente tra qualche secondo..."
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""

# Avvia il server
"$PYTHON_CMD" server.py

# Quando il server si chiude, mantieni la finestra aperta
echo ""
echo "════════════════════════════════════════════════════════════"
read -p "Premi INVIO per chiudere questa finestra..."

