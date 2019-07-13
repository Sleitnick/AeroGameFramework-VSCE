import * as vscode from "vscode";
import * as path from "path";
import * as fsutil from "./fsutil";
import { promises } from "dns";

export class AGFNode extends vscode.TreeItem {

	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly path: string,
		public readonly fileType: fsutil.FsFileType
	) {
		super(label, collapsibleState);
		console.log(label, collapsibleState, fileType);
	}

	get tooltip(): string {
		return this.label;
	}

	iconPath = "resources/logo.svg";
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
		if (node) {
			// TODO: Load sub-files:
			console.log("No sub node of " + node.path);
			return Promise.resolve([]);
		} else {
			const srcDir = path.join(this.basepath, "src");
			console.log("Loading from " + srcDir);
			const collapsedState = vscode.TreeItemCollapsibleState.Collapsed;
			const noneState = vscode.TreeItemCollapsibleState.None;
			return fsutil.readDir(srcDir).then((filepaths) => {
				const nodePromises: Promise<AGFNode>[] = [];
				for (const filepath of filepaths) {
					const fullPath = path.join(srcDir, filepath);
					const name = path.basename(filepath);
					if (name === "_framework") continue;
					nodePromises.push(
						fsutil.getFileType(fullPath).then((fileType) =>
							new AGFNode(name, fileType == fsutil.FsFileType.Directory ? collapsedState : noneState, filepath, fileType))
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
		console.log("Creating tree view");
		this.viewer = vscode.window.createTreeView("agf-explorer-view", {
			treeDataProvider: new AGFTreeDataProvider(basepath)
		});
	}

}