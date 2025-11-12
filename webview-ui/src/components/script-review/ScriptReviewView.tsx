/**
 * Main container for Script-Review component
 * Displays split view with Script on left and Review on right
 */

import React, { useState, useEffect, useCallback } from "react"
import { ScriptPanel } from "./ScriptPanel"
import { ReviewPanel } from "./ReviewPanel"
import { SplitPane } from "./SplitPane"
import type { ScriptPart, Review, ScriptReviewState } from "./types"

// VS Code API
declare const vscodeApi: any

export const ScriptReviewView: React.FC = () => {
	console.log("[ScriptReviewView] Component rendering")

	const [state, setState] = useState<ScriptReviewState>({
		currentScript: null,
		isModified: false,
		history: [],
		currentHistoryIndex: -1,
	})

	const [selectedPartId, setSelectedPartId] = useState<string | null>(null)

	console.log("[ScriptReviewView] State:", { hasScript: !!state.currentScript, selectedPartId })

	// Get the selected review based on the selected part
	const selectedReview =
		selectedPartId && state.currentScript
			? state.currentScript.reviews.find((r) => r.scriptPartId === selectedPartId)
			: null

	// Handle messages from extension
	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			const message = event.data

			switch (message.type) {
				case "scriptLoaded":
					setState((prev) => ({
						...prev,
						currentScript: message.script,
						isModified: false,
					}))
					// Auto-select first part if available
					if (message.script.parts.length > 0) {
						setSelectedPartId(message.script.parts[0].id)
					}
					break

				case "stateUpdated":
					setState(message.state)
					break

				case "scriptSaved":
					if (message.success) {
						setState((prev) => ({ ...prev, isModified: false }))
					}
					break

				case "scriptExported":
					if (message.success) {
						console.log("Script exported successfully to:", message.filePath)
					}
					break

				case "reviewGenerated":
					// Review has been generated, state will be updated via stateUpdated message
					break

				case "error":
					console.error("Error from extension:", message.message)
					break
			}
		}

		window.addEventListener("message", handleMessage)
		return () => window.removeEventListener("message", handleMessage)
	}, [])

	// Request initial state on mount
	useEffect(() => {
		vscodeApi.postMessage({ type: "getState" })
	}, [])

	// Send message to extension
	const sendMessage = useCallback((message: any) => {
		vscodeApi.postMessage(message)
	}, [])

	// Handle script part updates
	const handlePartUpdate = useCallback(
		(partId: string, updates: Partial<ScriptPart>) => {
			sendMessage({ type: "updateScriptPart", partId, updates })
			setState((prev) => ({
				...prev,
				isModified: true,
			}))
		},
		[sendMessage],
	)

	// Handle review updates
	const handleReviewUpdate = useCallback(
		(reviewId: string, updates: Partial<Review>) => {
			sendMessage({ type: "updateReview", reviewId, updates })
			setState((prev) => ({
				...prev,
				isModified: true,
			}))
		},
		[sendMessage],
	)

	// Handle toggle collapse
	const handleToggleCollapse = useCallback(
		(partId: string) => {
			sendMessage({ type: "togglePartCollapse", partId })
		},
		[sendMessage],
	)

	// Handle add script part
	const handleAddPart = useCallback(() => {
		const newPart = {
			title: `Part ${(state.currentScript?.parts.length || 0) + 1}`,
			content: "Enter your script content here...",
			order: state.currentScript?.parts.length || 0,
		}
		sendMessage({ type: "addScriptPart", part: newPart })
	}, [state.currentScript, sendMessage])

	// Handle delete script part
	const handleDeletePart = useCallback(
		(partId: string) => {
			sendMessage({ type: "deleteScriptPart", partId })
			// If the deleted part was selected, select the first available part
			if (partId === selectedPartId) {
				const remainingParts = state.currentScript?.parts.filter((p) => p.id !== partId) || []
				setSelectedPartId(remainingParts.length > 0 ? remainingParts[0].id : null)
			}
		},
		[selectedPartId, state.currentScript, sendMessage],
	)

	// Handle save
	const handleSave = useCallback(() => {
		sendMessage({ type: "saveScript" })
	}, [sendMessage])

	// Handle export
	const handleExport = useCallback(
		(format: "json" | "markdown" | "pdf") => {
			sendMessage({ type: "exportScript", format })
		},
		[sendMessage],
	)

	// Handle load from file
	const handleLoadFile = useCallback(() => {
		sendMessage({ type: "loadFromFile" })
	}, [sendMessage])

	// Handle generate AI review
	const handleGenerateReview = useCallback(
		(partId: string) => {
			sendMessage({ type: "generateReview", partId, useAI: true })
		},
		[sendMessage],
	)

	// Handle restore version
	const _handleRestoreVersion = useCallback(
		(versionId: string) => {
			sendMessage({ type: "restoreVersion", versionId })
		},
		[sendMessage],
	)

	if (!state.currentScript) {
		console.log("[ScriptReviewView] No script loaded, showing placeholder")
		return (
			<div className="flex items-center justify-center h-screen text-vscode-foreground bg-vscode-editor-background">
				<div className="text-center p-8 border border-vscode-panel-border rounded">
					<h2 className="text-xl mb-4">Script Review</h2>
					<p className="text-lg mb-4">No script loaded</p>
					<button
						onClick={handleLoadFile}
						className="px-4 py-2 bg-vscode-button-background text-vscode-button-foreground hover:bg-vscode-button-hoverBackground rounded">
						Load Script
					</button>
				</div>
			</div>
		)
	}

	console.log("[ScriptReviewView] Rendering main UI with script:", state.currentScript.title)

	return (
		<div className="h-screen flex flex-col bg-vscode-editor-background text-vscode-foreground">
			{/* Toolbar */}
			<div className="flex items-center justify-between px-4 py-2 border-b border-vscode-panel-border bg-vscode-sideBar-background">
				<div className="flex items-center gap-2">
					<h1 className="text-lg font-semibold">{state.currentScript.title}</h1>
					{state.isModified && (
						<span className="text-xs text-vscode-inputValidation-warningForeground">●</span>
					)}
				</div>
				<div className="flex gap-2">
					<button
						onClick={handleAddPart}
						className="px-3 py-1 text-sm bg-vscode-button-background text-vscode-button-foreground hover:bg-vscode-button-hoverBackground rounded"
						title="Add new script part">
						+ Add Part
					</button>
					<button
						onClick={handleLoadFile}
						className="px-3 py-1 text-sm bg-vscode-button-background text-vscode-button-foreground hover:bg-vscode-button-hoverBackground rounded"
						title="Load from file">
						Open
					</button>
					<button
						onClick={handleSave}
						className="px-3 py-1 text-sm bg-vscode-button-background text-vscode-button-foreground hover:bg-vscode-button-hoverBackground rounded"
						disabled={!state.isModified}
						title="Save script">
						Save
					</button>
					<button
						onClick={() => handleExport("markdown")}
						className="px-3 py-1 text-sm bg-vscode-button-background text-vscode-button-foreground hover:bg-vscode-button-hoverBackground rounded"
						title="Export to Markdown">
						Export
					</button>
				</div>
			</div>

			{/* Split View */}
			<div className="flex-1 overflow-hidden">
				<SplitPane>
					<ScriptPanel
						script={state.currentScript}
						selectedPartId={selectedPartId}
						onSelectPart={setSelectedPartId}
						onUpdatePart={handlePartUpdate}
						onToggleCollapse={handleToggleCollapse}
						onDeletePart={handleDeletePart}
					/>
					<ReviewPanel
						review={selectedReview}
						scriptPart={
							selectedPartId ? state.currentScript.parts.find((p) => p.id === selectedPartId) : null
						}
						onUpdateReview={handleReviewUpdate}
						onGenerateReview={selectedPartId ? () => handleGenerateReview(selectedPartId) : undefined}
					/>
				</SplitPane>
			</div>
		</div>
	)
}
