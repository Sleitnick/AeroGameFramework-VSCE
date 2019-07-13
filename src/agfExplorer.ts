import * as vscode from "vscode";
import * as path from "path";
import * as fsutil from "./fsutil";

export class AGFNode extends vscode.TreeItem {

	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly filepath: string,
		public readonly fileType: fsutil.FsFileType,
		public readonly initFile?: string,
		iconOverride?: string
	) {
		super(label, collapsibleState);
		this.iconPath = iconOverride || path.join(__filename, "..", "..", "resources", (fileType == fsutil.FsFileType.Directory && !initFile ? "folder.png" : "script.png"));
	}

	get tooltip(): string {
		return this.label;
	}

	contextValue = "node";

}

export class AGFTreeDataProvider implements vscode.TreeDataProvider<AGFNode> {

	private _onDidChangeTreeData: vscode.EventEmitter<AGFNode | undefined> = new vscode.EventEmitter<AGFNode | undefined>();
	public readonly onDidChangeTreeData: vscode.Event<AGFNode | undefined> = this._onDidChangeTreeData.event;

	private specialIcons: {[key: string]: string};
	private sorting: {[key: string]: number};

	constructor(private basepath: string) {
		const resourcePath = path.join(__filename, "..", "..", "resources");
		this.specialIcons = {
			[path.join(basepath, "src", "Server")]: path.join(resourcePath, "server.png"),
			[path.join(basepath, "src", "Client")]: path.join(resourcePath, "user.png"),
			[path.join(basepath, "src", "Shared")]: path.join(resourcePath, "page_code.png"),
			[path.join(basepath, "src", "Client", "Modules")]: path.join(resourcePath, "package.png"),
			[path.join(basepath, "src", "Client", "Controllers")]: path.join(resourcePath, "mouse.png"),
			[path.join(basepath, "src", "Server", "Modules")]: path.join(resourcePath, "package.png"),
			[path.join(basepath, "src", "Server", "Services")]: path.join(resourcePath, "table.png"),
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

	private getInitFile(filepath: string): Promise<string | undefined> {
		const initFiles = ["init.lua", "init.server.lua", "init.client.lua"];
		const promises = [];
		for (const initFile of initFiles) {
			const fullPath = path.join(filepath, initFile);
			promises.push(fsutil.doesFileExist(fullPath).then((exists) => exists ? fullPath : null));
		}
		return Promise.all(promises).then((results) => {
			const initFilepath = results.filter((result) => result !== null)[0] || undefined;
			return initFilepath;
		});
	}
	
	public getTreeItem(node: AGFNode): vscode.TreeItem | Thenable<vscode.TreeItem> {
		return node;
	}

	public getChildren(node?: AGFNode | undefined): Thenable<AGFNode[]> {
		const collapsedState = vscode.TreeItemCollapsibleState.Collapsed;
		const noneState = vscode.TreeItemCollapsibleState.None;
		const srcDir = path.join(this.basepath, "src");
		if (node) {
			return fsutil.readDir(node.filepath).then(async (filepaths) => {
				const nodePromises: Promise<AGFNode>[] = [];
				for (const filepath of filepaths) {
					let name = path.basename(filepath);
					if (name.startsWith("init.") && name.endsWith(".lua")) continue;
					const fullPath = path.join(node.filepath, filepath);
					const initFile = await this.getInitFile(fullPath);
					if (initFile) {
						name += ".lua";
					}
					const icon = this.specialIcons[fullPath];
					nodePromises.push(
						fsutil.getFileType(fullPath).then((fileType) =>
							new AGFNode(name, fileType == fsutil.FsFileType.Directory ? collapsedState : noneState, fullPath, fileType, initFile, icon))
					);
				}
				const result = Promise.all(nodePromises);
				if (typeof this.sorting[node.filepath] !== "undefined") {
					result.then((results) => results.sort((a, b) => (this.sorting[a.filepath] - this.sorting[b.filepath])));
				}
				return result;
			});
		} else {
			return fsutil.readDir(srcDir).then((filepaths) => {
				const nodePromises: Promise<AGFNode>[] = [];
				for (const filepath of filepaths) {
					const fullPath = path.join(srcDir, filepath);
					const name = path.basename(filepath);
					if (name === "_framework") continue;
					const icon = this.specialIcons[fullPath];
					nodePromises.push(
						fsutil.getFileType(fullPath).then((fileType) =>
							new AGFNode(name, fileType == fsutil.FsFileType.Directory ? collapsedState : noneState, fullPath, fileType, undefined, icon))
					);
				}
				return Promise.all(nodePromises).then((results) => results.sort((a, b) => (this.sorting[a.label] - this.sorting[b.label])));
			});
		}
	}

	public refresh() {
		this._onDidChangeTreeData.fire();
	}

}

export class AGFExplorer {

	private viewer: vscode.TreeView<AGFNode>;
	private dataProvider: AGFTreeDataProvider;

	constructor(basepath: string) {
		this.dataProvider = new AGFTreeDataProvider(basepath);
		this.viewer = vscode.window.createTreeView("agfexplorerview", {treeDataProvider: this.dataProvider});
		this.viewer.onDidChangeSelection((event: vscode.TreeViewSelectionChangeEvent<AGFNode>) => {
			const selection = event.selection[0];
			if (selection && (selection.fileType == fsutil.FsFileType.File || selection.initFile)) {
				vscode.workspace.openTextDocument(selection.initFile || selection.filepath).then((doc) => {
					vscode.window.showTextDocument(doc, {preserveFocus: true});
				});
			}
			//vscode.commands.executeCommand("setContext", "agfHasFileSelection", selection && selection.label.endsWith(".lua") ? true : false);
		});
	}

	public refresh() {
		this.dataProvider.refresh();
	}

}