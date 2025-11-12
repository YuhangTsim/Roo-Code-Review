/**
 * Script Part - Individual collapsible script part component
 */

import React, { useState, useCallback } from "react"
import type { ScriptPart as ScriptPartType } from "./types"

interface ScriptPartProps {
	part: ScriptPartType
	isSelected: boolean
	onSelect: () => void
	onUpdate: (updates: Partial<ScriptPartType>) => void
	onToggleCollapse: () => void
	onDelete: () => void
}

export const ScriptPart: React.FC<ScriptPartProps> = ({
	part,
	isSelected,
	onSelect,
	onUpdate,
	onToggleCollapse,
	onDelete,
}) => {
	const [isEditingTitle, setIsEditingTitle] = useState(false)
	const [isEditingContent, setIsEditingContent] = useState(false)
	const [titleValue, setTitleValue] = useState(part.title)
	const [contentValue, setContentValue] = useState(part.content)

	const handleTitleSave = useCallback(() => {
		if (titleValue !== part.title) {
			onUpdate({ title: titleValue })
		}
		setIsEditingTitle(false)
	}, [titleValue, part.title, onUpdate])

	const handleContentSave = useCallback(() => {
		if (contentValue !== part.content) {
			onUpdate({ content: contentValue })
		}
		setIsEditingContent(false)
	}, [contentValue, part.content, onUpdate])

	const handleTitleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			handleTitleSave()
		} else if (e.key === "Escape") {
			setTitleValue(part.title)
			setIsEditingTitle(false)
		}
	}

	const handleContentKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Escape") {
			setContentValue(part.content)
			setIsEditingContent(false)
		}
	}

	const isCollapsed = part.collapsed ?? false

	return (
		<div
			className={`border rounded-lg overflow-hidden transition-all ${
				isSelected
					? "border-vscode-focusBorder bg-vscode-list-activeSelectionBackground"
					: "border-vscode-panel-border bg-vscode-editor-background hover:border-vscode-list-hoverBackground"
			}`}
			onClick={onSelect}>
			{/* Header */}
			<div className="flex items-center justify-between p-3 cursor-pointer">
				<div className="flex items-center gap-2 flex-1">
					<button
						onClick={(e) => {
							e.stopPropagation()
							onToggleCollapse()
						}}
						className="text-vscode-foreground hover:text-vscode-focusBorder transition-colors"
						title={isCollapsed ? "Expand" : "Collapse"}>
						{isCollapsed ? "▶" : "▼"}
					</button>

					{isEditingTitle ? (
						<input
							type="text"
							value={titleValue}
							onChange={(e) => setTitleValue(e.target.value)}
							onBlur={handleTitleSave}
							onKeyDown={handleTitleKeyDown}
							onClick={(e) => e.stopPropagation()}
							className="flex-1 px-2 py-1 bg-vscode-input-background text-vscode-input-foreground border border-vscode-input-border rounded focus:outline-none focus:border-vscode-focusBorder"
							autoFocus
						/>
					) : (
						<h3
							className="font-medium text-vscode-foreground"
							onDoubleClick={(e) => {
								e.stopPropagation()
								setIsEditingTitle(true)
							}}
							title="Double-click to edit">
							{part.title}
						</h3>
					)}
				</div>

				<button
					onClick={(e) => {
						e.stopPropagation()
						if (confirm(`Delete "${part.title}"?`)) {
							onDelete()
						}
					}}
					className="text-vscode-errorForeground hover:text-vscode-inputValidation-errorForeground transition-colors ml-2"
					title="Delete part">
					×
				</button>
			</div>

			{/* Content */}
			{!isCollapsed && (
				<div className="px-3 pb-3">
					{isEditingContent ? (
						<textarea
							value={contentValue}
							onChange={(e) => setContentValue(e.target.value)}
							onBlur={handleContentSave}
							onKeyDown={handleContentKeyDown}
							onClick={(e) => e.stopPropagation()}
							className="w-full h-32 px-3 py-2 bg-vscode-input-background text-vscode-input-foreground border border-vscode-input-border rounded focus:outline-none focus:border-vscode-focusBorder resize-vertical font-mono text-sm"
							autoFocus
						/>
					) : (
						<div
							className="p-3 bg-vscode-textCodeBlock-background rounded text-sm whitespace-pre-wrap font-mono text-vscode-foreground cursor-text"
							onDoubleClick={(e) => {
								e.stopPropagation()
								setIsEditingContent(true)
							}}
							title="Double-click to edit">
							{part.content || "No content"}
						</div>
					)}

					<div className="mt-2 text-xs text-vscode-descriptionForeground">
						Updated: {new Date(part.updatedAt).toLocaleString()}
					</div>
				</div>
			)}
		</div>
	)
}
