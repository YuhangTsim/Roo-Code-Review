/**
 * Review Section - Individual editable section of a review
 */

import React, { useState, useCallback } from "react"

interface ReviewSectionProps {
	title: string
	content: string
	onUpdate: (content: string) => void
	placeholder?: string
}

export const ReviewSection: React.FC<ReviewSectionProps> = ({ title, content, onUpdate, placeholder }) => {
	const [isEditing, setIsEditing] = useState(false)
	const [value, setValue] = useState(content)

	const handleSave = useCallback(() => {
		if (value !== content) {
			onUpdate(value)
		}
		setIsEditing(false)
	}, [value, content, onUpdate])

	const handleCancel = useCallback(() => {
		setValue(content)
		setIsEditing(false)
	}, [content])

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Escape") {
			handleCancel()
		}
		// Allow Ctrl+Enter or Cmd+Enter to save
		if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
			handleSave()
		}
	}

	// Update local value when content prop changes
	React.useEffect(() => {
		setValue(content)
	}, [content])

	return (
		<div className="border border-vscode-panel-border rounded-lg overflow-hidden bg-vscode-sideBar-background">
			{/* Section Header */}
			<div className="px-4 py-2 bg-vscode-sideBarSectionHeader-background border-b border-vscode-panel-border">
				<h3 className="font-semibold text-sm text-vscode-sideBarTitle-foreground">{title}</h3>
			</div>

			{/* Section Content */}
			<div className="p-4">
				{isEditing ? (
					<div className="space-y-2">
						<textarea
							value={value}
							onChange={(e) => setValue(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder={placeholder}
							className="w-full h-40 px-3 py-2 bg-vscode-input-background text-vscode-input-foreground border border-vscode-input-border rounded focus:outline-none focus:border-vscode-focusBorder resize-vertical text-sm"
							autoFocus
						/>
						<div className="flex gap-2">
							<button
								onClick={handleSave}
								className="px-3 py-1 text-sm bg-vscode-button-background text-vscode-button-foreground hover:bg-vscode-button-hoverBackground rounded">
								Save
							</button>
							<button
								onClick={handleCancel}
								className="px-3 py-1 text-sm bg-vscode-button-secondaryBackground text-vscode-button-secondaryForeground hover:bg-vscode-button-secondaryHoverBackground rounded">
								Cancel
							</button>
							<span className="text-xs text-vscode-descriptionForeground self-center ml-2">
								Ctrl+Enter to save, Esc to cancel
							</span>
						</div>
					</div>
				) : (
					<div
						onClick={() => setIsEditing(true)}
						className="min-h-[100px] p-3 bg-vscode-editor-background rounded text-sm whitespace-pre-wrap cursor-text hover:border hover:border-vscode-focusBorder transition-all"
						title="Click to edit">
						{content || (
							<span className="text-vscode-descriptionForeground italic">
								{placeholder || "Click to add content..."}
							</span>
						)}
					</div>
				)}
			</div>
		</div>
	)
}
