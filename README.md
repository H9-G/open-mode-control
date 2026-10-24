# Open Mode Control

**English** | [日本語](docs/README.ja.md) | [简体中文](docs/README.zh-CN.md) | [繁體中文](docs/README.zh-TW.md) | [한국어](docs/README.ko.md) | [Español](docs/README.es.md) | [Français](docs/README.fr.md) | [Deutsch](docs/README.de.md)

Open existing notes in reading view and new notes in editing view. Choose the mode for each, and add exceptions for specific files, folders or patterns.

## Features

- **Existing notes** open in Reading view by default.
- **New notes** open in Editing view (Live Preview) by default.
- Each of the two can be changed to Reading view, Live Preview, Source mode, or "Don't change" (Obsidian's own behavior).
- **Exceptions** by file, folder (including subfolders) or glob pattern such as `Daily/**/*.md`. Rules are checked from top to bottom, the first match wins, and exceptions override the two defaults.
- A command, **Add current note to exceptions**, and a matching button in the settings.
- The settings and commands are available in English, Japanese, Simplified Chinese, Traditional Chinese, Korean, Spanish, French and German. The language is picked from Obsidian's language on first use and can be changed in the settings.

## How it decides a note is "new"

A note counts as new when it was created during the current session and is opened within the *New-note window* (10 seconds by default). Empty (0-byte) notes also count as new unless you turn that off. Notes that arrive through sync and are opened later are treated as existing.

## Good to know

- The mode is applied when a note is opened in a tab. Switching back to a tab, or toggling the mode yourself, is never overridden.
- Tabs restored when Obsidian starts keep their saved mode.
- Only Markdown notes are affected.
- The plugin makes no network requests and collects no data.

## Installation

**From the community directory:** open Settings → Community plugins → Browse, search for "Open Mode Control", then install and enable it.

**Manual:** download `main.js` and `manifest.json` from the latest release, put them in `<vault>/.obsidian/plugins/open-mode-control/`, then reload Obsidian and enable the plugin.

## Development

```bash
npm install
npm run build        # type-check and bundle to main.js
npm run lint         # official Obsidian plugin lint rules
npm test             # logic tests
npm run test:flow    # event-flow tests with a fake Obsidian API
```

## License

[MIT](LICENSE)
