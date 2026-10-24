import { ExceptionRule, ModeChoice, OpenModeSettings } from "./settings";

export function normalizePath(p: string): string {
  return p.trim().replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
}

const stripMd = (p: string) => p.replace(/\.md$/i, "");

/**
 * Glob support: `*` = any characters except "/", `**` = anything including "/",
 * `**` followed by "/" also matches zero directories, `?` = one character except "/".
 */
export function globToRegExp(glob: string): RegExp {
  const g = normalizePath(glob);
  let re = "";
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === "*") {
      if (g[i + 1] === "*") {
        if (g[i + 2] === "/") {
          re += "(?:.*/)?";
          i += 2;
        } else {
          re += ".*";
          i += 1;
        }
      } else {
        re += "[^/]*";
      }
    } else if (c === "?") {
      re += "[^/]";
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp("^" + re + "$", "i");
}

export function ruleMatches(rule: ExceptionRule, path: string): boolean {
  const pattern = normalizePath(rule.pattern);
  if (pattern === "") return false;
  const p = normalizePath(path);
  switch (rule.type) {
    case "file":
      return stripMd(p).toLowerCase() === stripMd(pattern).toLowerCase();
    case "folder":
      return p.toLowerCase().startsWith(pattern.toLowerCase() + "/");
    case "glob":
      try {
        return globToRegExp(pattern).test(p);
      } catch {
        return false;
      }
  }
}

export interface Resolution {
  mode: ModeChoice;
  reason: "exception" | "new" | "existing";
}

export function resolveMode(
  path: string,
  isNew: boolean,
  s: Pick<OpenModeSettings, "exceptions" | "existingMode" | "newMode">
): Resolution {
  for (const rule of s.exceptions) {
    if (ruleMatches(rule, path)) return { mode: rule.mode, reason: "exception" };
  }
  return isNew ? { mode: s.newMode, reason: "new" } : { mode: s.existingMode, reason: "existing" };
}

/**
 * Obsidian markdown view state for each mode choice.
 * Reading view only sets `mode`: the tab keeps its own Live Preview / Source flag for when you switch back to editing.
 */
export function modeToState(mode: Exclude<ModeChoice, "none">): { mode: "preview" | "source"; source?: boolean } {
  switch (mode) {
    case "reading":
      return { mode: "preview" };
    case "live":
      return { mode: "source", source: false };
    case "source":
      return { mode: "source", source: true };
  }
}

/** True when a tab's current state already equals the wanted mode. */
export function stateAlreadyMatches(
  current: { mode?: string; source?: boolean } | undefined,
  mode: Exclude<ModeChoice, "none">
): boolean {
  const want = modeToState(mode);
  if (!current || current.mode !== want.mode) return false;
  if (want.source === undefined) return true;
  return Boolean(current.source) === want.source;
}
