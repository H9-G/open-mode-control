import { MarkdownView, Notice, Plugin, TFile, WorkspaceLeaf, getLanguage } from "obsidian";
import { MessageKey, detectLanguage, tr } from "./i18n";
import { modeToState, resolveMode, stateAlreadyMatches } from "./match";
import { DEFAULT_SETTINGS, ModeChoice, OpenModeSettings, sanitizeSettings } from "./settings";
import { OpenModeSettingTab } from "./settingsTab";

/**
 * Obsidian can still be finishing its own work (restoring the tab's previous mode, scrolling,
 * focusing) right after a file opens. The chosen mode is therefore checked again after these
 * delays and re-applied if it was overwritten. Nothing runs after the last delay, so a mode
 * you switch by hand later is never touched.
 */
const VERIFY_DELAYS_MS = [150, 600];

type ChosenMode = Exclude<ModeChoice, "none">;

export default class OpenModeControlPlugin extends Plugin {
  settings: OpenModeSettings = { ...DEFAULT_SETTINGS };

  /** Notes created during this session: path -> creation time (ms). */
  private fresh = new Map<string, number>();
  /** The file each tab was last handled for. A tab is handled again only when its file changes. */
  private handled = new WeakMap<WorkspaceLeaf, string>();
  private timers = new Set<number>();

  t(key: MessageKey): string {
    return tr(this.settings.language, key);
  }

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new OpenModeSettingTab(this.app, this));

    this.addCommand({
      id: "add-active-file-exception",
      name: this.t("cmdAddActive"),
      callback: () => {
        void this.addActiveFileException();
      },
    });

    // Wait for the workspace so notes restored at startup keep their saved mode
    // and the vault's initial "create" events for existing files are ignored.
    this.app.workspace.onLayoutReady(() => {
      this.snapshotLeaves();

      this.registerEvent(
        this.app.vault.on("create", (file) => {
          if (file instanceof TFile && file.extension === "md") {
            this.pruneFresh();
            this.fresh.set(file.path, Date.now());
          }
        })
      );
      this.registerEvent(
        this.app.vault.on("rename", (file, oldPath) => {
          const created = this.fresh.get(oldPath);
          if (created !== undefined) {
            this.fresh.delete(oldPath);
            this.fresh.set(file.path, created);
          }
        })
      );
      this.registerEvent(this.app.vault.on("delete", (file) => this.fresh.delete(file.path)));

      // Every tab is inspected on each of these events instead of only the focused one:
      // a file opened from the file explorer or a link can land in a tab that is not the active leaf.
      this.registerEvent(this.app.workspace.on("file-open", () => this.scan()));
      this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.scan()));
      this.registerEvent(this.app.workspace.on("layout-change", () => this.scan()));
    });
  }

  onunload(): void {
    for (const id of this.timers) window.clearTimeout(id);
    this.timers.clear();
  }

  async loadSettings(): Promise<void> {
    const data = (await this.loadData()) as Record<string, unknown> | null;
    this.settings = sanitizeSettings(data);
    // First run (no saved language yet): follow the language Obsidian is using.
    if (!data || !data.language) {
      this.settings.language = detectLanguage(getLanguage());
      await this.saveSettings();
    }
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  /** Default mode for a new exception: the opposite of the existing-note mode. */
  oppositeOfExisting(): ModeChoice {
    return this.settings.existingMode === "reading" ? "live" : "reading";
  }

  async addActiveFileException(): Promise<boolean> {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new Notice(this.t("noActiveFile"));
      return false;
    }
    this.settings.exceptions.push({ type: "file", pattern: file.path, mode: this.oppositeOfExisting() });
    await this.saveSettings();
    new Notice(`${this.t("ruleAdded")}: ${file.path}`);
    return true;
  }

  private pruneFresh(): void {
    const limit = Math.max(this.settings.newFileWindowSec, 1) * 1000;
    const now = Date.now();
    for (const [path, created] of this.fresh) {
      if (now - created > limit) this.fresh.delete(path);
    }
  }

  private isSidebar(leaf: WorkspaceLeaf): boolean {
    const root = leaf.getRoot();
    return root === this.app.workspace.leftSplit || root === this.app.workspace.rightSplit;
  }

  /** Remember what is already open so those tabs are left alone. */
  private snapshotLeaves(): void {
    this.app.workspace.iterateAllLeaves((leaf) => {
      const vs = leaf.getViewState();
      const file = (vs.state as { file?: string } | undefined)?.file;
      if (vs.type === "markdown" && file) this.handled.set(leaf, file);
    });
  }

  /** Find tabs that now show a different note than the one last handled, and apply the mode to them. */
  private scan(): void {
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (this.isSidebar(leaf)) return;
      // Tabs restored at startup stay unloaded until you click them; they keep their saved mode.
      if (leaf.isDeferred) return;

      const view = leaf.view;
      if (!(view instanceof MarkdownView) || !view.file) {
        // Showing something else (image, canvas, empty tab...). Forget it, so coming back to a note counts as opening it again.
        this.handled.delete(leaf);
        return;
      }
      const file = view.file;
      if (this.handled.get(leaf) === file.path) return;
      this.handled.set(leaf, file.path);
      this.applyTo(leaf, file);
    });
  }

  /** True (and consumed) if this note was created just now. */
  private consumeNew(file: TFile): boolean {
    const created = this.fresh.get(file.path);
    if (created !== undefined) {
      this.fresh.delete(file.path);
      if (Date.now() - created <= this.settings.newFileWindowSec * 1000) return true;
    }
    return this.settings.treatEmptyAsNew && file.stat.size === 0;
  }

  private applyTo(leaf: WorkspaceLeaf, file: TFile): void {
    const isNew = this.consumeNew(file);
    const { mode } = resolveMode(file.path, isNew, this.settings);
    if (mode === "none") return;
    void this.enforce(leaf, file.path, mode, 0);
  }

  /**
   * Put the tab into the wanted mode, then check again after a short delay (see VERIFY_DELAYS_MS).
   * Attempt 0 and 1 use the view's own setState; the last attempt falls back to a full setViewState.
   */
  private async enforce(leaf: WorkspaceLeaf, path: string, mode: ChosenMode, attempt: number): Promise<void> {
    const view = leaf.view;
    // The tab moved on to another note in the meantime: not ours to touch any more.
    if (!(view instanceof MarkdownView) || view.file?.path !== path) return;

    const current = view.getState() as { mode?: string; source?: boolean };
    if (!stateAlreadyMatches(current, mode)) {
      const next = { ...current, ...modeToState(mode) };
      try {
        if (attempt < VERIFY_DELAYS_MS.length) {
          await view.setState(next, { history: false });
        } else {
          await leaf.setViewState({ type: "markdown", state: next });
        }
      } catch (e) {
        console.error("[Open Mode Control] failed to switch mode", e);
      }
    }

    const delay = VERIFY_DELAYS_MS[attempt];
    if (delay === undefined) return;
    const id = window.setTimeout(() => {
      this.timers.delete(id);
      void this.enforce(leaf, path, mode, attempt + 1);
    }, delay);
    this.timers.add(id);
  }
}
