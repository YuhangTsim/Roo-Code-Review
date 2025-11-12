/**
 * Script Panel - Left side panel displaying script parts
 */

import React from "react"
import { ScriptPart as ScriptPartComponent } from "./ScriptPart"
import type { Script, ScriptPart as ScriptPartType } from "./types"

interface ScriptPanelProps {
	script: Script
	selectedPartId: string | null
	onSelectPart: (partId: string) => void
	onUpdatePart: (partId: string, updates: Partial<ScriptPartType>) => void
	onToggleCollapse: (partId: string) => void
	onDeletePart: (partId: string) => void
}

export const ScriptPanel: React.FC<ScriptPanelProps> = ({
	script,
	selectedPartId,
	onSelectPart,
	onUpdatePart,
	onToggleCollapse,
	onDeletePart,
}) => {
	// Sort parts by order
	const sortedParts = [...script.parts].sort((a, b) => a.order - b.order)

	return (
		<div className="h-full flex flex-col bg-vscode-sideBar-background">
			{/* Header */}
			<div className="p-4 border-b border-vscode-panel-border">
				<h2 className="text-lg font-semibold text-vscode-foreground">Script</h2>
				{script.description && (
					<p className="text-sm text-vscode-descriptionForeground mt-1">{script.description}</p>
				)}
			</div>

			{/* Parts List */}
			<div className="flex-1 overflow-y-auto p-4 space-y-3">
				{sortedParts.length === 0 ? (
					<div className="text-center py-8 text-vscode-descriptionForeground">
						<p>No script parts yet</p>
						<p className="text-sm mt-2">Click &quot;Add Part&quot; to create one</p>
					</div>
				) : (
					sortedParts.map((part) => (
						<ScriptPartComponent
							key={part.id}
							part={part}
							isSelected={part.id === selectedPartId}
							onSelect={() => onSelectPart(part.id)}
							onUpdate={(updates) => onUpdatePart(part.id, updates)}
							onToggleCollapse={() => onToggleCollapse(part.id)}
							onDelete={() => onDeletePart(part.id)}
						/>
					))
				)}
			</div>
		</div>
	)
}
