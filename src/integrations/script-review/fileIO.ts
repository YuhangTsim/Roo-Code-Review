/**
 * File I/O operations for Script-Review component
 */

import * as vscode from "vscode"
import * as fs from "fs/promises"
import * as path from "path"
import type { Script, ScriptPart, Review } from "./types"

export class ScriptReviewFileIO {
	/**
	 * Load a script from a JSON file
	 */
	static async loadFromJSON(filePath: string): Promise<Script> {
		try {
			const content = await fs.readFile(filePath, "utf-8")
			const script: Script = JSON.parse(content)
			script.filePath = filePath
			return script
		} catch (error) {
			throw new Error(`Failed to load script from ${filePath}: ${error}`)
		}
	}

	/**
	 * Load a script from a Markdown file
	 */
	static async loadFromMarkdown(filePath: string): Promise<Script> {
		try {
			const content = await fs.readFile(filePath, "utf-8")
			return this.parseMarkdown(content, filePath)
		} catch (error) {
			throw new Error(`Failed to load script from ${filePath}: ${error}`)
		}
	}

	/**
	 * Parse markdown content into Script structure
	 */
	private static parseMarkdown(content: string, filePath: string): Script {
		const lines = content.split("\n")
		const script: Script = {
			id: this.generateId(),
			title: "Untitled Script",
			parts: [],
			reviews: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			filePath,
		}

		let currentPart: ScriptPart | null = null
		let currentReview: Review | null = null
		let currentSection: "title" | "part" | "review-summary" | "review-details" | "review-comments" | null = null
		let contentBuffer: string[] = []

		for (const line of lines) {
			// Script title
			if (line.startsWith("# ")) {
				script.title = line.substring(2).trim()
				continue
			}

			// Script part
			if (line.startsWith("## Part:")) {
				if (currentPart) {
					script.parts.push(currentPart)
				}
				if (currentReview) {
					script.reviews.push(currentReview)
					currentReview = null
				}

				const title = line.substring(8).trim()
				currentPart = {
					id: this.generateId(),
					title,
					content: "",
					order: script.parts.length,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				}
				currentSection = "part"
				contentBuffer = []
				continue
			}

			// Review sections
			if (line.startsWith("### Review")) {
				if (currentPart && contentBuffer.length > 0) {
					currentPart.content = contentBuffer.join("\n").trim()
					contentBuffer = []
				}

				if (!currentReview && currentPart) {
					currentReview = {
						id: this.generateId(),
						scriptPartId: currentPart.id,
						summary: "",
						implementationDetails: "",
						comments: "",
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString(),
					}
				}
				currentSection = null
				continue
			}

			if (line.startsWith("**Summary:**")) {
				currentSection = "review-summary"
				contentBuffer = []
				continue
			}

			if (line.startsWith("**Implementation Details:**")) {
				if (currentReview && currentSection === "review-summary") {
					currentReview.summary = contentBuffer.join("\n").trim()
				}
				currentSection = "review-details"
				contentBuffer = []
				continue
			}

			if (line.startsWith("**Comments:**")) {
				if (currentReview && currentSection === "review-details") {
					currentReview.implementationDetails = contentBuffer.join("\n").trim()
				}
				currentSection = "review-comments"
				contentBuffer = []
				continue
			}

			// Accumulate content
			if (currentSection) {
				contentBuffer.push(line)
			}
		}

		// Finalize last part and review
		if (currentPart) {
			if (currentSection === "part" && contentBuffer.length > 0) {
				currentPart.content = contentBuffer.join("\n").trim()
			}
			script.parts.push(currentPart)
		}

		if (currentReview) {
			if (currentSection === "review-comments" && contentBuffer.length > 0) {
				currentReview.comments = contentBuffer.join("\n").trim()
			}
			script.reviews.push(currentReview)
		}

		return script
	}

	/**
	 * Save script to JSON file
	 */
	static async saveToJSON(script: Script, filePath?: string): Promise<string> {
		const targetPath = filePath || script.filePath || (await this.promptForSavePath("json"))

		if (!targetPath) {
			throw new Error("No file path provided for saving")
		}

		try {
			const content = JSON.stringify(script, null, 2)
			await fs.writeFile(targetPath, content, "utf-8")
			return targetPath
		} catch (error) {
			throw new Error(`Failed to save script to ${targetPath}: ${error}`)
		}
	}

	/**
	 * Export script to Markdown format
	 */
	static async exportToMarkdown(script: Script, filePath?: string): Promise<string> {
		const targetPath = filePath || (await this.promptForSavePath("md"))

		if (!targetPath) {
			throw new Error("No file path provided for export")
		}

		try {
			const markdown = this.generateMarkdown(script)
			await fs.writeFile(targetPath, markdown, "utf-8")
			return targetPath
		} catch (error) {
			throw new Error(`Failed to export script to ${targetPath}: ${error}`)
		}
	}

	/**
	 * Generate Markdown content from Script
	 */
	private static generateMarkdown(script: Script): string {
		let md = `# ${script.title}\n\n`

		if (script.description) {
			md += `${script.description}\n\n`
		}

		md += `---\n\n`

		// Sort parts by order
		const sortedParts = [...script.parts].sort((a, b) => a.order - b.order)

		for (const part of sortedParts) {
			md += `## Part: ${part.title}\n\n`
			md += `${part.content}\n\n`

			// Find corresponding review
			const review = script.reviews.find((r) => r.scriptPartId === part.id)

			if (review) {
				md += `### Review\n\n`
				md += `**Summary:**\n${review.summary}\n\n`
				md += `**Implementation Details:**\n${review.implementationDetails}\n\n`
				md += `**Comments:**\n${review.comments}\n\n`
			}

			md += `---\n\n`
		}

		return md
	}

	/**
	 * Prompt user for save file path
	 */
	private static async promptForSavePath(extension: string): Promise<string | undefined> {
		const uri = await vscode.window.showSaveDialog({
			filters: {
				[extension.toUpperCase()]: [extension],
				"All Files": ["*"],
			},
			defaultUri: vscode.workspace.workspaceFolders?.[0]?.uri,
		})

		return uri?.fsPath
	}

	/**
	 * Generate unique ID
	 */
	private static generateId(): string {
		return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
	}

	/**
	 * Create a new empty script
	 */
	static createEmptyScript(): Script {
		const now = new Date().toISOString()
		const partId = this.generateId()

		return {
			id: this.generateId(),
			title: "New Script",
			description: "",
			parts: [
				{
					id: partId,
					title: "Part 1",
					content: "Enter your script content here...",
					order: 0,
					createdAt: now,
					updatedAt: now,
				},
			],
			reviews: [
				{
					id: this.generateId(),
					scriptPartId: partId,
					summary: "Summary of the script part...",
					implementationDetails: "Details about implementation...",
					comments: "Additional comments...",
					createdAt: now,
					updatedAt: now,
				},
			],
			createdAt: now,
			updatedAt: now,
		}
	}

	/**
	 * Open file picker and load script
	 */
	static async openScript(): Promise<Script | null> {
		const uri = await vscode.window.showOpenDialog({
			canSelectMany: false,
			filters: {
				"Script Files": ["json", "md"],
				JSON: ["json"],
				Markdown: ["md"],
				"All Files": ["*"],
			},
		})

		if (!uri || uri.length === 0) {
			return null
		}

		const filePath = uri[0].fsPath
		const ext = path.extname(filePath).toLowerCase()

		if (ext === ".json") {
			return await this.loadFromJSON(filePath)
		} else if (ext === ".md") {
			return await this.loadFromMarkdown(filePath)
		} else {
			throw new Error(`Unsupported file type: ${ext}`)
		}
	}
}
