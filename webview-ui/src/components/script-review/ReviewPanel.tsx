/**
 * Review Panel - Right side panel displaying review for selected script part
 */

import React from "react"
import { ReviewSection } from "./ReviewSection"
import type { Review, ScriptPart } from "./types"

interface ReviewPanelProps {
	review: Review | null | undefined
	scriptPart: ScriptPart | null | undefined
	onUpdateReview: (reviewId: string, updates: Partial<Review>) => void
	onGenerateReview?: () => void
}

export const ReviewPanel: React.FC<ReviewPanelProps> = ({ review, scriptPart, onUpdateReview, onGenerateReview }) => {
	if (!scriptPart) {
		return (
			<div className="h-full flex items-center justify-center bg-vscode-editor-background text-vscode-descriptionForeground">
				<div className="text-center">
					<p>No script part selected</p>
					<p className="text-sm mt-2">Select a script part to view its review</p>
				</div>
			</div>
		)
	}

	if (!review) {
		return (
			<div className="h-full flex flex-col items-center justify-center bg-vscode-editor-background text-vscode-descriptionForeground">
				<div className="text-center">
					<p className="mb-4">No review for &quot;{scriptPart.title}&quot;</p>
					{onGenerateReview && (
						<button
							onClick={onGenerateReview}
							className="px-4 py-2 bg-vscode-button-background text-vscode-button-foreground hover:bg-vscode-button-hoverBackground rounded">
							Generate Review
						</button>
					)}
				</div>
			</div>
		)
	}

	return (
		<div className="h-full flex flex-col bg-vscode-editor-background">
			{/* Header */}
			<div className="p-4 border-b border-vscode-panel-border">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-semibold text-vscode-foreground">Review: {scriptPart.title}</h2>
					{onGenerateReview && (
						<button
							onClick={onGenerateReview}
							className="px-3 py-1 text-sm bg-vscode-button-background text-vscode-button-foreground hover:bg-vscode-button-hoverBackground rounded"
							title="Regenerate review with AI">
							🔄 Regenerate
						</button>
					)}
				</div>
			</div>

			{/* Review Sections */}
			<div className="flex-1 overflow-y-auto p-4 space-y-4">
				<ReviewSection
					title="Summary"
					content={review.summary}
					onUpdate={(content) => onUpdateReview(review.id, { summary: content })}
					placeholder="Provide a brief summary of the script part..."
				/>

				<ReviewSection
					title="Implementation Details"
					content={review.implementationDetails}
					onUpdate={(content) => onUpdateReview(review.id, { implementationDetails: content })}
					placeholder="Describe implementation details, technical considerations, and approach..."
				/>

				<ReviewSection
					title="Comments"
					content={review.comments}
					onUpdate={(content) => onUpdateReview(review.id, { comments: content })}
					placeholder="Add additional comments, notes, or observations..."
				/>

				{/* Metadata */}
				<div className="pt-4 border-t border-vscode-panel-border">
					<div className="text-xs text-vscode-descriptionForeground space-y-1">
						<div>Created: {new Date(review.createdAt).toLocaleString()}</div>
						<div>Updated: {new Date(review.updatedAt).toLocaleString()}</div>
					</div>
				</div>
			</div>
		</div>
	)
}
