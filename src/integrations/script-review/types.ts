/**
 * Type definitions for Script-Review component
 */

export interface ScriptPart {
	id: string
	title: string
	content: string
	language?: string // Programming language for syntax highlighting (e.g., 'javascript', 'python', 'typescript')
	order: number
	collapsed?: boolean
	createdAt: string
	updatedAt: string
}

export interface Review {
	id: string
	scriptPartId: string
	summary: string
	implementationDetails: string
	comments: string
	createdAt: string
	updatedAt: string
}

export interface Script {
	id: string
	title: string
	description?: string
	language?: string // Overall language if all parts are same language
	parts: ScriptPart[]
	reviews: Review[]
	createdAt: string
	updatedAt: string
	filePath?: string
}

export interface ScriptReviewState {
	currentScript: Script | null
	isModified: boolean
	history: ScriptVersion[]
	currentHistoryIndex: number
}

export interface ScriptVersion {
	id: string
	script: Script
	timestamp: string
	description: string
}

export type ScriptReviewMessage =
	| { type: "loadScript"; script: Script }
	| { type: "updateScriptPart"; partId: string; updates: Partial<ScriptPart> }
	| { type: "updateReview"; reviewId: string; updates: Partial<Review> }
	| { type: "addScriptPart"; part: Omit<ScriptPart, "id" | "createdAt" | "updatedAt"> }
	| { type: "deleteScriptPart"; partId: string }
	| { type: "saveScript" }
	| { type: "exportScript"; format: "json" | "markdown" | "pdf" }
	| { type: "loadFromFile"; filePath?: string }
	| { type: "loadFromActiveEditor" }
	| { type: "generateReview"; partId: string; useAI: boolean }
	| { type: "restoreVersion"; versionId: string }
	| { type: "togglePartCollapse"; partId: string }
	| { type: "getState" }

export type ScriptReviewResponse =
	| { type: "scriptLoaded"; script: Script }
	| { type: "stateUpdated"; state: ScriptReviewState }
	| { type: "scriptSaved"; success: boolean; filePath?: string }
	| { type: "scriptExported"; success: boolean; filePath?: string }
	| { type: "reviewGenerated"; review: Review }
	| { type: "error"; message: string }

export interface ScriptReviewConfig {
	autoSaveEnabled: boolean
	autoSaveInterval: number // milliseconds
	defaultExportFormat: "json" | "markdown" | "pdf"
	maxHistoryVersions: number
}
