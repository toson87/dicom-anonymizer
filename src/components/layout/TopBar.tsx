interface TopBarProps {
  studyCount: number
  instanceCount: number
}

export function TopBar({ studyCount, instanceCount }: TopBarProps) {
  return (
    <header
      style={{
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 18px',
        background: '#010409',
        borderBottom: '1px solid #30363d',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: '#0d1117',
            display: 'grid',
            placeItems: 'center',
            border: '1px solid #30363d',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 32 32">
            <path d="M13 6h6v7h7v6h-7v7h-6v-7H6v-6h7z" fill="#1f6feb"/>
            <circle cx="16" cy="16" r="2.5" fill="#e6edf3"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, letterSpacing: '-0.005em' }}>
            DICOM Anonymizer
          </div>
          <div className="mono" style={{ fontSize: 16, color: '#8b949e', marginTop: -1 }}>
            Client-side · PS 3.15 compliant
          </div>
        </div>
      </div>

      <div className="mono" style={{ fontSize: 15, color: '#8b949e', display: 'flex', gap: 20 }}>
        <span>{studyCount} studies</span>
        <span>·</span>
        <span>{instanceCount} instances</span>
        <span style={{ color: '#7ee787' }}>● Offline</span>
      </div>
    </header>
  )
}
