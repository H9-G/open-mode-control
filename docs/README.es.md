# Open Mode Control

[English](../README.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md)

Abre las notas existentes en vista de lectura y las notas nuevas en vista de edición. Elige el modo de cada una y añade excepciones para archivos, carpetas o patrones concretos.

## Características

- Las **notas existentes** se abren por defecto en vista de lectura.
- Las **notas nuevas** se abren por defecto en vista de edición (Vista previa en vivo).
- Ambos modos se pueden cambiar a vista de lectura, Vista previa en vivo, Modo fuente o «No cambiar» (el comportamiento propio de Obsidian).
- **Excepciones** por archivo, carpeta (incluidas las subcarpetas) o patrón glob como `Daily/**/*.md`. Las reglas se evalúan de arriba abajo, se usa la primera que coincida y tienen prioridad sobre los dos ajustes predeterminados.
- Un comando, **Añadir la nota actual a las excepciones**, y un botón equivalente en los ajustes.
- Los ajustes y los comandos están disponibles en inglés, japonés, chino simplificado, chino tradicional, coreano, español, francés y alemán. El idioma se elige según el de Obsidian la primera vez y se puede cambiar en los ajustes.

## Cómo se decide que una nota es «nueva»

Una nota cuenta como nueva si se creó durante la sesión actual y se abre dentro de la *Ventana de nota nueva* (10 segundos por defecto). Las notas vacías (0 bytes) también cuentan como nuevas, salvo que lo desactives. Las notas que llegan por sincronización y se abren más tarde se tratan como existentes.

## Conviene saber

- El modo se aplica cuando una nota se abre en una pestaña. Cambiar de pestaña o alternar el modo tú mismo nunca se sobrescribe.
- Las pestañas que se restauran al iniciar Obsidian conservan su modo guardado.
- Solo afecta a las notas Markdown.
- El complemento no realiza solicitudes de red ni recopila datos.

## Instalación

**Desde el directorio de la comunidad:** abre Ajustes → Complementos de la comunidad → Explorar, busca «Open Mode Control», instálalo y actívalo.

**Manual:** coloca `main.js` y `manifest.json` de la última versión en `<vault>/.obsidian/plugins/open-mode-control/`, recarga Obsidian y activa el complemento.

## Licencia

[MIT](../LICENSE)
