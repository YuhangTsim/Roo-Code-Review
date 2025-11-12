/**
 * WebviewPanel provider for Script-Review component
 */

import * as vscode from "vscode"
import { ScriptReviewManager } from "./ScriptReviewManager"
import type { ScriptReviewMessage, ScriptReviewResponse } from "./types"

export class ScriptReviewProvider {
	public static readonly viewType = "roo-cline.scriptReview"
	private static currentPanel: ScriptReviewProvider | undefined

	private readonly panel: vscode.WebviewPanel
	private readonly extensionUri: vscode.Uri
	private readonly outputChannel: vscode.OutputChannel
	private readonly manager: ScriptReviewManager
	private disposables: vscode.Disposable[] = []

	/**
	 * Create or show the Script Review panel
	 */
	public static createOrShow(extensionUri: vscode.Uri, outputChannel: vscode.OutputChannel): void {
		const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined

		// If we already have a panel, show it
		if (ScriptReviewProvider.currentPanel) {
			ScriptReviewProvider.currentPanel.panel.reveal(column)
			return
		}

		// Otherwise, create a new panel
		const panel = vscode.window.createWebviewPanel(
			ScriptReviewProvider.viewType,
			"Script Review",
			column || vscode.ViewColumn.One,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
				localResourceRoots: [vscode.Uri.joinPath(extensionUri, "webview-ui", "build")],
			},
		)

		ScriptReviewProvider.currentPanel = new ScriptReviewProvider(panel, extensionUri, outputChannel)
	}

	/**
	 * Private constructor - use createOrShow instead
	 */
	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, outputChannel: vscode.OutputChannel) {
		this.panel = panel
		this.extensionUri = extensionUri
		this.outputChannel = outputChannel
		this.manager = new ScriptReviewManager(outputChannel)

		// Set the webview's initial html content
		this.panel.webview.html = this.getHtmlForWebview(this.panel.webview)

		// Listen for when the panel is disposed
		this.panel.onDidDispose(() => this.dispose(), null, this.disposables)

		// Handle messages from the webview
		this.panel.webview.onDidReceiveMessage(
			async (message: ScriptReviewMessage) => {
				const response = await this.manager.handleMessage(message)
				this.panel.webview.postMessage(response)
			},
			null,
			this.disposables,
		)

		// Send initial state to webview
		this.sendInitialState()
	}

	/**
	 * Send initial state to webview
	 */
	private async sendInitialState(): Promise<void> {
		// Create a new empty script by default
		const response = this.manager.createNewScript()
		this.panel.webview.postMessage(response)
	}

	/**
	 * Generate HTML content for the webview
	 */
	private getHtmlForWebview(webview: vscode.Webview): string {
		// Get the local path to the built webview assets
		const scriptUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this.extensionUri, "webview-ui", "build", "assets", "index.js"),
		)
		const styleUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this.extensionUri, "webview-ui", "build", "assets", "index.css"),
		)

		// Use a nonce to only allow specific scripts to be run
		const nonce = getNonce()

		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${webview.cspSource} 'wasm-unsafe-eval'; font-src ${webview.cspSource} data:; img-src ${webview.cspSource} https: data:; connect-src ${webview.cspSource};">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link href="${styleUri}" rel="stylesheet">
	<title>Script Review</title>
</head>
<body>
	<div id="root" data-vscode-context='{"preventDefaultContextMenuItems": true}'></div>
	<script nonce="${nonce}">
		// Set Script Review mode flag BEFORE the main app loads
		// Do NOT call acquireVsCodeApi() here - let the VSCodeAPIWrapper singleton handle it
		window.scriptReviewMode = true;
	</script>
	<script nonce="${nonce}" type="module" src="${scriptUri}"></script>
</body>
</html>`
	}

	/**
	 * Dispose of the panel
	 */
	public dispose(): void {
		ScriptReviewProvider.currentPanel = undefined

		// Clean up resources
		this.manager.dispose()
		this.panel.dispose()

		while (this.disposables.length) {
			const disposable = this.disposables.pop()
			if (disposable) {
				disposable.dispose()
			}
		}
	}
}

/**
 * Generate a nonce for CSP
 */
function getNonce(): string {
	let text = ""
	const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length))
	}
	return text
}
