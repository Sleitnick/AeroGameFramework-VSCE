import * as vscode from "vscode";
import * as path from "path";
import * as fsutil from "./fsutil";

export class AGFNode extends vscode.TreeItem {

	public constructor(
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

	public constructor(private basepath: string) {
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
			promises.push(fsutil.doesFileExist(fullPath).then((exists): string | null => exists ? fullPath : null));
		}
		return Promise.all(promises).then((results): string | undefined => {
			const initFilepath = results.filter((result): boolean => result !== null)[0] || undefined;
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
			return fsutil.readDir(node.filepath).then(async (filepaths): Promise<AGFNode[]> => {
				const nodePromises: Promise<AGFNode>[] = [];
				for (const filepath of filepaths) {
					let name = path.basename(filepath);
					if (name.startsWith("init.") && name.endsWith(".lua")) continue;
					const fullPath = path.join(node.filepath, filepath);
					const isDir = ((await fsutil.getFileType(fullPath)) === fsutil.FsFileType.Directory);
					const initFile = (isDir ? await this.getInitFile(fullPath) : undefined);
					if (initFile) {
						name += ".lua";
					}
					const icon = this.specialIcons[fullPath];
					nodePromises.push(
						fsutil.getFileType(fullPath).then((fileType): AGFNode =>
							new AGFNode(name, fileType == fsutil.FsFileType.Directory ? collapsedState : noneState, fullPath, fileType, initFile, icon))
					);
				}
				const result = Promise.all(nodePromises);
				if (typeof this.sorting[node.filepath] !== "undefined") {
					result.then((results): AGFNode[] => results.sort((a, b): number => (this.sorting[a.filepath] - this.sorting[b.filepath])));
				}
				return result;
			});
		} else {
			return fsutil.readDir(srcDir).then((filepaths): Promise<AGFNode[]> => {
				const nodePromises: Promise<AGFNode>[] = [];
				for (const filepath of filepaths) {
					const fullPath = path.join(srcDir, filepath);
					const name = path.basename(filepath);
					if (name === "_framework") continue;
					const icon = this.specialIcons[fullPath];
					nodePromises.push(
						fsutil.getFileType(fullPath).then((fileType): AGFNode =>
							new AGFNode(name, fileType == fsutil.FsFileType.Directory ? collapsedState : noneState, fullPath, fileType, undefined, icon))
					);
				}
				return Promise.all(nodePromises).then((results): AGFNode[] => results.sort((a, b): number => (this.sorting[a.label] - this.sorting[b.label])));
			});
		}
	}

	public refresh(): void {
		this._onDidChangeTreeData.fire();
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
	}

	public refresh(): void {
		this.dataProvider.refresh();
	}

}