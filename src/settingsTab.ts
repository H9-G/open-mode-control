import { App, PluginSettingTab, Setting } from "obsidian";
import type OpenModeControlPlugin from "./main";
import { LANGUAGES, MessageKey, isLangCode } from "./i18n";
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

  display(): void {
    const { containerEl } = this;
    const s = this.plugin.settings;
    const t = (k: MessageKey) => this.plugin.t(k);
    containerEl.empty();

    containerEl.createEl("p", { text: t("pluginDesc"), cls: "setting-item-description" });

    // Language
    new Setting(containerEl)
      .setName(t("language"))
      .setDesc(t("languageDesc"))
      .addDropdown((d) => {
        for (const [code, label] of Object.entries(LANGUAGES)) d.addOption(code, label);
        d.setValue(s.language).onChange(async (v) => {
          if (!isLangCode(v)) return;
          s.language = v;
          await this.plugin.saveSettings();
          this.display();
        });
      });

    // Default modes
    this.addModeSetting(containerEl, t("existingMode"), t("existingModeDesc"), s.existingMode, async (v) => {
      s.existingMode = v;
      await this.plugin.saveSettings();
    });
    this.addModeSetting(containerEl, t("newMode"), t("newModeDesc"), s.newMode, async (v) => {
      s.newMode = v;
      await this.plugin.saveSettings();
    });

    // New-note detection
    new Setting(containerEl)
      .setName(t("newFileWindow"))
      .setDesc(t("newFileWindowDesc"))
      .addText((txt) => {
        txt.inputEl.type = "number";
        txt.inputEl.min = "1";
        txt.inputEl.max = "600";
        txt.setValue(String(s.newFileWindowSec)).onChange(async (v) => {
          const n = Math.floor(Number(v));
          if (Number.isFinite(n) && n >= 1 && n <= 600) {
            s.newFileWindowSec = n;
            await this.plugin.saveSettings();
          }
        });
      });

    new Setting(containerEl)
      .setName(t("treatEmptyAsNew"))
      .setDesc(t("treatEmptyAsNewDesc"))
      .addToggle((tg) =>
        tg.setValue(s.treatEmptyAsNew).onChange(async (v) => {
          s.treatEmptyAsNew = v;
          await this.plugin.saveSettings();
        })
      );

    // Exceptions
    new Setting(containerEl).setName(t("exceptions")).setHeading();
    containerEl.createEl("p", { text: t("exceptionsDesc"), cls: "setting-item-description" });

    s.exceptions.forEach((rule, index) => {
      const row = new Setting(containerEl);
      row.addDropdown((d) => {
        for (const type of RULE_TYPES) d.addOption(type, t(TYPE_LABEL[type]));
        d.setValue(rule.type).onChange(async (v) => {
          rule.type = v as RuleType;
          await this.plugin.saveSettings();
          this.display();
        });
      });
      row.addText((txt) =>
        txt
          .setPlaceholder(t(PLACEHOLDER[rule.type]))
          .setValue(rule.pattern)
          .onChange(async (v) => {
            rule.pattern = v;
            await this.plugin.saveSettings();
          })
      );
      row.addDropdown((d) => {
        for (const m of MODE_CHOICES) d.addOption(m, t(MODE_LABEL[m]));
        d.setValue(rule.mode).onChange(async (v) => {
          rule.mode = v as ModeChoice;
          await this.plugin.saveSettings();
        });
      });
      row.addExtraButton((b) =>
        b
          .setIcon("trash")
          .setTooltip(t("deleteRule"))
          .onClick(async () => {
            s.exceptions.splice(index, 1);
            await this.plugin.saveSettings();
            this.display();
          })
      );
    });

    new Setting(containerEl)
      .addButton((b) =>
        b
          .setButtonText(t("addRule"))
          .setCta()
          .onClick(async () => {
            s.exceptions.push({ type: "folder", pattern: "", mode: this.plugin.oppositeOfExisting() });
            await this.plugin.saveSettings();
            this.display();
          })
      )
      .addButton((b) =>
        b.setButtonText(t("addActiveFile")).onClick(async () => {
          if (await this.plugin.addActiveFileException()) this.display();
        })
      );
  }

  private addModeSetting(
    el: HTMLElement,
    name: string,
    desc: string,
    value: ModeChoice,
    onChange: (v: ModeChoice) => Promise<void>
  ): void {
    new Setting(el)
      .setName(name)
      .setDesc(desc)
      .addDropdown((d) => {
        for (const m of MODE_CHOICES) d.addOption(m, this.plugin.t(MODE_LABEL[m]));
        d.setValue(value).onChange((v) => onChange(v as ModeChoice));
      });
  }
}
