import * as vscode from "vscode";
import { merge, debounce } from "lodash";
import { jsonc } from "jsonc";
const fs = require("fs/promises");

const path = require("path");

export function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration("settingsCombiner");
  vscode.commands.registerCommand(
    "settings-combiner.combineFiles",
    combineFiles
  );

  let output = vscode.window.createOutputChannel("Settings Combiner", {
    log: true,
  });

  async function getSettingsValues(
    rootPath: string,
    inputs: string[]
  ): Promise<object[]> {
    return (
      await Promise.all(
        inputs.map(async (input) => {
          const settingsPath = path.join(rootPath, ".vscode", input);

          try {
            output.info(`File found: ${settingsPath}`);
            await fs.access(settingsPath);
          } catch {
            output.warn(`File not found: ${settingsPath}`);
            return null;
          }

          const str = await fs.readFile(settingsPath, "utf8");
          output.info(`Raw file for "${settingsPath}"`);
          output.info(str);

          return jsonc.parse(str);
        })
      )
    ).filter((a) => a);
  }

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
        existingSettings = jsonc.parse(outputStr);

        output.info(`Found existing settings.json at ${outputPath}`);
        output.info(existingSettings);
      } catch (e) {
        vscode.window.showErrorMessage(
          "An error occurred while reading your existing settings.json or the file does not exist"
        );
        output.error(e as Error);
      }

      try {
        let settingsValues = await getSettingsValues(
          workspaceFolder.uri.fsPath,
          config.inputs
        );

        if (settingsValues.length === 0) {
          return;
        }

        let result = merge({}, ...settingsValues);

        output.info(`Successfully merged values:`);
        output.info(result);

        if (jsonc.stringify(result) !== jsonc.stringify(existingSettings)) {
          let userResponse = config.warnDiff
            ? await vscode.window.showInformationMessage(
                "Your settings differ from the result of settings-combiner. Do you want to update the existing project settings?" +
                  "\n" +
                  "If this is the first time you are seeing this message, you likely want to backup your settings as user.settings.json",
                { modal: true },
                "Yes",
                "Backup existing settings",
                "No"
              )
            : "Yes";

          if (userResponse === "Backup existing settings") {
            const backupPath = await vscode.window.showInputBox({
              prompt: "Enter the backup file path for your setting backup",
              value: ".vscode/backup.settings.json",
            });

            if (backupPath) {
              await fs.writeFile(
                path.join(workspaceFolder.uri.fsPath, backupPath),
                jsonc.stringify(existingSettings, { space: 2 }),
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

          await fs.writeFile(outputPath, getResultStringValue(result), "utf8");
          vscode.window.showInformationMessage(
            "Project settings have been merged and updated. You may need to reload the window to see the changes."
          );
        }
      } catch (e) {
        output.error("An error occurred while combining settings");
        output.error(e as Error);

        if (e instanceof Error) {
          vscode.window.showErrorMessage(e.message);
        } else {
          vscode.window.showErrorMessage(
            "An unknown error occurred while combining settings"
          );
        }
      }

      return;
    });
  }

  function getResultStringValue(result: any): string {
    let output = jsonc.stringify(result, { space: 2 });

    if (config.addComment) {
      output = `// This file is generated by settings-combiner. Do not edit this file directly.\n\n${output}`;
    }

    return output;
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
    watcher.onDidChange(debounce(checkForChanges, 200));
    watcher.onDidCreate(debounce(checkForChanges, 200));
    watcher.onDidDelete(debounce(checkForChanges, 200));

    context.subscriptions.push(watcher);
  }

  if (config.runAtStart) {
    combineFiles();
  }
}

// This method is called when your extension is deactivated
export function deactivate() {}
