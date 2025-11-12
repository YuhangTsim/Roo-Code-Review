/**
 * Resizable split pane component
 * Allows users to drag a divider to resize the left and right panels
 */

import React, { useState, useRef, useEffect, ReactNode } from "react"

interface SplitPaneProps {
	children: [ReactNode, ReactNode] // Exactly two children: left and right panels
	initialSize?: number // Initial left panel percentage (default 50)
	minSize?: number // Minimum size percentage (default 20)
	maxSize?: number // Maximum size percentage (default 80)
}

export const SplitPane: React.FC<SplitPaneProps> = ({ children, initialSize = 50, minSize = 20, maxSize = 80 }) => {
	const [leftWidth, setLeftWidth] = useState(initialSize)
	const [isDragging, setIsDragging] = useState(false)
	const containerRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (!isDragging || !containerRef.current) return

			const container = containerRef.current
			const containerRect = container.getBoundingClientRect()
			const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100

			// Clamp between min and max
			const clampedWidth = Math.max(minSize, Math.min(maxSize, newLeftWidth))
			setLeftWidth(clampedWidth)
		}

		const handleMouseUp = () => {
			setIsDragging(false)
		}

		if (isDragging) {
			document.addEventListener("mousemove", handleMouseMove)
			document.addEventListener("mouseup", handleMouseUp)
		}

		return () => {
			document.removeEventListener("mousemove", handleMouseMove)
			document.removeEventListener("mouseup", handleMouseUp)
		}
	}, [isDragging, minSize, maxSize])

	const handleMouseDown = (e: React.MouseEvent) => {
		e.preventDefault()
		setIsDragging(true)
	}

	return (
		<div
			ref={containerRef}
			className="flex h-full w-full"
			style={{ cursor: isDragging ? "col-resize" : "default" }}>
			{/* Left Panel */}
			<div
				className="overflow-auto"
				style={{
					width: `${leftWidth}%`,
					minWidth: `${minSize}%`,
					maxWidth: `${maxSize}%`,
				}}>
				{children[0]}
			</div>

			{/* Divider */}
			<div
				className="w-1 bg-vscode-panel-border hover:bg-vscode-focusBorder cursor-col-resize flex-shrink-0 transition-colors"
				onMouseDown={handleMouseDown}
				style={{
					cursor: "col-resize",
					userSelect: "none",
				}}>
				<div className="h-full w-full" />
			</div>

			{/* Right Panel */}
			<div className="flex-1 overflow-auto">{children[1]}</div>
		</div>
	)
}
