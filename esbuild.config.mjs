import esbuild from "esbuild";
import { builtinModules } from "node:module";

const mode = process.argv[2];
const prod = mode === "production";

if (mode === "test") {
  // Bundle and run the pure-logic tests (no Obsidian runtime needed).
  await esbuild.build({
    entryPoints: ["tests/logic.test.ts"],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: "tests/.logic.test.cjs",
    logLevel: "error",
  });
  const { spawnSync } = await import("node:child_process");
  const r = spawnSync(process.execPath, ["tests/.logic.test.cjs"], { stdio: "inherit" });
  process.exit(r.status ?? 1);
}

const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: [
    "obsidian",
    "electron",
    "@codemirror/autocomplete",
    "@codemirror/collab",
    "@codemirror/commands",
    "@codemirror/language",
    "@codemirror/lint",
    "@codemirror/search",
    "@codemirror/state",
    "@codemirror/view",
    "@lezer/common",
    "@lezer/highlight",
    "@lezer/lr",
    ...builtinModules,
  ],
  format: "cjs",
  target: "es2018",
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
  minify: prod,
});

if (prod) {
  await context.rebuild();
  process.exit(0);
} else {
  await context.watch();
}
