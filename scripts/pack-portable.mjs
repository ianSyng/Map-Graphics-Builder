import {
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repo = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(repo, "dist");
const outDir = join(repo, "portable");
const appDir = join(outDir, "MapGraphicsBuilder");

if (!existsSync(join(dist, "index.html"))) {
  console.error("dist/ is missing. Run npm run build first.");
  process.exit(1);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(appDir, { recursive: true });
cpSync(dist, appDir, { recursive: true });
cpSync(join(repo, "scripts", "serve-portable.ps1"), join(appDir, "serve.ps1"));
cpSync(
  join(repo, "scripts", "Start-MapGraphicsBuilder.bat"),
  join(appDir, "Start Map Graphics Builder.bat"),
);

writeFileSync(
  join(appDir, "README.txt"),
  [
    "Map Graphics Builder — portable",
    "",
    "No install. No Node.js.",
    "",
    "1. Copy this whole folder (USB, network share, another PC).",
    "2. Double-click  Start Map Graphics Builder.bat",
    "3. Keep the black window open while you work. Close it to quit.",
    "",
    "The basemap tiles still need an internet connection.",
    "Drawings are stored in this browser for http://127.0.0.1:17321/",
    "Export GeoJSON / KML / KMZ / CSV to take graphics with you.",
    "",
  ].join("\r\n"),
  "utf8",
);

const zip = join(outDir, "MapGraphicsBuilder.zip");
const tar = spawnSync(
  "tar",
  ["-a", "-c", "-f", zip, "-C", outDir, "MapGraphicsBuilder"],
  { stdio: "inherit" },
);
if (tar.status !== 0) {
  console.warn("Zip skipped (tar not available). Folder is still ready.");
}

console.log(`Portable app: ${appDir}`);
if (existsSync(zip)) console.log(`Zip: ${zip}`);
