/**
 * Frontend types for Script-Review component
 * These mirror the backend types but are used in the React components
 */

export interface ScriptPart {
	id: string
	title: string
	content: string
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
	parts: ScriptPart[]
	reviews: Review[]
	createdAt: string
	updatedAt: string
	filePath?: string
}

export interface ScriptVersion {
	id: string
	script: Script
	timestamp: string
	description: string
}

export interface ScriptReviewState {
	currentScript: Script | null
	isModified: boolean
	history: ScriptVersion[]
	currentHistoryIndex: number
}
