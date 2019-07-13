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

	constructor(private basepath: string) {
		this.specialIcons = {
			[path.join(basepath, "src", "Server")]: path.join(__filename, "..", "..", "resources", "server.png"),
			[path.join(basepath, "src", "Client")]: path.join(__filename, "..", "..", "resources", "user.png"),
			[path.join(basepath, "src", "Shared")]: path.join(__filename, "..", "..", "resources", "page_code.png"),
			[path.join(basepath, "src", "Client", "Modules")]: path.join(__filename, "..", "..", "resources", "package.png"),
			[path.join(basepath, "src", "Client", "Controllers")]: path.join(__filename, "..", "..", "resources", "mouse.png"),
			[path.join(basepath, "src", "Server", "Modules")]: path.join(__filename, "..", "..", "resources", "package.png"),
			[path.join(basepath, "src", "Server", "Services")]: path.join(__filename, "..", "..", "resources", "table.png"),
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
				return Promise.all(nodePromises);
			});
		} else {
			const srcDir = path.join(this.basepath, "src");
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
				return Promise.all(nodePromises);
			});
		}
	}

	public refresh() {
		this._onDidChangeTreeData.fire();
	}

}

export class AGFExplorer {

	private viewer: vscode.TreeView<AGFNode>;

	constructor(basepath: string) {
		this.viewer = vscode.window.createTreeView("agf-explorer-view", {
			treeDataProvider: new AGFTreeDataProvider(basepath)
		});
		this.viewer.onDidChangeSelection((event: vscode.TreeViewSelectionChangeEvent<AGFNode>) => {
			const selection = event.selection[0];
			if (selection && selection.fileType == fsutil.FsFileType.File) {
				vscode.workspace.openTextDocument(selection.filepath).then((doc) => {
					vscode.window.showTextDocument(doc);
				});
			}
		});
	}

}