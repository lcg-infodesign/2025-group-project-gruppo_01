#!/bin/bash

# Script per avviare il server HTTP locale
# Doppio click su questo file per avviare il server

# Ottieni la directory dello script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "🚀 Avvio del server..."
echo ""

# Prova prima con python3, poi con python
if command -v python3 &> /dev/null; then
    python3 server.py
elif command -v python &> /dev/null; then
    python server.py
else
    echo "❌ Errore: Python non trovato!"
    echo "   Installa Python 3 da https://www.python.org/"
    echo ""
    read -p "Premi INVIO per chiudere..."
    exit 1
fi

