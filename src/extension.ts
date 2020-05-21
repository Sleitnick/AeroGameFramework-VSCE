"use strict";

import * as vscode from "vscode";
import * as path from "path";
import * as filelist from "./filelist";
import * as fsutil from "./fsutil";
import * as luaTemplates from "./luaTemplates";
import * as rojoTemplates from "./rojoTemplates";
import * as log from "./log";
import luacheckrc from "./luacheckrc";
import { AGFExplorer, AGFNode } from "./agfExplorer";

interface EnvTypeCustom {
	isDir: boolean;
	path: string;
}

interface EnvType {
	environment?: string;
	type: string;
	custom?: EnvTypeCustom;
}

interface FileUri {
	$mid: number;
	fsPath: string;
	external: string;
	path: string;
	scheme: string;
}

const QUICK_PICK_ENV: string[] = ["Server", "Client", "Shared"];
const QUICK_PICK_TYPES: {[env: string]: string[]} = {
	"Server": ["Service", "Module"],
	"Client": ["Controller", "Module"],
	"Shared": ["Module"]
};
const QUICK_PICK_FILEPATHS: {[env: string]: {[type: string]: string}} = {
	"Server": {
		"Service": "/src/Server/Services/",
		"Module": "/src/Server/Modules/",
		"Class": "/src/Server/Modules/"
	},
	"Client": {
		"Controller": "/src/Client/Controllers/",
		"Module": "/src/Client/Modules/",
		"Class": "/src/Client/Modules/"
	},
	"Shared": {
		"Module": "/src/Shared/",
		"Class": "/src/Shared/"
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

const AGF_VALID_FOLDER_PARENTS = [
	"src/Server/Services",
	"src/Server/Modules",
	"src/Client/Controllers",
	"src/Client/Modules",
	"src/Shared"
];

const AGF_INIT_FILES = ["init.lua", "init.server.lua", "init.client.lua"];

const AGF_FILE = JSON.stringify({"agf": true}, null, 2);

const VSCODE_PROJECT_SETTINGS = JSON.stringify({
	"files.exclude": {
		"src/_framework/": true,
		".vscode": true
	}
}, null, 2);

const transformLuaIntoInit = async (filepath: string): Promise<string> => {
	const dirpath = filepath.substring(0, filepath.lastIndexOf("."));
	const extMatch = filepath.match(/(\.[0-9a-z]+)?\.[0-9a-z]+$/i);
	const ext = (extMatch ? extMatch[0] : "");
	await fsutil.createDirIfNotExist(dirpath);
	await fsutil.copyFile(filepath, path.join(dirpath, "/init" + ext));
	await fsutil.deleteFile(filepath);
	return dirpath;
};

const getEnvType = async (filepath: string): Promise<EnvType | null> => {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders) return Promise.reject(null);
	const srcDir = path.join(workspaceFolders[0].uri.fsPath, "src");
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
		// Determine where to put the file within the directory:
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
		if (type === "Module") {
			const moduleTypes = ["Normal Module", "Class Module"];
			const moduleType = await vscode.window.showQuickPick(moduleTypes, {canPickMany: false});
			if (moduleType === moduleTypes[1]) {
				type = "Class";
			}
		}
	}
	return {
		environment: environment,
		type: type
	};
};

const getSourceFileName = async (dirpath: string | null, selectionEnv: string, selectionType: string, checkIfExists: boolean): Promise<string | undefined> => {
	const valuePrefix = "Name";
	const dirpathNonNull = (dirpath || "");
	const fileName = await vscode.window.showInputBox({
		placeHolder: ("My" + selectionType),
		prompt: ("Create new " + selectionEnv + " " + selectionType),
		value: (valuePrefix + selectionType),
		valueSelection: [0, valuePrefix.length],
		validateInput: async (value: string): Promise<string | null> => {
			value = value.trim();
			if (value.match(/^\d/g)) {
				return "Name cannot begin with a number";
			} else if (value.match(/[^a-z0-9_]/gi)) {
				return "Name must be alpha-numeric";
			} else if (value.toLowerCase() === "init") {
				return "Name cannot be \"init\"";
			}
			return (checkIfExists && await fsutil.doesFileExist(path.join(dirpathNonNull, `${value}.lua`))) ? `${value} already exists` : null;
		}
	});
	if (fileName) {
		return fileName.trim();
	}
};

const getFolderName = async (parentPath: string): Promise<string | undefined> => {
	const valueHolder = "Folder";
	const folderName = await vscode.window.showInputBox({
		placeHolder: "FolderName",
		prompt: "Create new folder",
		value: valueHolder,
		valueSelection: [0, valueHolder.length],
		validateInput: async (value: string): Promise<string | null> => {
			value = value.trim();
			if (value.match(/^\d/g)) {
				return "Name cannot begin with a number";
			} else if (value.match(/[^a-z0-9]/gi)) {
				return "Name must be alpha-numeric";
			}
			return (await fsutil.doesFileExist(path.join(parentPath, value))) ? `${value} already exists` : null;
		}
	});
	if (folderName) {
		return folderName.trim();
	}
};

const isValidFolderParent = (rootDir: string, dirpath: string): boolean => {
	log.info("FOLDER", rootDir, dirpath);
	for (const relParentPath of AGF_VALID_FOLDER_PARENTS) {
		const parentPath = path.join(rootDir, relParentPath);
		if (dirpath.startsWith(parentPath)) {
			log.info("FOLDER YES");
			return true;
		}
	}
	log.info("FOLDER NO");
	return false;
};

const hasInitFile = (filepath: string): Promise<boolean> => {
	const promises = AGF_INIT_FILES.map((initFile): Promise<boolean> => fsutil.doesFileExist(path.join(filepath, initFile)));
	return Promise.all(promises).then((results): boolean => {
		for (const result of results) {
			if (result) return true;
		}
		return false;
	});
}

export function activate(context: vscode.ExtensionContext): void {
	
	vscode.commands.executeCommand("setContext", "isAgfProject", true);

	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders) return;
	const agfExplorer = new AGFExplorer(workspaceFolders[0].uri.fsPath);

	const agf = vscode.commands.registerCommand("extension.agfinit", async (): Promise<void> => {
		const PROJECT_ROOT = workspaceFolders[0].uri.fsPath;
		const createInternal = async (): Promise<void> => {
			await fsutil.createDirIfNotExist(path.join(PROJECT_ROOT, ".vscode"));
			await fsutil.createFileIfNotExist(path.join(PROJECT_ROOT, ".vscode", "settings.json"), VSCODE_PROJECT_SETTINGS);
		};
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const createDirStructure = async (parent: {[k: string]: any}, curpath: string): Promise<void> => {
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
		const creatingRojo4 = fsutil.createFileIfNotExist(path.join(PROJECT_ROOT, "rojo.json"), rojoTemplates.Rojo4);
		const creatingRojo5 = fsutil.createFileIfNotExist(path.join(PROJECT_ROOT, "default.project.json"), rojoTemplates.Rojo5);
		const createLuacheckRc = fsutil.createFileIfNotExist(path.join(PROJECT_ROOT, ".luacheckrc"), luacheckrc);
		const creatingInternal = createInternal();
		await filelist.loadFilelist();
		const creatingDirStructure = createDirStructure(AGF_DIR_STRUCTURE, PROJECT_ROOT);
		await createAgf;
		await creatingRojo4;
		await creatingRojo5;
		await createLuacheckRc;
		await creatingInternal;
		await creatingDirStructure;
		vscode.window.showInformationMessage("AeroGameFramework initialized");
	});

	const agfCreateMenu = vscode.commands.registerCommand("extension.agfcreate", async (node: AGFNode): Promise<void> => {
		const PROJECT_ROOT = workspaceFolders[0].uri.fsPath;
		if (node && path.basename(node.filepath) === "init.lua") {
			vscode.window.showWarningMessage("Cannot created nested module in init file");
			return;
		}
		const envType = await getEnvType(node ? node.filepath : PROJECT_ROOT);
		if (!envType) {
			return;
		}
		if (envType.custom) {
			let dirpath = "";
			let fileName: string | undefined;
			if (envType.custom.isDir) {
				dirpath = envType.custom.path;
				fileName = await getSourceFileName(dirpath, "Nested", envType.type, true);
			} else {
				fileName = await getSourceFileName(null, "Nested", envType.type, false);
			}
			if (fileName) {
				if (!envType.custom.isDir) {
					dirpath = await transformLuaIntoInit(node.filepath);
				}
				if (!dirpath) {
					return Promise.reject("No dirpath");
				}
				const filePath = path.join(dirpath, `${fileName}.lua`);
				const exists = await fsutil.doesFileExist(filePath);
				if (exists) {
					vscode.window.showErrorMessage(`${fileName} already exists`);
				} else {
					await fsutil.createFileIfNotExist(filePath, luaTemplates.moduleTemplate(fileName));
					vscode.window.showInformationMessage(`Created ${fileName}`);
					const doc = await vscode.workspace.openTextDocument(filePath);
					vscode.window.showTextDocument(doc, {preserveFocus: true});
					agfExplorer.refresh();
				}
			}
		} else {
			const env = envType.environment || "";
			const dirpath = path.join(PROJECT_ROOT, QUICK_PICK_FILEPATHS[env][envType.type]);
			const fileName = await getSourceFileName(dirpath, env, envType.type, true);
			if (fileName) {
				const filePath = path.join(dirpath, `${fileName}.lua`);
				const exists = await fsutil.doesFileExist(filePath);
				if (exists) {
					vscode.window.showErrorMessage(`${fileName} already exists`);
				} else {
					await fsutil.createFile(filePath, luaTemplates.getTemplate(env, envType.type, fileName));
					vscode.window.showInformationMessage(`Created ${fileName}`);
					const doc = await vscode.workspace.openTextDocument(filePath);
					vscode.window.showTextDocument(doc, {preserveFocus: true});
					agfExplorer.refresh();
				}
			}
		}
	});
	
	const agfCreateFolderMenu = vscode.commands.registerCommand("extension.agfcreatefolder", async (node: AGFNode): Promise<void> => {
		if ((!node) || (!(await fsutil.isDir(node.filepath))) || await hasInitFile(node.filepath)) return;
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders) return Promise.reject(null);
		const rootDir = workspaceFolders[0].uri.fsPath;
		if (!isValidFolderParent(rootDir, node.filepath)) return;
		const folderName = await getFolderName(node.filepath);
		if (folderName) {
			const dirPath = path.join(node.filepath, folderName);
			const exists = await fsutil.doesFileExist(dirPath);
			if (exists) {
				vscode.window.showErrorMessage(`${folderName} already exists`);
			} else {
				const created = await fsutil.createDirIfNotExist(dirPath);
				if (created) {
					vscode.window.showInformationMessage(`Created ${folderName}`);
					agfExplorer.refresh();
				}
			}
		}
	});

	const agfDeleteMenu = vscode.commands.registerCommand("extension.agfdelete", async (node: AGFNode): Promise<void> => {
		if (!node) return;
		let deleteFunc: (filepath: string) => Promise<void>;
		const name = path.parse(node.filepath).name;
		if (node.fileType === fsutil.FsFileType.Directory) {
			deleteFunc = fsutil.deleteDir;
		} else {
			deleteFunc = fsutil.deleteFile;
		}
		deleteFunc(node.filepath).then((): void => {
			agfExplorer.refresh();
			vscode.window.showInformationMessage(`Deleted ${name}`);
		}).catch((err) => {
			vscode.window.showErrorMessage(err);
		});
	});

	const agfRefresh = vscode.commands.registerCommand("extension.agfrefresh", async (): Promise<void> => {
		agfExplorer.refresh();
	});

	const agfStatusBarItem: vscode.StatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	agfStatusBarItem.command = "extension.agfcreate";
	agfStatusBarItem.text = "$(code) AGF";
	context.subscriptions.push(agf, agfCreateMenu, agfCreateFolderMenu, agfDeleteMenu, agfStatusBarItem, agfRefresh);
	agfStatusBarItem.show();
	
}

export function deactivate(): void {

}
