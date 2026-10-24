import { LangCode, isLangCode } from "./i18n";

/** none = leave Obsidian's own behaviour untouched */
export type ModeChoice = "none" | "reading" | "live" | "source";
export type RuleType = "file" | "folder" | "glob";

export const MODE_CHOICES: ModeChoice[] = ["none", "reading", "live", "source"];
export const RULE_TYPES: RuleType[] = ["file", "folder", "glob"];

export interface ExceptionRule {
  type: RuleType;
  pattern: string;
  mode: ModeChoice;
}

export interface OpenModeSettings {
  language: LangCode;
  /** Mode used when opening a note that already existed */
  existingMode: ModeChoice;
  /** Mode used when opening a note that was just created */
  newMode: ModeChoice;
  /** Exceptions; evaluated top to bottom, first match wins, and they beat the two defaults above */
  exceptions: ExceptionRule[];
  /** A created note counts as "new" for this many seconds */
  newFileWindowSec: number;
  /** Also treat empty (0 byte) notes as new */
  treatEmptyAsNew: boolean;
}

export const DEFAULT_SETTINGS: OpenModeSettings = {
  language: "en",
  existingMode: "reading",
  newMode: "live",
  exceptions: [],
  newFileWindowSec: 10,
  treatEmptyAsNew: true,
};

const isMode = (v: unknown): v is ModeChoice =>
  typeof v === "string" && (MODE_CHOICES as string[]).includes(v);
const isRuleType = (v: unknown): v is RuleType =>
  typeof v === "string" && (RULE_TYPES as string[]).includes(v);

/** Merge stored data over the defaults, dropping anything malformed. */
export function sanitizeSettings(raw: unknown): OpenModeSettings {
  const d = DEFAULT_SETTINGS;
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const win = Number(r.newFileWindowSec);
  const exceptions: ExceptionRule[] = [];
  if (Array.isArray(r.exceptions)) {
    for (const e of r.exceptions as Record<string, unknown>[]) {
      if (e && isRuleType(e.type) && typeof e.pattern === "string" && isMode(e.mode)) {
        exceptions.push({ type: e.type, pattern: e.pattern, mode: e.mode });
      }
    }
  }
  return {
    language: isLangCode(r.language) ? r.language : d.language,
    existingMode: isMode(r.existingMode) ? r.existingMode : d.existingMode,
    newMode: isMode(r.newMode) ? r.newMode : d.newMode,
    exceptions,
    newFileWindowSec: Number.isFinite(win) && win >= 1 && win <= 600 ? Math.floor(win) : d.newFileWindowSec,
    treatEmptyAsNew: typeof r.treatEmptyAsNew === "boolean" ? r.treatEmptyAsNew : d.treatEmptyAsNew,
  };
}
