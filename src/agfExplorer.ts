import * as vscode from "vscode";
import * as path from "path";
import * as fsutil from "./fsutil";

export class AGFNode extends vscode.TreeItem {

	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly filepath: string,
		public readonly fileType: fsutil.FsFileType
	) {
		super(label, collapsibleState);
	}

	get tooltip(): string {
		return this.label;
	}

	iconPath = path.join(__filename, "..", "..", "resources", "logo.svg");
	contextValue = "node";

}

export class AGFTreeDataProvider implements vscode.TreeDataProvider<AGFNode> {

	private _onDidChangeTreeData: vscode.EventEmitter<AGFNode | undefined> = new vscode.EventEmitter<AGFNode | undefined>();
	public readonly onDidChangeTreeData: vscode.Event<AGFNode | undefined> = this._onDidChangeTreeData.event;

	constructor(private basepath: string) {

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
					const name = path.basename(filepath);
					if (name.startsWith("init.") && name.endsWith(".lua")) continue;
					const fullPath = path.join(node.filepath, filepath);
					const containsInit = await fsutil.doesAnyFileExist([
						path.join(fullPath, "init.lua"),
						path.join(fullPath, "init.server.lua"),
						path.join(fullPath, "init.client.lua"),
					]);

					// TODO: Use 'containsInit' to properly display the directory name

					nodePromises.push(
						fsutil.getFileType(fullPath).then((fileType) =>
							new AGFNode(name, fileType == fsutil.FsFileType.Directory ? collapsedState : noneState, fullPath, fileType))
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
					nodePromises.push(
						fsutil.getFileType(fullPath).then((fileType) =>
							new AGFNode(name, fileType == fsutil.FsFileType.Directory ? collapsedState : noneState, fullPath, fileType))
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
	}

}