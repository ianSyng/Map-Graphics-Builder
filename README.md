# Map Graphics Builder

Browser app for drawing, styling, and exporting map graphics.

Draw points, lines, areas, and circles on a dark basemap. Graphics persist in the browser (`localStorage`) and export as GeoJSON.

**Live demo:** [https://ianSyng.github.io/](https://ianSyng.github.io/)

## Prerequisites

- Node.js 20+ (repo developed against Node 24)
- npm 11+

## Setup

```powershell
cd C:\Users\iansy\Map-Graphics-Builder-repo
npm install
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173).

## Portable copy (no Node on the other machine)

From this repo:

```powershell
npm run portable
```

That writes `portable/MapGraphicsBuilder/` (and a zip next to it). Copy the folder to a USB stick or another Windows PC and double-click **Start Map Graphics Builder.bat**. Keep the console window open while you work.

The app itself is self-contained. Basemap tiles still need internet. Drawings stay in the browser for `http://127.0.0.1:17321/` — export GeoJSON/KML/KMZ/CSV to take them with you.

## Scripts

| Command | What it does |
|---------|----------------|
| `npm run dev` | Vite dev server on `127.0.0.1:5173` |
| `npm run build` | Typecheck + production bundle in `dist/` |
| `npm run preview` | Serve the production build |
| `npm run portable` | Production build + copyable Windows folder in `portable/` |
| `npm run pages` | Production build + publish demo to [ianSyng.github.io](https://ianSyng.github.io/) |
| `npm run lint` | ESLint |

## Stack

- **Vite 7** + **React 19** + **TypeScript**
- **Tailwind CSS 4**
- **Leaflet** + **react-leaflet** (map + drawing)

## License

[MIT](LICENSE) © 2026 Ian Young

## Current v0

- Draw: point, line, polygon, circle
- Inspector: name, color, stroke, fill, remarks
- Export GeoJSON
- Autosave to `localStorage`

Next work can add control-measure catalogs, MGRS, and import of GeoJSON FeatureCollections.
