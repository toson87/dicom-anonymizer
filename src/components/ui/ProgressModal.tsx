interface ProgressModalProps {
  open: boolean
  title: string
  message?: string
  processed: number
  total: number
}

export function ProgressModal({ open, title, message, processed, total }: ProgressModalProps) {
  if (!open) return null
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 9000,
      }}
    >
      <div
        style={{
          background: '#161b22',
          border: '1px solid #30363d',
          borderRadius: 8,
          padding: 24,
          minWidth: 360,
          maxWidth: 480,
          boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>{title}</div>
        {message && (
          <div className="mono" style={{ fontSize: 15, color: '#8b949e', marginBottom: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {message}
          </div>
        )}
        <div style={{ height: 4, background: '#30363d', borderRadius: 2, overflow: 'hidden' }}>
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #1f6feb, #388bfd)',
              transition: 'width 150ms linear',
            }}
          />
        </div>
        <div className="mono" style={{ marginTop: 10, fontSize: 15, color: '#8b949e', display: 'flex', justifyContent: 'space-between' }}>
          <span>{processed} / {total}</span>
          <span>{pct}%</span>
        </div>
      </div>
    </div>
  )
}
