// Event-flow test against a minimal fake of the Obsidian API (aliased in at build time).
import assert from "node:assert/strict";
import Plugin_ from "../src/main";
import { FakeApp, FakeLeaf, makeFile, setMockLanguage } from "./obsidian-mock";

// Node has no `window`; the plugin only needs the timer functions from it.
(globalThis as any).window = { setTimeout: globalThis.setTimeout.bind(globalThis), clearTimeout: globalThis.clearTimeout.bind(globalThis) };

const realNow = Date.now;
const tick = () => new Promise((r) => setTimeout(r, 0));
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
let passed = 0;
let failed = 0;
async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    console.log("ok   " + name);
  } catch (e) {
    failed++;
    console.error("FAIL " + name + "\n     " + String((e as Error).message).split("\n").join("\n     "));
  } finally {
    Date.now = realNow;
  }
}

async function boot(opts: { restored?: { path: string; state: any }[]; data?: any } = {}) {
  const app = new FakeApp();
  for (const r of opts.restored ?? []) app.workspace.addLeaf(r.path, r.state);
  const p: any = new (Plugin_ as any)(app, { id: "open-mode-control" });
  p.__data = opts.data ?? null;
  await p.onload();
  return { app, p };
}
const EN = { language: "en" };
const modeOf = (l: FakeLeaf) => l.state.mode as string;

(async () => {
  // ---- language -----------------------------------------------------------
  await test("first run follows Obsidian language (ja) and saves it", async () => {
    const { p } = await boot();
    assert.equal(p.settings.language, "ja");
    assert.equal(p.__saved.language, "ja");
  });
  await test("first run: Traditional Chinese and unsupported languages", async () => {
    setMockLanguage("zh-TW");
    assert.equal((await boot()).p.settings.language, "zh-TW");
    setMockLanguage("ru");
    assert.equal((await boot()).p.settings.language, "en");
    setMockLanguage("ja");
  });
  await test("saved language is kept on later runs", async () => {
    const { p } = await boot({ data: { language: "de" } });
    assert.equal(p.settings.language, "de");
  });

  // ---- startup ------------------------------------------------------------
  await test("tabs restored at startup are left alone", async () => {
    const { app } = await boot({ data: EN, restored: [{ path: "A.md", state: { mode: "source", source: false } }] });
    app.workspace.emit("active-leaf-change");
    app.workspace.emit("layout-change");
    await tick();
    assert.equal(modeOf(app.workspace.leaves[0]), "source");
  });
  await test("deferred (not yet loaded) restored tabs keep their mode when they load later", async () => {
    const app = new FakeApp();
    const d = app.workspace.addDeferredLeaf("D.md", { mode: "source", source: false }); // exists before the plugin starts
    const p: any = new (Plugin_ as any)(app, { id: "open-mode-control" });
    p.__data = EN;
    await p.onload();
    app.workspace.emit("layout-change");
    await tick();
    assert.equal(modeOf(d), "source", "must not be touched while deferred");
    app.workspace.loadDeferred(d); // the user clicks the tab, Obsidian loads it
    await wait(800);
    assert.equal(modeOf(d), "source", "must keep the saved mode after loading");
  });

  // ---- the reported problem ----------------------------------------------
  await test("existing note opened in a new tab -> reading view", async () => {
    const { app } = await boot({ data: EN });
    const b = app.workspace.openFile(makeFile("B.md", 120));
    await tick();
    assert.equal(modeOf(b), "preview");
  });
  await test("A is in editing mode, then B is opened in the same tab -> B opens in reading view", async () => {
    const { app } = await boot({ data: EN, restored: [{ path: "A.md", state: { mode: "source", source: false } }] });
    const tab = app.workspace.leaves[0];
    app.workspace.navigate(tab, makeFile("B.md", 120));
    await tick();
    assert.equal(modeOf(tab), "preview");
  });
  await test("file explorer is the active leaf while the file opens -> still reading view", async () => {
    const { app } = await boot({ data: EN, restored: [{ path: "A.md", state: { mode: "source", source: false } }] });
    const tab = app.workspace.leaves[0];
    const explorer = app.workspace.addExplorer();
    app.workspace.activate(explorer);
    app.workspace.navigate(tab, makeFile("B.md", 120), { focusStays: true });
    await tick();
    assert.equal(modeOf(tab), "preview");
  });
  await test("Obsidian restores the previous mode right after opening -> plugin re-applies reading view", async () => {
    const { app } = await boot({ data: EN, restored: [{ path: "A.md", state: { mode: "source", source: false } }] });
    const tab = app.workspace.leaves[0];
    app.workspace.revertMs = 30;
    app.workspace.navigate(tab, makeFile("B.md", 120));
    await wait(900);
    assert.equal(modeOf(tab), "preview");
  });
  await test("several files opened one after another in the same tab", async () => {
    const { app } = await boot({ data: EN, restored: [{ path: "A.md", state: { mode: "source", source: false } }] });
    const tab = app.workspace.leaves[0];
    for (const n of ["B.md", "C.md", "D.md"]) {
      app.workspace.navigate(tab, makeFile(n, 50));
      await tick();
      assert.equal(modeOf(tab), "preview", n);
      tab.state = { ...tab.state, mode: "source", source: false }; // user switches to editing each time
    }
    app.workspace.navigate(tab, makeFile("E.md", 50));
    await tick();
    assert.equal(modeOf(tab), "preview");
  });

  // ---- not interfering ----------------------------------------------------
  await test("tab switch / focus changes do not reset a manual toggle", async () => {
    const { app } = await boot({ data: EN, restored: [{ path: "A.md", state: { mode: "preview" } }] });
    const a = app.workspace.leaves[0];
    const b = app.workspace.openFile(makeFile("B.md", 120));
    await wait(800); // the plugin's short verification window after opening has passed
    assert.equal(modeOf(b), "preview");
    b.state = { ...b.state, mode: "source", source: false }; // user toggles B to editing
    const explorer = app.workspace.addExplorer();
    for (const l of [a, explorer, b, a, b]) {
      app.workspace.activate(l);
      app.workspace.emit("layout-change");
    }
    await wait(800); // beyond the verification window
    assert.equal(modeOf(b), "source", "manual toggle must survive");
  });
  await test("returning to a note after another file type in the same tab re-applies the mode", async () => {
    const { app } = await boot({ data: EN });
    const leaf = app.workspace.openFile(makeFile("A.md", 10));
    await tick();
    leaf.state = { ...leaf.state, mode: "source" };
    app.workspace.showNonMarkdown(leaf);
    await tick();
    app.workspace.navigate(leaf, makeFile("A.md", 10));
    await tick();
    assert.equal(modeOf(leaf), "preview");
  });

  // ---- new notes ----------------------------------------------------------
  await test("a note created just now opens in the new-note mode", async () => {
    const { app } = await boot({ data: { ...EN, newMode: "source", existingMode: "reading" } });
    const f = makeFile("Untitled.md", 5);
    app.vault.create(f);
    const leaf = app.workspace.openFile(f);
    await tick();
    assert.equal(modeOf(leaf), "source");
    assert.equal(leaf.state.source, true);
    const again = app.workspace.openFile(makeFile("Untitled.md", 50)); // later: an existing note
    await tick();
    assert.equal(modeOf(again), "preview");
  });
  await test("new note then another existing note in the same tab: new -> editing, existing -> reading", async () => {
    const { app } = await boot({ data: EN });
    const f = makeFile("New.md", 5);
    app.vault.create(f);
    const tab = app.workspace.openFile(f);
    await tick();
    assert.equal(modeOf(tab), "source");
    app.workspace.navigate(tab, makeFile("Old.md", 200));
    await tick();
    assert.equal(modeOf(tab), "preview");
  });
  await test("created note that is renamed before opening is still new", async () => {
    const { app } = await boot({ data: { ...EN, newMode: "source" } });
    const f = makeFile("Untitled.md", 10);
    app.vault.create(f);
    const old = f.path;
    f.path = "Renamed.md";
    app.vault.rename(f, old);
    const leaf = app.workspace.openFile(f);
    await tick();
    assert.equal(modeOf(leaf), "source");
  });
  await test("created note opened after the window counts as existing", async () => {
    const { app } = await boot({ data: { ...EN, newFileWindowSec: 1, treatEmptyAsNew: false } });
    const f = makeFile("Synced.md", 40);
    app.vault.create(f);
    app.vault.advanceClock(5000);
    const leaf = app.workspace.openFile(f);
    await tick();
    assert.equal(modeOf(leaf), "preview");
  });
  await test("empty notes are treated as new when enabled", async () => {
    const { app } = await boot({ data: { ...EN, newMode: "source" } });
    const leaf = app.workspace.openFile(makeFile("Empty.md", 0));
    await tick();
    assert.equal(modeOf(leaf), "source");
  });

  // ---- exceptions ---------------------------------------------------------
  await test("exceptions override both defaults; 'none' leaves Obsidian alone", async () => {
    const { app } = await boot({
      data: {
        ...EN,
        existingMode: "reading",
        exceptions: [
          { type: "folder", pattern: "Daily", mode: "live" },
          { type: "file", pattern: "Keep.md", mode: "none" },
        ],
      },
    });
    const d = app.workspace.openFile(makeFile("Daily/2026-10-24.md", 99));
    await tick();
    assert.equal(modeOf(d), "source");
    assert.equal(d.state.source, false);
    const k = app.workspace.openFile(makeFile("Keep.md", 99), { mode: "source", source: true });
    await tick();
    assert.equal(modeOf(k), "source");
    assert.equal(k.state.source, true);
  });
  await test("reading view keeps the tab's source/live flag untouched", async () => {
    const { app } = await boot({ data: EN, restored: [{ path: "A.md", state: { mode: "source", source: true } }] });
    const tab = app.workspace.leaves[0];
    app.workspace.navigate(tab, makeFile("B.md", 50));
    await tick();
    assert.equal(modeOf(tab), "preview");
    assert.equal(tab.state.source, true);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
