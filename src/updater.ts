import * as path from 'path';
import * as vscode from 'vscode';

export class Updater {

	public static currentPanel: Updater | undefined;

	public static readonly viewType = "agfUpdater";

	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionPath: string;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionPath: string): void {
		const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;
		if (Updater.currentPanel) {
			Updater.currentPanel._panel.reveal(column);
			return;
		}
		const panel = vscode.window.createWebviewPanel(
			Updater.viewType,
			"AGF Updater",
			column || vscode.ViewColumn.One,
			{
				enableScripts: true,
				localResourceRoots: [vscode.Uri.file(path.join(extensionPath, "updater"))]
			}
		);
		Updater.currentPanel = new Updater(panel, extensionPath);
	}

	public static revive(panel: vscode.WebviewPanel, extensionPath: string): void {
		Updater.currentPanel = new Updater(panel, extensionPath);
	}

	private constructor(panel: vscode.WebviewPanel, extensionPath: string) {
		this._panel = panel;
		this._extensionPath = extensionPath;
		this._update();
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
		this._panel.onDidChangeViewState(() => {
			if (this._panel.visible) {
				this._update();
			}
		}, null, this._disposables);
		this._panel.webview.onDidReceiveMessage((message) => {
			// TODO: Handle message
			console.log("Received message:", message);
		}, null, this._disposables);
	}

	public dispose(): void {
		Updater.currentPanel = undefined;
		this._panel.dispose();
		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private _update() {
		const webview = this._panel.webview;
		this._panel.title = "AGF Updater";
		webview.html = this._getHtmlForWebview(webview);
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		const nonce = getNonce();
		const scripts = ["main.js"];
		const scriptUris = scripts.map((scriptName) => {
			const uri = webview.asWebviewUri(vscode.Uri.file(path.join(this._extensionPath, "updater", scriptName)));
			return `<script nonce="${nonce}" src="${uri}"></script>`;
		});
		return `<!DOCTYPE html>
			<html lang="en">
				<head>
					<meta charset="utf-8">
					<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}'; connect-src https://*.github.com;">
					<meta name="viewport" content="width=device-width, initial-scale=1.0">
				</head>
				<body>
					<h1>AGF Updater</h1>
					<p id="loading">Loading...</p>
					<div id="content" style="display: none">
						<h2>Latest release</h2>
						<h3 id="latest"></h3>
						<div id="latest-desc"></div>
						<h2>Current version</h2>
						<h3 id="current">1.6.0</h3>
						<button id="update">Update</button>
					</div>
					${scriptUris.join("")}
				</body>
			</html>`;
	}

}

function getNonce(): string {
	const text = [];
	const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for (let i = 0; i < 32; i++) {
		text.push(possible.charAt(Math.floor(Math.random() * possible.length)));
	}
	return text.join("");
}