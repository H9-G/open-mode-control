# Open Mode Control

[English](../README.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md)

Öffnet vorhandene Notizen in der Leseansicht und neue Notizen in der Bearbeitungsansicht. Wähle den Modus für jede Art und lege Ausnahmen für bestimmte Dateien, Ordner oder Muster fest.

## Funktionen

- **Vorhandene Notizen** öffnen standardmäßig in der Leseansicht.
- **Neue Notizen** öffnen standardmäßig in der Bearbeitungsansicht (Live-Vorschau).
- Beide lassen sich auf Leseansicht, Live-Vorschau, Quellmodus oder „Nicht ändern“ (Standardverhalten von Obsidian) umstellen.
- **Ausnahmen** nach Datei, Ordner (einschließlich Unterordner) oder Glob-Muster wie `Daily/**/*.md`. Die Regeln werden von oben nach unten geprüft, die erste passende gilt, und sie haben Vorrang vor den beiden Standardeinstellungen.
- Ein Befehl, **Aktuelle Notiz zu den Ausnahmen hinzufügen**, und eine entsprechende Schaltfläche in den Einstellungen.
- Einstellungen und Befehle gibt es auf Englisch, Japanisch, Vereinfachtem Chinesisch, Traditionellem Chinesisch, Koreanisch, Spanisch, Französisch und Deutsch. Die Sprache wird bei der ersten Verwendung anhand der Obsidian-Sprache gewählt und lässt sich in den Einstellungen ändern.

## Wann eine Notiz als „neu“ gilt

Eine Notiz gilt als neu, wenn sie in der aktuellen Sitzung erstellt und innerhalb des *Zeitfensters für neue Notizen* (standardmäßig 10 Sekunden) geöffnet wird. Leere Notizen (0 Byte) gelten ebenfalls als neu, sofern du das nicht abschaltest. Per Sync eingetroffene und später geöffnete Notizen gelten als vorhanden.

## Gut zu wissen

- Der Modus wird angewendet, wenn eine Notiz in einem Tab geöffnet wird. Tab-Wechsel oder ein von dir umgeschalteter Modus werden nie überschrieben.
- Beim Start von Obsidian wiederhergestellte Tabs behalten ihren gespeicherten Modus.
- Betroffen sind nur Markdown-Notizen.
- Das Plugin stellt keine Netzwerkanfragen und sammelt keine Daten.

## Installation

**Aus dem Community-Verzeichnis:** Öffne Einstellungen → Community-Plugins → Durchsuchen, suche nach „Open Mode Control“, installiere und aktiviere es.

**Manuell:** Lege `main.js` und `manifest.json` der neuesten Version in `<vault>/.obsidian/plugins/open-mode-control/` ab, lade Obsidian neu und aktiviere das Plugin.

## Lizenz

[MIT](../LICENSE)
