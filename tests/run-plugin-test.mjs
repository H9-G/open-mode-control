import esbuild from "esbuild";
import { spawnSync } from "node:child_process";
await esbuild.build({
  entryPoints: ["tests/plugin.test.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: "tests/.plugin.test.cjs",
  alias: { obsidian: "./tests/obsidian-mock.ts" },
  logLevel: "error",
});
const r = spawnSync(process.execPath, ["tests/.plugin.test.cjs"], { stdio: "inherit" });
process.exit(r.status ?? 1);
