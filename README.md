# Settings Combiner

This addon helps teams keep their shared settings and user settings in check.
Since VSCode doesn't support multiple settings files, this addon allows you to have multiple settings files (usually one checked in by your team and then some personal overrides) and then combine them into the `.vscode/settings.json` file that is used by the system.

## Features

By default this extension looks for a `.vscode/user.settings.json` and a `.vscode/team.settings.json` file in your workspace.
These files will be combined into the `.vscode/settings.json` file with any settings from `.vscode/team.settings.json`.

The combination check will run when you open your editor/workspace and in case any of the `*.settings.json` files are changed.

## Extension Settings

- `myExtension.runAtStart` [default: true]: Run the combination check when the editor is opened.
- `myExtension.watchForChanges` [default: true]: Run the combination check when any of the specified files are changed.
- `settingsCombiner.inputs` [default: `["user.settings.json", "team.settings.json"]`]: The files to combine into the desired output file.
- `settingsCombiner.output` [default: `"settings.json"`]: The file to output the combined settings to.
- `settingsCombiner.warnDiff` [default: true]: When set to true you will be warned if the combined settings file is different from the current settings file and have an option to backup the current settings.

> [!NOTE]
> The `settingsCombiner.inputs` and `settingsCombiner.output` settings are relative to the `.vscode` folder in your workspace.

## Release Notes

Users appreciate release notes as you update your extension.

### Known bugs

If you have autoformat on save, the alert to save changes may trigger twice.

### 1.0.0

Initial release with support for combining settings files, running at start, and watching for changes.
