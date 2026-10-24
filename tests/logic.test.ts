import assert from "node:assert/strict";
import { detectLanguage, tr, LANGUAGES, MessageKey } from "../src/i18n";
import { globToRegExp, modeToState, resolveMode, ruleMatches, stateAlreadyMatches } from "../src/match";
import { DEFAULT_SETTINGS, sanitizeSettings } from "../src/settings";

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log("ok   " + name);
  } catch (e) {
    console.error("FAIL " + name);
    throw e;
  }
}

// --- language detection ---------------------------------------------------
test("detectLanguage: supported languages", () => {
  assert.equal(detectLanguage("ja"), "ja");
  assert.equal(detectLanguage("ko"), "ko");
  assert.equal(detectLanguage("en-US"), "en");
  assert.equal(detectLanguage("de_DE"), "de");
  assert.equal(detectLanguage("fr"), "fr");
  assert.equal(detectLanguage("es-MX"), "es");
});
test("detectLanguage: Chinese variants", () => {
  assert.equal(detectLanguage("zh"), "zh-CN");
  assert.equal(detectLanguage("zh-CN"), "zh-CN");
  assert.equal(detectLanguage("zh-TW"), "zh-TW");
  assert.equal(detectLanguage("zh-HK"), "zh-TW");
  assert.equal(detectLanguage("zh-Hant"), "zh-TW");
});
test("detectLanguage: first non-empty candidate wins, unsupported -> en", () => {
  assert.equal(detectLanguage(null, undefined, "", "ja"), "ja");
  assert.equal(detectLanguage("ru", "ja"), "en");
  assert.equal(detectLanguage(), "en");
});
test("every language has every message", () => {
  const keys = Object.keys(
    // en keys are the source of truth
    Object.fromEntries(
      (["language", "existingMode", "newMode", "exceptions", "cmdAddActive", "modeLive", "ruleAdded"] as MessageKey[]).map((k) => [k, 1])
    )
  ) as MessageKey[];
  for (const code of Object.keys(LANGUAGES) as (keyof typeof LANGUAGES)[]) {
    for (const k of keys) assert.ok(tr(code, k).length > 0, `${code}.${k}`);
  }
  assert.notEqual(tr("ja", "existingMode"), tr("en", "existingMode"));
});

// --- matching -------------------------------------------------------------
test("file rule: exact path, .md optional, case-insensitive", () => {
  const r = { type: "file", pattern: "Projects/Plan.md", mode: "live" } as const;
  assert.ok(ruleMatches(r, "Projects/Plan.md"));
  assert.ok(ruleMatches({ ...r, pattern: "projects/plan" }, "Projects/Plan.md"));
  assert.ok(!ruleMatches(r, "Projects/Plan2.md"));
  assert.ok(!ruleMatches(r, "Other/Projects/Plan.md"));
});
test("folder rule: includes subfolders, not siblings with same prefix", () => {
  const r = { type: "folder", pattern: "Daily", mode: "live" } as const;
  assert.ok(ruleMatches(r, "Daily/2026-10-24.md"));
  assert.ok(ruleMatches(r, "Daily/2026/10/24.md"));
  assert.ok(!ruleMatches(r, "Daily-archive/x.md"));
  assert.ok(!ruleMatches(r, "Daily.md"));
  assert.ok(ruleMatches({ ...r, pattern: "/Daily/" }, "Daily/a.md"));
});
test("glob rule", () => {
  assert.ok(globToRegExp("Daily/*.md").test("Daily/a.md"));
  assert.ok(!globToRegExp("Daily/*.md").test("Daily/2026/a.md"));
  assert.ok(globToRegExp("Daily/**/*.md").test("Daily/2026/a.md"));
  assert.ok(globToRegExp("Daily/**/*.md").test("Daily/a.md"));
  assert.ok(globToRegExp("**/*.template.md").test("a/b/x.template.md"));
  assert.ok(globToRegExp("**/*.template.md").test("x.template.md"));
  assert.ok(globToRegExp("note?.md").test("note1.md"));
  assert.ok(!globToRegExp("note?.md").test("note12.md"));
  assert.ok(globToRegExp("a+b (1).md").test("a+b (1).md")); // regex chars are escaped
});
test("empty patterns never match", () => {
  assert.ok(!ruleMatches({ type: "folder", pattern: "", mode: "live" }, "a.md"));
  assert.ok(!ruleMatches({ type: "glob", pattern: "  ", mode: "live" }, "a.md"));
});

// --- mode resolution ------------------------------------------------------
test("defaults: existing -> reading, new -> live", () => {
  assert.deepEqual(resolveMode("a.md", false, DEFAULT_SETTINGS), { mode: "reading", reason: "existing" });
  assert.deepEqual(resolveMode("a.md", true, DEFAULT_SETTINGS), { mode: "live", reason: "new" });
});
test("exceptions beat defaults, first match wins", () => {
  const s = {
    existingMode: "reading" as const,
    newMode: "live" as const,
    exceptions: [
      { type: "folder" as const, pattern: "Templates", mode: "source" as const },
      { type: "glob" as const, pattern: "**/*.md", mode: "none" as const },
    ],
  };
  assert.deepEqual(resolveMode("Templates/t.md", false, s), { mode: "source", reason: "exception" });
  assert.deepEqual(resolveMode("Other/o.md", true, s), { mode: "none", reason: "exception" });
});
test("modes are configurable for both existing and new", () => {
  const s = { existingMode: "source" as const, newMode: "reading" as const, exceptions: [] };
  assert.equal(resolveMode("a.md", false, s).mode, "source");
  assert.equal(resolveMode("a.md", true, s).mode, "reading");
});

// --- view state -----------------------------------------------------------
test("modeToState", () => {
  assert.deepEqual(modeToState("reading"), { mode: "preview" }); // leaves the tab's live/source flag alone
  assert.deepEqual(modeToState("live"), { mode: "source", source: false });
  assert.deepEqual(modeToState("source"), { mode: "source", source: true });
});
test("stateAlreadyMatches", () => {
  assert.ok(stateAlreadyMatches({ mode: "preview" }, "reading"));
  assert.ok(stateAlreadyMatches({ mode: "preview", source: true }, "reading"));
  assert.ok(stateAlreadyMatches({ mode: "preview", source: false }, "reading"));
  assert.ok(stateAlreadyMatches({ mode: "source", source: false }, "live"));
  assert.ok(stateAlreadyMatches({ mode: "source" }, "live"));
  assert.ok(!stateAlreadyMatches({ mode: "source", source: true }, "live"));
  assert.ok(!stateAlreadyMatches({ mode: "source", source: false }, "source"));
  assert.ok(!stateAlreadyMatches(undefined, "reading"));
});

// --- settings -------------------------------------------------------------
test("sanitizeSettings: defaults and bad data", () => {
  assert.deepEqual(sanitizeSettings(null), DEFAULT_SETTINGS);
  const s = sanitizeSettings({
    language: "xx",
    existingMode: "bogus",
    newMode: "source",
    newFileWindowSec: 99999,
    exceptions: [{ type: "file", pattern: "a.md", mode: "live" }, { type: "nope" }, null, "x"],
    treatEmptyAsNew: "yes",
  });
  assert.equal(s.language, DEFAULT_SETTINGS.language);
  assert.equal(s.existingMode, DEFAULT_SETTINGS.existingMode);
  assert.equal(s.newMode, "source");
  assert.equal(s.newFileWindowSec, DEFAULT_SETTINGS.newFileWindowSec);
  assert.equal(s.treatEmptyAsNew, true);
  assert.deepEqual(s.exceptions, [{ type: "file", pattern: "a.md", mode: "live" }]);
});
test("sanitizeSettings keeps valid values", () => {
  const s = sanitizeSettings({ language: "ja", existingMode: "live", newMode: "none", newFileWindowSec: 30, treatEmptyAsNew: false });
  assert.deepEqual(s, { ...DEFAULT_SETTINGS, language: "ja", existingMode: "live", newMode: "none", newFileWindowSec: 30, treatEmptyAsNew: false });
});

console.log(`\n${passed} tests passed`);
