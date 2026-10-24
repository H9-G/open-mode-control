// Minimal fake of the parts of the Obsidian API this plugin touches.
// It models the behaviours that matter here: navigating inside one tab keeps that tab's mode,
// the active leaf may be a sidebar view, restored tabs can be deferred, and Obsidian may
// restore the previous mode shortly after a file is opened (revertMs).
type Handler = (...a: any[]) => any;

export class FakeFile {
  extension = "md";
  stat: { size: number };
  constructor(public path: string, size: number) {
    this.stat = { size };
  }
}
export class TFile extends FakeFile {}
export const makeFile = (path: string, size: number): FakeFile => new TFile(path, size);

export class MarkdownView {
  constructor(public leaf: FakeLeaf, public file: FakeFile | null) {}
  getState() {
    return { ...this.leaf.state };
  }
  async setState(state: any, _result?: unknown) {
    this.leaf.state = { ...state };
    this.leaf.workspace.emit("layout-change");
  }
}
export class OtherView {
  constructor(public leaf: FakeLeaf) {}
}

export class FakeLeaf {
  type = "markdown";
  state: any;
  view: MarkdownView | OtherView | null = null;
  isDeferred = false;
  constructor(public workspace: FakeWorkspace, public root: object, state: any = {}) {
    this.state = { mode: "source", source: false, ...state };
  }
  getRoot() {
    return this.root;
  }
  getViewState() {
    return { type: this.type, state: { ...this.state } };
  }
  async setViewState(vs: any) {
    this.type = vs.type;
    this.state = { ...vs.state };
    this.workspace.emit("layout-change");
  }
}
export class WorkspaceLeaf extends FakeLeaf {}

export let mockLanguage = "ja";
export const setMockLanguage = (l: string) => {
  mockLanguage = l;
};
export const getLanguage = () => mockLanguage;

export class Notice {
  constructor(_m: string) {}
}
export class Plugin {
  __data: any = null;
  __saved: any = null;
  constructor(public app: any, public manifest: any) {}
  async loadData() {
    return this.__data;
  }
  async saveData(d: any) {
    this.__saved = JSON.parse(JSON.stringify(d));
  }
  addSettingTab() {}
  addCommand() {}
  registerEvent(_e: unknown) {}
}
export class PluginSettingTab {
  containerEl: any = {};
  constructor(public app: any, public plugin: any) {}
}
export class Setting {}

class FakeVault {
  handlers = new Map<string, Handler[]>();
  on(name: string, cb: Handler) {
    (this.handlers.get(name) ?? this.handlers.set(name, []).get(name)!).push(cb);
    return {};
  }
  emit(name: string, ...a: any[]) {
    (this.handlers.get(name) ?? []).forEach((h) => h(...a));
  }
  create(f: FakeFile) {
    this.emit("create", f);
  }
  rename(f: FakeFile, old: string) {
    this.emit("rename", f, old);
  }
  /** Pretend time has passed by shifting Date.now. */
  advanceClock(ms: number) {
    const real = Date.now;
    Date.now = () => real() + ms;
  }
}

class FakeWorkspace {
  handlers = new Map<string, Handler[]>();
  leaves: FakeLeaf[] = [];
  files = new Map<string, FakeFile>();
  active: FakeLeaf | null = null;
  rootSplit = {};
  leftSplit = {};
  rightSplit = {};
  /** When > 0, Obsidian "restores" the previous mode this many ms after a file is opened in a tab. */
  revertMs = 0;

  on(name: string, cb: Handler) {
    (this.handlers.get(name) ?? this.handlers.set(name, []).get(name)!).push(cb);
    return {};
  }
  emit(name: string, ...a: any[]) {
    (this.handlers.get(name) ?? []).forEach((h) => h(...a));
  }
  onLayoutReady(cb: () => void) {
    cb();
  }
  iterateAllLeaves(cb: (l: FakeLeaf) => void) {
    [...this.leaves].forEach(cb);
  }
  getActiveViewOfType(cls: unknown) {
    const v = this.active?.view;
    return v && v instanceof (cls as new (...a: any[]) => object) ? v : null;
  }
  getMostRecentLeaf() {
    return this.active;
  }
  getActiveFile() {
    const v = this.active?.view;
    return v instanceof MarkdownView ? v.file : null;
  }

  /** A tab restored from the saved layout, already loaded. */
  addLeaf(path: string, state: any = {}) {
    const f = new TFile(path, 100);
    this.files.set(path, f);
    const leaf = new FakeLeaf(this, this.rootSplit, { ...state, file: path });
    leaf.view = new MarkdownView(leaf, f);
    this.leaves.push(leaf);
    this.active = leaf;
    return leaf;
  }
  /** A tab restored from the saved layout whose view is not loaded yet (Obsidian 1.7.2+). */
  addDeferredLeaf(path: string, state: any = {}) {
    const leaf = new FakeLeaf(this, this.rootSplit, { ...state, file: path });
    leaf.isDeferred = true;
    this.files.set(path, new TFile(path, 100));
    this.leaves.push(leaf);
    return leaf;
  }
  loadDeferred(leaf: FakeLeaf) {
    leaf.isDeferred = false;
    leaf.view = new MarkdownView(leaf, this.files.get(leaf.state.file)!);
    this.emit("layout-change");
  }
  /** Left sidebar view such as the file explorer. */
  addExplorer() {
    const leaf = new FakeLeaf(this, this.leftSplit);
    leaf.type = "file-explorer";
    leaf.view = new OtherView(leaf);
    this.leaves.push(leaf);
    return leaf;
  }
  /** Open a file in a brand-new tab, like Ctrl+click. */
  openFile(file: FakeFile, initialState: any = {}) {
    this.files.set(file.path, file);
    const leaf = new FakeLeaf(this, this.rootSplit, { ...initialState, file: file.path });
    leaf.view = new MarkdownView(leaf, file);
    this.leaves.push(leaf);
    this.active = leaf;
    this.emit("file-open", file);
    this.emit("active-leaf-change", leaf);
    this.emit("layout-change");
    return leaf;
  }
  /**
   * Navigate an existing tab to another file. Like Obsidian, the tab keeps its current mode.
   * `focusStays` keeps the previously active leaf (e.g. the file explorer) active.
   */
  navigate(leaf: FakeLeaf, file: FakeFile, opts: { focusStays?: boolean } = {}) {
    const prev = { mode: leaf.state.mode, source: leaf.state.source };
    this.files.set(file.path, file);
    leaf.type = "markdown";
    leaf.state = { ...leaf.state, file: file.path };
    if (leaf.view instanceof MarkdownView) leaf.view.file = file;
    else leaf.view = new MarkdownView(leaf, file);
    if (!opts.focusStays) this.active = leaf;
    this.emit("file-open", file);
    this.emit("layout-change");
    if (this.revertMs > 0) {
      setTimeout(() => {
        if (leaf.view instanceof MarkdownView && leaf.view.file === file) {
          leaf.state = { ...leaf.state, ...prev };
          this.emit("layout-change");
        }
      }, this.revertMs);
    }
  }
  showNonMarkdown(leaf: FakeLeaf) {
    leaf.type = "image";
    leaf.view = new OtherView(leaf);
    this.active = leaf;
    this.emit("file-open", null);
    this.emit("layout-change");
  }
  activate(leaf: FakeLeaf) {
    this.active = leaf;
    this.emit("active-leaf-change", leaf);
  }
}

export class FakeApp {
  vault = new FakeVault();
  workspace = new FakeWorkspace();
}
