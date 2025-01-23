import * as vscode from "vscode";
import _ from "lodash";
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

const deepMerge = (...targets: object[]): object => {
  return _.mergeWith({}, ...targets, (objValue: unknown, srcValue: unknown) => {
    if (_.isArray(objValue) && _.isArray(srcValue)) {
      return objValue.concat(srcValue);
    } else if (_.isObject(objValue) && _.isArray(srcValue)) {
      return deepMerge(objValue, srcValue);
    }
  });
};

export function activate(context: vscode.ExtensionContext) {
  vscode.window.showInformationMessage("Hello World from settings-combiner!");

  function combineFiles() {
    const config = vscode.workspace.getConfiguration("settingsCombiner");

    if (config.inputs === undefined || config.output === undefined) {
      return;
    }

    vscode.workspace.workspaceFolders?.forEach(async (workspaceFolder) => {
      try {
        let settingsValues = await getSettingsValues(
          workspaceFolder.uri.fsPath,
          config.inputs
        );
        let result = _.merge({}, ...settingsValues);
        const outputPath = path.join(
          workspaceFolder.uri.fsPath,
          ".vscode",
          config.output
        );

        await fs.writeFile(outputPath, JSON.stringify(result, null, 2), "utf8");
      } catch (e) {
        if (e instanceof Error) {
          vscode.window.showErrorMessage(e.message);
        }
      }
    });
  }

  combineFiles();
}

// This method is called when your extension is deactivated
export function deactivate() {}
