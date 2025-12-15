#!/usr/bin/env bash
set -euo pipefail

# convert-svg-to-geojson.sh
# Merge all SVG files in ./REGIONI into a single GeoJSON file:
#   REGIONI/regions.geojson
# Requires: mapshaper (global) or npx (will use npx mapshaper if mapshaper not found)

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
PROJECT_ROOT="$SCRIPT_DIR/.."
REG_DIR="$PROJECT_ROOT/REGIONI"
OUT_FILE="$REG_DIR/regions.geojson"

echo "Project root: $PROJECT_ROOT"

if [ ! -d "$REG_DIR" ]; then
  echo "Error: REGIONI directory not found at: $REG_DIR" >&2
  exit 2
fi

shopt -s nullglob
SVG_FILES=("$REG_DIR"/*.svg)
shopt -u nullglob

if [ ${#SVG_FILES[@]} -eq 0 ]; then
  echo "No SVG files found in $REG_DIR. Place regional SVGs there and re-run." >&2
  exit 3
fi

echo "Found ${#SVG_FILES[@]} SVG files. Output will be: $OUT_FILE"

MAPSHAPER_CMD=""
if command -v mapshaper >/dev/null 2>&1; then
  MAPSHAPER_CMD="mapshaper"
  echo "Using mapshaper from PATH"
else
  # Use npx (will download mapshaper temporarily if needed)
  if command -v npx >/dev/null 2>&1; then
    MAPSHAPER_CMD="npx -y mapshaper"
    echo "mapshaper not found in PATH; will use npx mapshaper"
  else
    echo "Error: neither 'mapshaper' nor 'npx' found. Install mapshaper (npm i -g mapshaper) or install Node/npm." >&2
    exit 4
  fi
fi

echo "Running: $MAPSHAPER_CMD \"\\\"$REG_DIR\\\"/*.svg\" -merge-layers -o format=geojson target=\\\"$OUT_FILE\\\""
eval $MAPSHAPER_CMD "\"$REG_DIR\"/*.svg" -merge-layers -o format=geojson target=\"$OUT_FILE\"
