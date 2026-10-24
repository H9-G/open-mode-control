# Open Mode Control

[English](../README.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md)

Ouvre les notes existantes en vue de lecture et les nouvelles notes en vue d'édition. Choisissez le mode de chacune et ajoutez des exceptions pour des fichiers, dossiers ou motifs précis.

## Fonctionnalités

- Les **notes existantes** s'ouvrent par défaut en vue de lecture.
- Les **nouvelles notes** s'ouvrent par défaut en vue d'édition (Aperçu en direct).
- Chacun des deux modes peut être remplacé par la vue de lecture, l'Aperçu en direct, le Mode source ou « Ne pas modifier » (comportement propre à Obsidian).
- **Exceptions** par fichier, dossier (sous-dossiers inclus) ou motif glob comme `Daily/**/*.md`. Les règles sont évaluées de haut en bas, la première qui correspond est utilisée, et elles priment sur les deux réglages par défaut.
- Une commande, **Ajouter la note actuelle aux exceptions**, et un bouton équivalent dans les réglages.
- Les réglages et les commandes sont disponibles en anglais, japonais, chinois simplifié, chinois traditionnel, coréen, espagnol, français et allemand. La langue est choisie d'après celle d'Obsidian au premier usage et peut être modifiée dans les réglages.

## Comment une note est considérée comme « nouvelle »

Une note est nouvelle si elle a été créée pendant la session en cours et ouverte dans la *Fenêtre de nouvelle note* (10 secondes par défaut). Les notes vides (0 octet) comptent aussi comme nouvelles, sauf si vous le désactivez. Les notes arrivées par synchronisation et ouvertes plus tard sont considérées comme existantes.

## À savoir

- Le mode est appliqué à l'ouverture d'une note dans un onglet. Changer d'onglet ou basculer le mode vous-même n'est jamais écrasé.
- Les onglets restaurés au démarrage d'Obsidian conservent leur mode enregistré.
- Seules les notes Markdown sont concernées.
- Le plugin n'effectue aucune requête réseau et ne collecte aucune donnée.

## Installation

**Depuis le répertoire de la communauté :** ouvrez Réglages → Plugins communautaires → Parcourir, cherchez « Open Mode Control », puis installez-le et activez-le.

**Manuelle :** placez `main.js` et `manifest.json` de la dernière version dans `<vault>/.obsidian/plugins/open-mode-control/`, rechargez Obsidian puis activez le plugin.

## Licence

[MIT](../LICENSE)
