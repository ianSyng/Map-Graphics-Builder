import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repo = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(repo, "dist");
const pagesUrl = "https://github.com/ianSyng/ianSyng.github.io.git";

if (!existsSync(join(dist, "index.html"))) {
  console.error("dist/ is missing. Run npm run build first.");
  process.exit(1);
}

function run(cmd, args, cwd) {
  const res = spawnSync(cmd, args, { cwd, stdio: "inherit" });
  if (res.status !== 0) {
    process.exit(res.status ?? 1);
  }
}

const dir = mkdtempSync(join(tmpdir(), "mgb-pages-"));
try {
  run("git", ["clone", "--depth", "1", pagesUrl, dir], repo);

  for (const name of readdirSync(dir)) {
    if (name === ".git") continue;
    rmSync(join(dir, name), { recursive: true, force: true });
  }

  cpSync(dist, dir, { recursive: true });
  writeFileSync(join(dir, ".nojekyll"), "");
  cpSync(join(repo, "LICENSE"), join(dir, "LICENSE"));
  writeFileSync(
    join(dir, "README.md"),
    [
      "# Map Graphics Builder",
      "",
      "Live demo for [Map Graphics Builder](https://github.com/ianSyng/Map-Graphics-Builder).",
      "",
      "Source of truth is that repo. This site is the published build.",
      "",
    ].join("\n"),
    "utf8",
  );

  run("git", ["add", "-A"], dir);
  const commit = spawnSync(
    "git",
    [
      "commit",
      "-m",
      "Deploy Map Graphics Builder demo",
    ],
    { cwd: dir, encoding: "utf8" },
  );
  if (commit.status !== 0) {
    const out = `${commit.stdout ?? ""}${commit.stderr ?? ""}`;
    if (/nothing to commit/i.test(out)) {
      console.log("Pages site already up to date.");
    } else {
      if (commit.stdout) process.stdout.write(commit.stdout);
      if (commit.stderr) process.stderr.write(commit.stderr);
      process.exit(commit.status ?? 1);
    }
  }
  run("git", ["push", "origin", "HEAD"], dir);
  console.log("Published: https://ianSyng.github.io/");
} finally {
  rmSync(dir, { recursive: true, force: true });
}
