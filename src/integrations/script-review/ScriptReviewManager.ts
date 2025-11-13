/**
 * Business logic and state management for Script-Review component
 */

import * as vscode from "vscode"
import type {
	Script,
	ScriptPart,
	Review,
	ScriptReviewState,
	ScriptVersion,
	ScriptReviewConfig,
	ScriptReviewMessage,
	ScriptReviewResponse,
} from "./types"
import { ScriptReviewFileIO } from "./fileIO"

export class ScriptReviewManager {
	private state: ScriptReviewState
	private config: ScriptReviewConfig
	private autoSaveTimer?: NodeJS.Timeout

	constructor(private readonly outputChannel: vscode.OutputChannel) {
		this.state = {
			currentScript: null,
			isModified: false,
			history: [],
			currentHistoryIndex: -1,
		}

		this.config = {
			autoSaveEnabled: true,
			autoSaveInterval: 30000, // 30 seconds
			defaultExportFormat: "markdown",
			maxHistoryVersions: 50,
		}
	}

	/**
	 * Handle incoming messages from webview
	 */
	async handleMessage(message: ScriptReviewMessage): Promise<ScriptReviewResponse> {
		try {
			switch (message.type) {
				case "loadScript":
					return await this.loadScript(message.script)

				case "updateScriptPart":
					return this.updateScriptPart(message.partId, message.updates)

				case "updateReview":
					return this.updateReview(message.reviewId, message.updates)

				case "addScriptPart":
					return this.addScriptPart(message.part)

				case "deleteScriptPart":
					return this.deleteScriptPart(message.partId)

				case "saveScript":
					return await this.saveScript()

				case "exportScript":
					return await this.exportScript(message.format)

				case "loadFromFile":
					return await this.loadFromFile(message.filePath)

				case "loadFromActiveEditor":
					return await this.loadFromActiveEditor()

				case "generateReview":
					return await this.generateReview(message.partId, message.useAI)

				case "restoreVersion":
					return this.restoreVersion(message.versionId)

				case "togglePartCollapse":
					return this.togglePartCollapse(message.partId)

				case "getState":
					return { type: "stateUpdated", state: this.state }

				default:
					return { type: "error", message: "Unknown message type" }
			}
		} catch (error) {
			this.outputChannel.appendLine(`Error handling message: ${error}`)
			return { type: "error", message: String(error) }
		}
	}

	/**
	 * Load a script into the current state
	 */
	private async loadScript(script: Script): Promise<ScriptReviewResponse> {
		this.state.currentScript = script
		this.state.isModified = false
		this.saveToHistory("Script loaded")
		this.startAutoSave()

		return { type: "scriptLoaded", script }
	}

	/**
	 * Update a script part
	 */
	private updateScriptPart(partId: string, updates: Partial<ScriptPart>): ScriptReviewResponse {
		if (!this.state.currentScript) {
			return { type: "error", message: "No script loaded" }
		}

		const part = this.state.currentScript.parts.find((p) => p.id === partId)
		if (!part) {
			return { type: "error", message: `Script part ${partId} not found` }
		}

		Object.assign(part, updates, { updatedAt: new Date().toISOString() })
		this.state.currentScript.updatedAt = new Date().toISOString()
		this.state.isModified = true

		return { type: "stateUpdated", state: this.state }
	}

	/**
	 * Update a review
	 */
	private updateReview(reviewId: string, updates: Partial<Review>): ScriptReviewResponse {
		if (!this.state.currentScript) {
			return { type: "error", message: "No script loaded" }
		}

		const review = this.state.currentScript.reviews.find((r) => r.id === reviewId)
		if (!review) {
			return { type: "error", message: `Review ${reviewId} not found` }
		}

		Object.assign(review, updates, { updatedAt: new Date().toISOString() })
		this.state.currentScript.updatedAt = new Date().toISOString()
		this.state.isModified = true

		return { type: "stateUpdated", state: this.state }
	}

	/**
	 * Add a new script part
	 */
	private addScriptPart(partData: Omit<ScriptPart, "id" | "createdAt" | "updatedAt">): ScriptReviewResponse {
		if (!this.state.currentScript) {
			return { type: "error", message: "No script loaded" }
		}

		const now = new Date().toISOString()
		const newPart: ScriptPart = {
			...partData,
			id: this.generateId(),
			createdAt: now,
			updatedAt: now,
		}

		this.state.currentScript.parts.push(newPart)

		// Create a default review for the new part
		const newReview: Review = {
			id: this.generateId(),
			scriptPartId: newPart.id,
			summary: "",
			implementationDetails: "",
			comments: "",
			createdAt: now,
			updatedAt: now,
		}
		this.state.currentScript.reviews.push(newReview)

		this.state.currentScript.updatedAt = now
		this.state.isModified = true

		return { type: "stateUpdated", state: this.state }
	}

	/**
	 * Delete a script part and its associated review
	 */
	private deleteScriptPart(partId: string): ScriptReviewResponse {
		if (!this.state.currentScript) {
			return { type: "error", message: "No script loaded" }
		}

		// Remove the part
		this.state.currentScript.parts = this.state.currentScript.parts.filter((p) => p.id !== partId)

		// Remove associated reviews
		this.state.currentScript.reviews = this.state.currentScript.reviews.filter((r) => r.scriptPartId !== partId)

		this.state.currentScript.updatedAt = new Date().toISOString()
		this.state.isModified = true

		return { type: "stateUpdated", state: this.state }
	}

	/**
	 * Save the current script
	 */
	private async saveScript(): Promise<ScriptReviewResponse> {
		if (!this.state.currentScript) {
			return { type: "error", message: "No script loaded" }
		}

		try {
			const filePath = await ScriptReviewFileIO.saveToJSON(this.state.currentScript)
			this.state.currentScript.filePath = filePath
			this.state.isModified = false
			this.saveToHistory("Script saved")

			return { type: "scriptSaved", success: true, filePath }
		} catch (error) {
			return { type: "scriptSaved", success: false }
		}
	}

	/**
	 * Export the current script
	 */
	private async exportScript(format: "json" | "markdown" | "pdf"): Promise<ScriptReviewResponse> {
		if (!this.state.currentScript) {
			return { type: "error", message: "No script loaded" }
		}

		try {
			let filePath: string

			switch (format) {
				case "json":
					filePath = await ScriptReviewFileIO.saveToJSON(this.state.currentScript)
					break
				case "markdown":
					filePath = await ScriptReviewFileIO.exportToMarkdown(this.state.currentScript)
					break
				case "pdf":
					// TODO: Implement PDF export
					return { type: "error", message: "PDF export not yet implemented" }
				default:
					return { type: "error", message: `Unknown format: ${format}` }
			}

			return { type: "scriptExported", success: true, filePath }
		} catch (error) {
			return { type: "scriptExported", success: false }
		}
	}

	/**
	 * Load script from file
	 */
	private async loadFromFile(filePath?: string): Promise<ScriptReviewResponse> {
		try {
			let script: Script | null

			if (filePath) {
				const ext = filePath.toLowerCase()
				if (ext.endsWith(".json")) {
					script = await ScriptReviewFileIO.loadFromJSON(filePath)
				} else if (ext.endsWith(".md")) {
					script = await ScriptReviewFileIO.loadFromMarkdown(filePath)
				} else if (ext.endsWith(".ipynb")) {
					script = await ScriptReviewFileIO.loadFromNotebook(filePath)
				} else {
					// Try to load as code file
					script = await ScriptReviewFileIO.loadFromCodeFile(filePath)
				}
			} else {
				script = await ScriptReviewFileIO.openScript()
			}

			if (!script) {
				return { type: "error", message: "No script selected" }
			}

			return await this.loadScript(script)
		} catch (error) {
			return { type: "error", message: String(error) }
		}
	}

	/**
	 * Load script from active editor
	 */
	private async loadFromActiveEditor(): Promise<ScriptReviewResponse> {
		try {
			const script = await ScriptReviewFileIO.loadFromActiveEditor()

			if (!script) {
				return { type: "error", message: "No active editor or failed to load" }
			}

			return await this.loadScript(script)
		} catch (error) {
			return { type: "error", message: String(error) }
		}
	}

	/**
	 * Generate a review for a script part (with optional AI)
	 */
	private async generateReview(partId: string, useAI: boolean): Promise<ScriptReviewResponse> {
		if (!this.state.currentScript) {
			return { type: "error", message: "No script loaded" }
		}

		const part = this.state.currentScript.parts.find((p) => p.id === partId)
		if (!part) {
			return { type: "error", message: `Script part ${partId} not found` }
		}

		// TODO: Implement AI-powered review generation
		// For now, create a template review
		const now = new Date().toISOString()
		const review: Review = {
			id: this.generateId(),
			scriptPartId: partId,
			summary: useAI ? "AI-generated summary (not yet implemented)" : "Manual review summary",
			implementationDetails: useAI
				? "AI-generated implementation details (not yet implemented)"
				: "Implementation details here",
			comments: useAI ? "AI-generated comments (not yet implemented)" : "Additional comments",
			createdAt: now,
			updatedAt: now,
		}

		// Update or add review
		const existingReviewIndex = this.state.currentScript.reviews.findIndex((r) => r.scriptPartId === partId)
		if (existingReviewIndex >= 0) {
			this.state.currentScript.reviews[existingReviewIndex] = review
		} else {
			this.state.currentScript.reviews.push(review)
		}

		this.state.isModified = true

		return { type: "reviewGenerated", review }
	}

	/**
	 * Restore a version from history
	 */
	private restoreVersion(versionId: string): ScriptReviewResponse {
		const version = this.state.history.find((v) => v.id === versionId)
		if (!version) {
			return { type: "error", message: `Version ${versionId} not found` }
		}

		this.state.currentScript = JSON.parse(JSON.stringify(version.script)) // Deep clone
		this.state.isModified = true
		this.saveToHistory("Version restored")

		return { type: "stateUpdated", state: this.state }
	}

	/**
	 * Toggle collapse state of a script part
	 */
	private togglePartCollapse(partId: string): ScriptReviewResponse {
		if (!this.state.currentScript) {
			return { type: "error", message: "No script loaded" }
		}

		const part = this.state.currentScript.parts.find((p) => p.id === partId)
		if (!part) {
			return { type: "error", message: `Script part ${partId} not found` }
		}

		part.collapsed = !part.collapsed
		return { type: "stateUpdated", state: this.state }
	}

	/**
	 * Save current state to history
	 */
	private saveToHistory(description: string): void {
		if (!this.state.currentScript) {
			return
		}

		const version: ScriptVersion = {
			id: this.generateId(),
			script: JSON.parse(JSON.stringify(this.state.currentScript)), // Deep clone
			timestamp: new Date().toISOString(),
			description,
		}

		// Remove any versions after current index (when restoring from middle of history)
		if (this.state.currentHistoryIndex < this.state.history.length - 1) {
			this.state.history = this.state.history.slice(0, this.state.currentHistoryIndex + 1)
		}

		this.state.history.push(version)
		this.state.currentHistoryIndex = this.state.history.length - 1

		// Limit history size
		if (this.state.history.length > this.config.maxHistoryVersions) {
			this.state.history.shift()
			this.state.currentHistoryIndex--
		}
	}

	/**
	 * Start auto-save timer
	 */
	private startAutoSave(): void {
		if (this.autoSaveTimer) {
			clearInterval(this.autoSaveTimer)
		}

		if (this.config.autoSaveEnabled) {
			this.autoSaveTimer = setInterval(() => {
				if (this.state.isModified && this.state.currentScript?.filePath) {
					this.saveScript().catch((error) => {
						this.outputChannel.appendLine(`Auto-save failed: ${error}`)
					})
				}
			}, this.config.autoSaveInterval)
		}
	}

	/**
	 * Stop auto-save timer
	 */
	stopAutoSave(): void {
		if (this.autoSaveTimer) {
			clearInterval(this.autoSaveTimer)
			this.autoSaveTimer = undefined
		}
	}

	/**
	 * Get current state
	 */
	getState(): ScriptReviewState {
		return this.state
	}

	/**
	 * Create a new empty script
	 */
	createNewScript(): ScriptReviewResponse {
		const script = ScriptReviewFileIO.createEmptyScript()
		this.state.currentScript = script
		this.state.isModified = true
		this.saveToHistory("New script created")
		this.startAutoSave()

		return { type: "scriptLoaded", script }
	}

	/**
	 * Generate unique ID
	 */
	private generateId(): string {
		return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
	}

	/**
	 * Dispose resources
	 */
	dispose(): void {
		this.stopAutoSave()
	}
}
