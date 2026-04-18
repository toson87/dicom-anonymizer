import type { ViewportState } from '../../types/imaging'
import { IconButton } from '../ui/IconButton'

interface ViewerToolbarProps {
  viewport: ViewportState
  onViewportChange: (patch: Partial<ViewportState>) => void
  onReset: () => void
}

export function ViewerToolbar({ viewport, onViewportChange, onReset }: ViewerToolbarProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px',
        background: '#0d1117',
        borderBottom: '1px solid #30363d',
      }}
    >
      <IconButton label="Zoom in" onClick={() => onViewportChange({ zoom: Math.min(20, viewport.zoom * 1.25) })}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="11" y1="8" x2="11" y2="14" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      </IconButton>
      <IconButton label="Zoom out" onClick={() => onViewportChange({ zoom: Math.max(0.1, viewport.zoom / 1.25) })}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      </IconButton>
      <IconButton label="Reset viewport" onClick={onReset}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12a9 9 0 1 0 3-6.7" strokeLinecap="round" />
          <polyline points="3 4 3 10 9 10" strokeLinejoin="round" />
        </svg>
      </IconButton>
      <div style={{ width: 1, height: 20, background: '#30363d', margin: '0 4px' }} />
      <IconButton
        label="Invert"
        active={viewport.invert}
        onClick={() => onViewportChange({ invert: !viewport.invert })}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3a9 9 0 0 0 0 18" fill="currentColor" />
        </svg>
      </IconButton>
      <IconButton
        label="Flip horizontal"
        active={viewport.flipH}
        onClick={() => onViewportChange({ flipH: !viewport.flipH })}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3v18M7 8l-4 4 4 4M17 16l4-4-4-4" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </IconButton>
      <IconButton
        label="Rotate 90°"
        onClick={() => onViewportChange({ rotation: (viewport.rotation + 90) % 360 })}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12a9 9 0 0 1 15-6.7M21 4v6h-6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </IconButton>

      <div style={{ width: 1, height: 20, background: '#30363d', margin: '0 4px' }} />

      <div className="mono" style={{ fontSize: 15, color: '#8b949e', display: 'flex', gap: 12, marginLeft: 'auto' }}>
        <span>W: {Math.round(viewport.windowWidth)}</span>
        <span>C: {Math.round(viewport.windowCenter)}</span>
        <span>Z: {viewport.zoom.toFixed(2)}×</span>
      </div>
    </div>
  )
}
