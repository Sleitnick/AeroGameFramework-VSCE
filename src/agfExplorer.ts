import * as vscode from "vscode";
import * as path from "path";
import * as fsutil from "./fsutil";
import * as log from "./log";
//import * as fs from "fs";

import scriptPng from "../resources/script.png";
import scriptLocalPng from "../resources/script_local.png";
import scriptModulePng from "../resources/script_module.png";
import folderPng from "../resources/folder.png";

import "../resources/logo.svg";
import "../resources/logo_256.png";
import "../resources/script_add.png";
import "../resources/folder_add.png";
import "../resources/mouse.png";
import "../resources/package.png";
import "../resources/page_code.png";
import "../resources/table.png";
import "../resources/user.png";
import "../resources/server.png";
//import "../resources/arrow_refresh.png";

const distFolder = path.join(path.dirname(__dirname), "dist");
const resourcesFolder = path.join(distFolder, "resources");

export class AGFNode extends vscode.TreeItem {

	public constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly filepath: string,
		public readonly fileType: fsutil.FsFileType,
		public readonly scriptIcon: string,
		public readonly initFile?: string,
		iconOverride?: string
	) {
		super(label, collapsibleState);
		this.iconPath = iconOverride || (fileType == fsutil.FsFileType.Directory && !initFile ? path.join(distFolder, folderPng) : scriptIcon);
	}

	public get tooltip(): string {
		return this.label;
	}

	public contextValue = "node";

}

export class AGFTreeDataProvider implements vscode.TreeDataProvider<AGFNode> {

	private _onDidChangeTreeData: vscode.EventEmitter<AGFNode | undefined> = new vscode.EventEmitter<AGFNode | undefined>();
	public readonly onDidChangeTreeData: vscode.Event<AGFNode | undefined> = this._onDidChangeTreeData.event;

	private specialIcons: {[key: string]: string};
	private sorting: {[key: string]: number};
	private treeBasepath: string;

	public constructor(private basepath: string) {
		this.treeBasepath = basepath;
		//const resourcePath = path.join(__filename, "..", "..", "dist", "resources");
		this.specialIcons = {
			[path.join(basepath, "src", "Server")]: path.join(resourcesFolder, "server.png"),
			[path.join(basepath, "src", "Client")]: path.join(resourcesFolder, "user.png"),
			[path.join(basepath, "src", "Shared")]: path.join(resourcesFolder, "page_code.png"),
			[path.join(basepath, "src", "Client", "Modules")]: path.join(resourcesFolder, "package.png"),
			[path.join(basepath, "src", "Client", "Controllers")]: path.join(resourcesFolder, "mouse.png"),
			[path.join(basepath, "src", "Server", "Modules")]: path.join(resourcesFolder, "package.png"),
			[path.join(basepath, "src", "Server", "Services")]: path.join(resourcesFolder, "table.png"),
		};
		this.sorting = {
			[path.join(basepath, "src", "Server")]: 0,
			[path.join(basepath, "src", "Client")]: 1,
			[path.join(basepath, "src", "Shared")]: 2,
			[path.join(basepath, "src", "Server", "Services")]: 0,
			[path.join(basepath, "src", "Server", "Modules")]: 1,
			[path.join(basepath, "src", "Client", "Controllers")]: 0,
			[path.join(basepath, "src", "Client", "Modules")]: 1,
		};
	}
	
	public getTreeItem = (node: AGFNode): vscode.TreeItem | Thenable<vscode.TreeItem> => {
		return node;
	}

	private sortNodes = (nodes: AGFNode[]): AGFNode[] => {
		const folders: AGFNode[] = [];
		const files: AGFNode[] = [];
		for (const node of nodes) {
			if (node.fileType === fsutil.FsFileType.File || typeof node.initFile !== "undefined") {
				files.push(node);
			} else {
				folders.push(node);
			}
		}
		log.info(`Sorting ${files.length} files & ${folders.length} folders`);
		folders.sort((a, b) => a.label.localeCompare(b.label));
		files.sort((a, b) => a.label.localeCompare(b.label));
		return folders.concat(files);
	}

	public getChildren = (node?: AGFNode | undefined): Thenable<AGFNode[]> => {
		const collapsedState = vscode.TreeItemCollapsibleState.Collapsed;
		const noneState = vscode.TreeItemCollapsibleState.None;
		const srcDir = path.join(this.basepath, "src");
		if (node) {
			return fsutil.readDir(node.filepath).then(async (filepaths): Promise<AGFNode[]> => {
				const nodePromises: Promise<AGFNode>[] = [];
				for (const filepath of filepaths) {
					let name = path.basename(filepath);
					if (name.startsWith("init.") && name.endsWith(".lua")) continue;
					const fullPath = path.join(node.filepath, filepath);
					const isDir = ((await fsutil.getFileType(fullPath)) === fsutil.FsFileType.Directory);
					const initFile = (isDir ? await fsutil.getInitFile(fullPath) : undefined);
					if (initFile) {
						name += ".lua";
					}
					const icon = this.specialIcons[fullPath];
					const scriptIcon = await this.determineScriptIcon(fullPath);
					nodePromises.push(
						fsutil.getFileType(fullPath).then((fileType): AGFNode =>
							new AGFNode(path.parse(name).name, fileType == fsutil.FsFileType.Directory ? collapsedState : noneState, fullPath, fileType, scriptIcon, initFile, icon))
					);
				}
				const result = Promise.all(nodePromises);
				if (typeof this.sorting[node.filepath] !== "undefined") {
					// Sort top-level items:
					//return result.then((results): AGFNode[] => results.sort((a, b): number => (this.sorting[a.filepath] - this.sorting[b.filepath])));
					//return result.then((results) => this.sortNodes(results));
					return result.then((results) => {
						if (results[0] && typeof this.sorting[results[0].filepath] !== "undefined") {
							return results.sort((a, b): number => (this.sorting[a.filepath] - this.sorting[b.filepath]));
						} else {
							return this.sortNodes(results);
						}
					});
				} else {
					// Sort:
					return result.then((results) => this.sortNodes(results));
				}
				//return result;
			});
		} else {
			return fsutil.readDir(srcDir).then(async (filepaths): Promise<AGFNode[]> => {
				const nodePromises: Promise<AGFNode>[] = [];
				for (const filepath of filepaths) {
					const fullPath = path.join(srcDir, filepath);
					const name = path.basename(filepath);
					if (name === "_framework") continue;
					const icon = this.specialIcons[fullPath];
					const scriptIcon = await this.determineScriptIcon(fullPath);
					nodePromises.push(
						fsutil.getFileType(fullPath).then((fileType): AGFNode =>
							new AGFNode(path.parse(name).name, fileType == fsutil.FsFileType.Directory ? collapsedState : noneState, fullPath, fileType, scriptIcon, undefined, icon))
					);
				}
				return Promise.all(nodePromises).then((results): AGFNode[] => results.sort((a, b): number => (this.sorting[a.label] - this.sorting[b.label])));
			});
		}
	}

	private isNested = async (filepath: string): Promise<boolean> => {
		const dir = path.dirname(filepath);
		const initFile = await fsutil.getInitFile(dir);
		return initFile ? true : false;
	}

	private determineScriptIcon = async (filepath: string): Promise<string> => {
		const clientControllers = path.join(this.treeBasepath, "src", "Client", "Controllers");
		const serverServices = path.join(this.treeBasepath, "src", "Server", "Services");
		const filedir = path.parse(filepath).dir;
		if (filedir.startsWith(clientControllers)) {
			const isNested = await this.isNested(filepath);
			return path.join(distFolder, isNested ? scriptModulePng : scriptLocalPng);
		} else if (filedir.startsWith(serverServices)) {
			const isNested = await this.isNested(filepath);
			return path.join(distFolder, isNested ? scriptModulePng : scriptPng);
		} else {
			return path.join(distFolder, scriptModulePng);
		}
	}

	public refresh = (): void => {
		this._onDidChangeTreeData.fire(undefined);
	}

}

export class AGFExplorer {

	private viewer: vscode.TreeView<AGFNode>;
	private dataProvider: AGFTreeDataProvider;

	public constructor(basepath: string) {
		this.dataProvider = new AGFTreeDataProvider(basepath);
		this.viewer = vscode.window.createTreeView("agfexplorerview", {treeDataProvider: this.dataProvider});
		this.viewer.onDidChangeSelection((event: vscode.TreeViewSelectionChangeEvent<AGFNode>): void => {
			const selection = event.selection[0];
			if (selection && (selection.fileType == fsutil.FsFileType.File || selection.initFile)) {
				vscode.workspace.openTextDocument(selection.initFile || selection.filepath).then((doc): void => {
					vscode.window.showTextDocument(doc, {preserveFocus: true});
				});
			}
		});
		// try {
		// 	const results = fs.readdirSync(path.join(path.dirname(__dirname), "dist", "resources"));
		// 	log.info("DIR", results);
		// } catch(e) {
		// 	log.error(e);
		// }
	}

	public refresh = (): void => {
		this.dataProvider.refresh();
	}

}