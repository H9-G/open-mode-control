import { App, PluginSettingTab, SettingDefinitionItem } from "obsidian";
import type OpenModeControlPlugin from "./main";
import { LANGUAGES, MessageKey } from "./i18n";
import { ModeChoice, MODE_CHOICES, RuleType, RULE_TYPES } from "./settings";

const MODE_LABEL: Record<ModeChoice, MessageKey> = {
  none: "modeNone",
  reading: "modeReading",
  live: "modeLive",
  source: "modeSource",
};

const TYPE_LABEL: Record<RuleType, MessageKey> = {
  file: "typeFile",
  folder: "typeFolder",
  glob: "typeGlob",
};

const PLACEHOLDER: Record<RuleType, MessageKey> = {
  file: "placeholderFile",
  folder: "placeholderFolder",
  glob: "placeholderGlob",
};

export class OpenModeSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: OpenModeControlPlugin) {
    super(app, plugin);
  }

  getControlValue(key: string): unknown {
    return (this.plugin.settings as unknown as Record<string, unknown>)[key];
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    if (key === "newFileWindowSec") {
      const n = Math.floor(Number(value));
      if (!Number.isFinite(n) || n < 1 || n > 600) return; // keep the last good value
      value = n;
    }
    (this.plugin.settings as unknown as Record<string, unknown>)[key] = value;
    await this.plugin.saveSettings();
    if (key === "language") this.update(); // names and descriptions change language
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    const s = this.plugin.settings;
    const t = (k: MessageKey) => this.plugin.t(k);
    const modeOptions = Object.fromEntries(MODE_CHOICES.map((m) => [m, t(MODE_LABEL[m])]));
    const typeOptions = Object.fromEntries(RULE_TYPES.map((r) => [r, t(TYPE_LABEL[r])]));

    return [
      {
        name: t("language"),
        desc: t("languageDesc"),
        control: { type: "dropdown", key: "language", options: { ...LANGUAGES } },
      },
      {
        name: t("existingMode"),
        desc: t("existingModeDesc"),
        control: { type: "dropdown", key: "existingMode", options: modeOptions },
      },
      {
        name: t("newMode"),
        desc: t("newModeDesc"),
        control: { type: "dropdown", key: "newMode", options: modeOptions },
      },
      {
        name: t("newFileWindow"),
        desc: t("newFileWindowDesc"),
        control: { type: "number", key: "newFileWindowSec", min: 1, max: 600, step: 1 },
      },
      {
        name: t("treatEmptyAsNew"),
        desc: t("treatEmptyAsNewDesc"),
        control: { type: "toggle", key: "treatEmptyAsNew" },
      },
      {
        type: "list",
        heading: t("exceptions"),
        emptyState: t("exceptionsDesc"),
        addItem: {
          name: t("addRule"),
          action: () => {
            s.exceptions.push({ type: "folder", pattern: "", mode: this.plugin.oppositeOfExisting() });
            void this.plugin.saveSettings().then(() => this.update());
          },
        },
        onDelete: (index) => {
          s.exceptions.splice(index, 1);
          void this.plugin.saveSettings().then(() => this.update());
        },
        onReorder: (oldIndex, newIndex) => {
          const [moved] = s.exceptions.splice(oldIndex, 1);
          if (moved) s.exceptions.splice(newIndex, 0, moved);
          void this.plugin.saveSettings().then(() => this.update());
        },
        items: s.exceptions.map((rule) => ({
          name: "",
          searchable: false,
          render: (setting) => {
            setting.addDropdown((d) => {
              d.addOptions(typeOptions);
              d.setValue(rule.type).onChange(async (v) => {
                rule.type = v as RuleType;
                await this.plugin.saveSettings();
                this.update(); // the example text depends on the type
              });
            });
            setting.addText((txt) =>
              txt
                .setPlaceholder(t(PLACEHOLDER[rule.type]))
                .setValue(rule.pattern)
                .onChange(async (v) => {
                  rule.pattern = v;
                  await this.plugin.saveSettings();
                })
            );
            setting.addDropdown((d) => {
              d.addOptions(modeOptions);
              d.setValue(rule.mode).onChange(async (v) => {
                rule.mode = v as ModeChoice;
                await this.plugin.saveSettings();
              });
            });
          },
        })),
      },
      {
        name: t("addActiveFile"),
        desc: t("exceptionsDesc"),
        action: () => {
          void this.plugin.addActiveFileException().then((added) => {
            if (added) this.update();
          });
        },
      },
    ];
  }
}
