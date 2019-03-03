"use strict";

import * as vscode from "vscode";
import * as path from "path";
import * as filelist from "./filelist";
import * as fsutil from "./fsutil";
import * as templates from "./templates";
import * as luacheckrc from "./luacheckrc";

const VERSION = process.env.npm_package_version;

const QUICK_PICK_ENV: string[] = ["Server", "Client", "Shared"];
const QUICK_PICK_TYPES: {[env: string]: string[]} = {
	"Server": ["Service", "Module"],
	"Client": ["Controller", "Module"],
	"Shared": ["Module"]
};
const QUICK_PICK_FILEPATHS: {[env: string]: {[type: string]: string}} = {
	"Server": {
		"Service": "/src/Server/Services/",
		"Module": "/src/Server/Modules/"
	},
	"Client": {
		"Controller": "/src/Client/Controllers/",
		"Module": "/src/Client/Modules/"
	},
	"Shared": {
		"Module": "/src/Shared/"
	}
};

const AGF_DIR_STRUCTURE = {
	"src": {
		"Server": {
			"Services": "src/ServerStorage/Aero/Services/",
			"Modules": "src/ServerStorage/Aero/Modules/",
		},
		"Client": {
			"Controllers": "src/StarterPlayer/StarterPlayerScripts/Aero/Controllers/",
			"Modules": "src/StarterPlayer/StarterPlayerScripts/Aero/Modules/"
		},
		"Shared": "src/ReplicatedStorage/Aero/Shared/",
		"_framework": {
			"rep_first": "src/ReplicatedFirst/Aero/",
			"rep_internal": "src/ReplicatedStorage/Aero/Internal/",
			"server_internal": "src/ServerScriptService/Aero/Internal/",
			"client_internal": "src/StarterPlayer/StarterPlayerScripts/Aero/Internal/"
		}
	}
};

const ROJO_FILE = JSON.stringify({
	"name": "aerogameframework",
	"servePort": 8000,
	"partitions": {
		"ClientControllers": {
			"path": "src/Client/Controllers",
			"target": "StarterPlayer.StarterPlayerScripts.Aero.Controllers"
		},
		"ClientModules": {
			"path": "src/Client/Modules",
			"target": "StarterPlayer.StarterPlayerScripts.Aero.Modules"
		},
		"ServerModules": {
			"path": "src/Server/Modules",
			"target": "ServerStorage.Aero.Modules"
		},
		"ServerServices": {
			"path": "src/Server/Services",
			"target": "ServerStorage.Aero.Services"
		},
		"Shared": {
			"path": "src/Shared",
			"target": "ReplicatedStorage.Aero.Shared"
		},
		"_ReplicatedFirst": {
			"path": "src/_framework/rep_first",
			"target": "ReplicatedFirst.Aero"
		},
		"_ReplicatedStorageInternal": {
			"path": "src/_framework/rep_internal",
			"target": "ReplicatedStorage.Aero.Internal"
		},
		"_ServerScriptService": {
			"path": "src/_framework/server_internal",
			"target": "ServerScriptService.Aero.Internal"
		},
		"_AeroClient": {
			"path": "src/_framework/client_internal",
			"target": "StarterPlayer.StarterPlayerScripts.Aero.Internal"
		}
	}
}, null, 2);

const AGF_FILE = JSON.stringify({
	"agf": true,
	"version": VERSION
}, null, 2);

const VSCODE_PROJECT_SETTINGS = JSON.stringify({
	"files.exclude": {
		"src/_framework/": true,
		".vscode": true
	}
}, null, 2);

const getPath = (root: string, env: string, type: string, name: string) => {
	return path.join(root, QUICK_PICK_FILEPATHS[env][type], name);
};

export function activate(context: vscode.ExtensionContext) {

	let agfStatusBarItem: vscode.StatusBarItem;

	let agf = vscode.commands.registerCommand("extension.agfinit", async () => {
		const PROJECT_ROOT = vscode.workspace.workspaceFolders![0].uri.fsPath;
		const createInternal = async () => {
			await fsutil.createDirIfNotExist(path.join(PROJECT_ROOT, ".vscode"));
			await fsutil.createFileIfNotExist(path.join(PROJECT_ROOT, ".vscode", "settings.json"), VSCODE_PROJECT_SETTINGS);
		};
		const createDirStructure = async (parent: {[k: string]: any}, curpath: string) => {
			for (const k in parent) {
				if (parent.hasOwnProperty(k)) {
					const v = parent[k];
					const p = path.join(curpath, k);
					await fsutil.createDirIfNotExist(p);
					if (typeof v === "object") {
						createDirStructure(v, p);
					} else {
						filelist.getChildren(v, p);
					}
				}
			}
		};
		const createAgf = fsutil.createFileIfNotExist(path.join(PROJECT_ROOT, ".agf"), AGF_FILE);
		const creatingRojo = fsutil.createFileIfNotExist(path.join(PROJECT_ROOT, "rojo.json"), ROJO_FILE);
		const createLuacheckRc = fsutil.createFileIfNotExist(path.join(PROJECT_ROOT, ".luacheckrc"), luacheckrc.source());
		const creatingInternal = createInternal();
		await filelist.loadFilelist();
		const creatingDirStructure = createDirStructure(AGF_DIR_STRUCTURE, PROJECT_ROOT);
		await createAgf;
		await creatingRojo;
		await createLuacheckRc;
		await creatingInternal;
		await creatingDirStructure;
		vscode.window.showInformationMessage("AeroGameFramework initialized");
	});

	let agfContextMenu = vscode.commands.registerCommand("extension.agfcontext", async () => {
		const PROJECT_ROOT = vscode.workspace.workspaceFolders![0].uri.fsPath;
		const selectionEnv = await vscode.window.showQuickPick(QUICK_PICK_ENV, {canPickMany: false});
		const selectionType = selectionEnv && await vscode.window.showQuickPick(QUICK_PICK_TYPES[selectionEnv], {canPickMany: false});
		const fileName = selectionType && selectionEnv && await vscode.window.showInputBox({
			placeHolder: ("My" + selectionType),
			prompt: ("Create new " + selectionEnv + " " + selectionType),
			value: "Name" + selectionType,
			valueSelection: [0, 4],
			ignoreFocusOut: true,
			validateInput: async (value: string) => {
				if (value.match(/^\d/g)) {
					return "Name cannot begin with a number";
				} else if (value.match(/[^a-z0-9]/gi)) {
					return "Name must be alpha-numeric";
				}
				return (await fsutil.doesFileExist(getPath(PROJECT_ROOT, selectionEnv, selectionType, `${value}.lua`))) ? `${value} already exists` : null;
			}
		});
		if (fileName && selectionEnv && selectionType) {
			const filePath = getPath(PROJECT_ROOT, selectionEnv, selectionType,`${fileName}.lua`);
			const exists = await fsutil.doesFileExist(filePath);
			if (exists) {
				vscode.window.showErrorMessage(`${fileName} already exists`);
			} else {
				await fsutil.createFile(filePath, templates.getTemplate(selectionEnv, selectionType, fileName));
				vscode.window.showInformationMessage(`Created ${fileName}`);
				vscode.workspace.openTextDocument(filePath).then(doc => {
					vscode.window.showTextDocument(doc);
				});
			}
		}
	});

	agfStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	agfStatusBarItem.command = "extension.agfcontext";
	agfStatusBarItem.text = "$(code) AGF";
	context.subscriptions.push(agfStatusBarItem);
	context.subscriptions.push(agf);
	context.subscriptions.push(agfContextMenu);
	agfStatusBarItem.show();
	
}

export function deactivate() {

}
