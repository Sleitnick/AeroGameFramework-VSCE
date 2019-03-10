"use strict";

import * as vscode from "vscode";
import * as path from "path";
import * as filelist from "./filelist";
import * as fsutil from "./fsutil";
import * as templates from "./templates";
import * as luacheckrc from "./luacheckrc";

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
	"agf": true
}, null, 2);

const VSCODE_PROJECT_SETTINGS = JSON.stringify({
	"files.exclude": {
		"src/_framework/": true,
		".vscode": true
	}
}, null, 2);

const getPath = (root: string, env: string, type: string, name: string): string => {
	return path.join(root, QUICK_PICK_FILEPATHS[env][type], name);
};

const transformLuaIntoInit = async (filepath: string): Promise<string> => {
	const dirpath = filepath.substring(0, filepath.lastIndexOf("."));
	const ext = filepath.match(/(\.[0-9a-z]+)?\.[0-9a-z]+$/i)![0];
	await fsutil.createDirIfNotExist(dirpath);
	await fsutil.copyFile(filepath, path.join(dirpath, "/init" + ext));
	await fsutil.deleteFile(filepath);
	return dirpath;
};

const getSuggestedEnvironment = () => {

};

const getSuggestedType = () => {

};

interface EnvTypeCustom {
	isDir: boolean;
	path: string;
}

interface EnvType {
	environment?: string;
	type: string;
	custom?: EnvTypeCustom;
}

const getEnvType = async (filepath: string): Promise<EnvType|null> => {
	const srcDir = path.join(vscode.workspace.workspaceFolders![0].uri.fsPath, "src");
	let environment = null;
	let type = null;
	if (path.join(srcDir, "Client") === filepath) {
		environment = "Client";
	} else if (path.join(srcDir, "Client", "Modules") === filepath) {
		environment = "Client";
		type = "Module";
	} else if (path.join(srcDir, "Client", "Controllers") === filepath) {
		environment = "Client";
		type = "Controller";
	} else if (path.join(srcDir, "Server") === filepath) {
		environment = "Server";
	} else if (path.join(srcDir, "Server", "Modules") === filepath) {
		environment = "Server";
		type = "Module";
	} else if (path.join(srcDir, "Server", "Services") === filepath) {
		environment = "Server";
		type = "Service";
	} else if (path.join(srcDir, "Shared") === filepath) {
		environment = "Shared";
		type = "Module";
	}
	const isWithinSource = filepath.startsWith(srcDir);
	if (isWithinSource && !environment && !type) {
		// Determine where to put the file within the directory
		const ext = path.extname(filepath);
		const isDir = (await fsutil.getFileType(filepath)) === fsutil.FsFileType.Directory;
		if (isDir) {
			return {
				type: "Module",
				custom: {
					isDir: true,
					path: filepath
				}
			};
		} else if (ext === ".lua") {
			return {
				type: "Module",
				custom: {
					isDir: false,
					path: filepath
				}
			};
		} else {
			return null;
		}
	} else {
		// Let user pick environment & type if not already implied from selected file:
		if (!environment) {
			environment = await vscode.window.showQuickPick(QUICK_PICK_ENV, {canPickMany: false});
			if (!environment) {
				return null;
			}
		}
		if (!type) {
			type = await vscode.window.showQuickPick(QUICK_PICK_TYPES[environment], {canPickMany: false});
			if (!type) {
				return null;
			}
		}
	}
	return {
		environment: environment,
		type: type
	};
};

const getSourceFileName = async (dirpath: string | null, selectionEnv: string, selectionType: string, checkIfExists: boolean): Promise<string|undefined> => {
	const valuePrefix = "Name";
	const fileName = await vscode.window.showInputBox({
		placeHolder: ("My" + selectionType),
		prompt: ("Create new " + selectionEnv + " " + selectionType),
		value: (valuePrefix + selectionType),
		valueSelection: [0, valuePrefix.length],
		validateInput: async (value: string) => {
			value = value.trim();
			if (value.match(/^\d/g)) {
				return "Name cannot begin with a number";
			} else if (value.match(/[^a-z0-9]/gi)) {
				return "Name must be alpha-numeric";
			} else if (value.toLowerCase() === "init") {
				return "Name cannot be \"init\"";
			}
			return (checkIfExists && await fsutil.doesFileExist(path.join(dirpath!, `${value}.lua`))) ? `${value} already exists` : null;
		}
	});
	if (fileName) {
		return fileName.trim();
	}
};

interface FileUri {
	$mid: number;
	fsPath: string;
	external: string;
	path: string;
	scheme: string;
}

export function activate(context: vscode.ExtensionContext) {

	let agfStatusBarItem: vscode.StatusBarItem;

	const agf = vscode.commands.registerCommand("extension.agfinit", async () => {
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

	const agfContextMenu = vscode.commands.registerCommand("extension.agfcontext", async (fileUri: FileUri) => {
		const PROJECT_ROOT = vscode.workspace.workspaceFolders![0].uri.fsPath;
		if (fileUri && path.basename(fileUri.fsPath) === "init.lua") {
			vscode.window.showWarningMessage("Cannot created nested module in init file");
			return;
		}
		const envType = await getEnvType(fileUri.fsPath);
		if (!envType) {
			return;
		}
		if (envType.custom) {
			console.log("Custom flow");
			let dirpath: string;
			let fileName: string | undefined;
			if (envType.custom.isDir) {
				console.log("> isDir");
				dirpath = envType.custom.path;
				fileName = await getSourceFileName(dirpath, "Nested", envType.type, true);
			} else {
				console.log("> transformIntoDir");
				//dirpath = await transformLuaIntoInit(fileUri.fsPath);
				fileName = await getSourceFileName(null, "Nested", envType.type, false);
			}
			if (fileName) {
				if (!envType.custom.isDir) {
					dirpath = await transformLuaIntoInit(fileUri.fsPath);
				}
				const filePath = path.join(dirpath!, `${fileName}.lua`);
				const exists = await fsutil.doesFileExist(filePath);
				if (exists) {
					vscode.window.showErrorMessage(`${fileName} already exists`);
				} else {
					await fsutil.createFileIfNotExist(filePath, templates.moduleTemplate(fileName));
					vscode.window.showInformationMessage(`Created ${fileName}`);
					const doc = await vscode.workspace.openTextDocument(filePath);
					vscode.window.showTextDocument(doc);
				}
			}
		} else {
			console.log("Standard flow");
			const dirpath = path.join(PROJECT_ROOT, QUICK_PICK_FILEPATHS[envType.environment!][envType.type]);
			const fileName = await getSourceFileName(dirpath, envType.environment!, envType.type, true);
			if (fileName) {
				const filePath = path.join(dirpath, `${fileName}.lua`);
				const exists = await fsutil.doesFileExist(filePath);
				if (exists) {
					vscode.window.showErrorMessage(`${fileName} already exists`);
				} else {
					await fsutil.createFile(filePath, templates.getTemplate(envType.environment!, envType.type, fileName));
					vscode.window.showInformationMessage(`Created ${fileName}`);
					const doc = await vscode.workspace.openTextDocument(filePath);
					vscode.window.showTextDocument(doc);
				}
			}
		}
		/*
		const selectedFileType = (fileUri ? await fsutil.getFileType(fileUri.fsPath) : fsutil.FsFileType.None);
		const selectedFileName = (fileUri ? fileUri.path.match(/\/[^\/]+$/)![0] : null);
		const selectedFileExt = (selectedFileName && selectedFileName.includes(".") ? selectedFileName.match(/\.[0-9a-z]+$/i)![0] : null);
		const selectedLuaFile = (selectedFileExt && selectedFileExt === ".lua");
		const selectionEnv = (selectedLuaFile ? "Nested" : await vscode.window.showQuickPick(QUICK_PICK_ENV, {canPickMany: false}));
		const selectionType = (selectedLuaFile ? "Module" : selectionEnv && await vscode.window.showQuickPick(QUICK_PICK_TYPES[selectionEnv], {canPickMany: false}));
		const valuePrefix = "Name";
		const fileName = selectionType && selectionEnv && await vscode.window.showInputBox({
			placeHolder: ("My" + selectionType),
			prompt: ("Create new " + selectionEnv + " " + selectionType),
			value: (valuePrefix + selectionType),
			valueSelection: [0, valuePrefix.length],
			ignoreFocusOut: true,
			validateInput: async (value: string) => {
				if (value.match(/^\d/g)) {
					return "Name cannot begin with a number";
				} else if (value.match(/[^a-z0-9]/gi)) {
					return "Name must be alpha-numeric";
				}
				return (!selectedLuaFile && await fsutil.doesFileExist(getPath(PROJECT_ROOT, selectionEnv, selectionType, `${value}.lua`))) ? `${value} already exists` : null;
			}
		});
		if (fileName && selectionEnv && selectionType) {
			let filePath: string;
			if (selectedLuaFile) {
				const dir = await transformLuaIntoInit(fileUri.fsPath);
				filePath = path.join(dir, `${fileName}.lua`);
			} else {
				filePath = getPath(PROJECT_ROOT, selectionEnv, selectionType, `${fileName}.lua`);
			}
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
		*/
	});

	agfStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	agfStatusBarItem.command = "extension.agfcontext";
	agfStatusBarItem.text = "$(code) AGF";
	context.subscriptions.push(agf, agfContextMenu, agfStatusBarItem);
	agfStatusBarItem.show();
	
}

export function deactivate() {

}
