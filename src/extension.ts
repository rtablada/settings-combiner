import * as vscode from "vscode";
import { mergeWith, isArray, isObject, merge } from "lodash";
const fs = require("fs/promises");

const path = require("path");

async function getSettingsValues(
  rootPath: string,
  inputs: string[]
): Promise<object[]> {
  return (
    await Promise.all(
      inputs.map(async (input) => {
        const settingsPath = path.join(rootPath, ".vscode", input);

        try {
          await fs.access(settingsPath);
        } catch {
          return null;
        }

        const str = await fs.readFile(settingsPath, "utf8");

        return JSON.parse(str);
      })
    )
  ).filter((a) => a);
}

export function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration("settingsCombiner");

  function combineFiles() {
    if (config.inputs === undefined || config.output === undefined) {
      return;
    }

    vscode.workspace.workspaceFolders?.forEach(async (workspaceFolder) => {
      const outputPath = path.join(
        workspaceFolder.uri.fsPath,
        ".vscode",
        config.output
      );
      let existingSettings = null;

      try {
        await fs.access(outputPath);
        const outputStr = await fs.readFile(outputPath, "utf8");
        existingSettings = JSON.parse(outputStr);
      } catch {}

      try {
        let settingsValues = await getSettingsValues(
          workspaceFolder.uri.fsPath,
          config.inputs
        );
        let result = merge({}, ...settingsValues);

        if (JSON.stringify(result) !== JSON.stringify(existingSettings)) {
          let userResponse = config.warnDiff ? await vscode.window.showInformationMessage(
            "Your settings differ from the result of settings-combiner. Do you want to update the existing project settings?" +
              "\n" +
              "If this is the first time you are seeing this message, you likely want to backup your settings as user.settings.json.",
            { modal: true },
            "Yes",
            "Backup existing settings",
            "No"
          ) : 'Yes';

          if (userResponse === "Backup existing settings") {
            const backupPath = await vscode.window.showInputBox({
              prompt: "Enter the backup file path for your setting backup",
              value: ".vscode/backup.settings.json",
            });

            if (backupPath) {
              await fs.writeFile(
                path.join(workspaceFolder.uri.fsPath, backupPath),
                JSON.stringify(existingSettings, null, 2),
                "utf8"
              );
              vscode.window.showInformationMessage(
                `Backup created at ${backupPath}`
              );

              userResponse = "Yes";
            }
          }

          if (userResponse !== "Yes") {
            return;
          }

          await fs.writeFile(
            outputPath,
            JSON.stringify(result, null, 2),
            "utf8"
          );
          vscode.window.showInformationMessage(
            "Project settings have been merged and updated. You may need to reload the window to see the changes."
          );
        }
      } catch (e) {
        if (e instanceof Error) {
          vscode.window.showErrorMessage(e.message);
        }
      }

      return;
    });
  }

  function checkForChanges(uri: vscode.Uri) {
    const paths: string[] = config.inputs.map((input: string) =>
      path.join(".vscode", input)
    );

    if (paths.some((p) => uri.fsPath.endsWith(p))) {
      combineFiles();
    }
  }

  if (config.watchForChanges) {
    const watcher = vscode.workspace.createFileSystemWatcher(
      "**/.vscode/**/*.json"
    );
    watcher.onDidChange(checkForChanges);
    watcher.onDidCreate(checkForChanges);
    watcher.onDidDelete(checkForChanges);

    context.subscriptions.push(watcher);
  }

  if (config.runAtStart) {
    combineFiles();
  }
}

// This method is called when your extension is deactivated
export function deactivate() {}
