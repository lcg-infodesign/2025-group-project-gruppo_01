# Convert SVGs to GeoJSON

This folder contains a small helper script to merge individual regional SVG files
into a single GeoJSON used by the sketch at `index.html`.

Prerequisites
- Node.js and npm (for `npx`) or `mapshaper` installed globally (`npm i -g mapshaper`).

Usage
1. Put your regional SVG files into the top-level `REGIONI/` directory (they already exist in the project).
2. From the project root run:

```bash
# make script executable (first time)
chmod +x scripts/convert-svg-to-geojson.sh

# run conversion
./scripts/convert-svg-to-geojson.sh
```

This will create `REGIONI/regions.geojson`.

Notes
- The produced GeoJSON should contain region name properties. The sketch expects one of:
  `reg_name`, `denominazione_reg`, `denominazione`, `nome`, `name`, etc. If property names differ,
  either edit the GeoJSON to include a matching property or update the matching logic in `sketch.js`.
- If SVGs are not in geographic coordinate form, `mapshaper` may fail or produce incorrect coords. In that case,
  you need source GeoSVGs with geographic coordinates or a different source (official GeoJSON).

Serving the project
To avoid fetch/CORS issues, serve the project directory with a simple HTTP server:

```bash
# from project root
python3 -m http.server 8000
# then open http://localhost:8000 in browser
```
