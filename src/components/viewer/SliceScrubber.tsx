interface SliceScrubberProps {
  total: number
  index: number
  onChange: (index: number) => void
}

export function SliceScrubber({ total, index, onChange }: SliceScrubberProps) {
  if (total <= 1) return null
  return (
    <div
      style={{
        padding: '8px 16px',
        background: '#0d1117',
        borderTop: '1px solid #30363d',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <button
        onClick={() => onChange(Math.max(0, index - 1))}
        disabled={index === 0}
        style={{
          padding: '4px 8px',
          fontSize: 15,
          background: '#21262d',
          color: '#c9d1d9',
          border: '1px solid #30363d',
          borderRadius: 3,
          opacity: index === 0 ? 0.4 : 1,
        }}
      >
        ◀
      </button>
      <input
        type="range"
        min={0}
        max={total - 1}
        value={index}
        onChange={e => onChange(parseInt(e.target.value, 10))}
        style={{ flex: 1 }}
      />
      <button
        onClick={() => onChange(Math.min(total - 1, index + 1))}
        disabled={index === total - 1}
        style={{
          padding: '4px 8px',
          fontSize: 15,
          background: '#21262d',
          color: '#c9d1d9',
          border: '1px solid #30363d',
          borderRadius: 3,
          opacity: index === total - 1 ? 0.4 : 1,
        }}
      >
        ▶
      </button>
      <span className="mono" style={{ fontSize: 15, color: '#8b949e', minWidth: 54, textAlign: 'right' }}>
        {index + 1} / {total}
      </span>
    </div>
  )
}
