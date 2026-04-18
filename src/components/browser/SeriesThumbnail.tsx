interface SeriesThumbnailProps {
  src: string | null
  modality: string
  active?: boolean
  onClick?: () => void
}

export function SeriesThumbnail({ src, modality, active, onClick }: SeriesThumbnailProps) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 64,
        height: 64,
        padding: 0,
        background: '#000',
        border: `1px solid ${active ? '#1f6feb' : '#30363d'}`,
        boxShadow: active ? '0 0 0 1px #1f6feb' : 'none',
        borderRadius: 4,
        overflow: 'hidden',
        display: 'grid',
        placeItems: 'center',
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      {src ? (
        <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span className="mono" style={{ color: '#484f58', fontSize: 16 }}>
          {modality || '—'}
        </span>
      )}
      <span
        className="mono"
        style={{
          position: 'absolute',
          bottom: 2,
          left: 2,
          fontSize: 15,
          color: '#c9d1d9',
          padding: '1px 4px',
          background: 'rgba(0,0,0,0.6)',
          borderRadius: 2,
        }}
      >
        {modality || 'UNK'}
      </span>
    </button>
  )
}
