import type { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  color?: 'identity' | 'date' | 'uid' | 'institution' | 'description' | 'device' | 'safe' | 'neutral'
  title?: string
}

const COLORS: Record<string, { bg: string; fg: string; border: string }> = {
  identity:     { bg: '#3d0f10', fg: '#ff8a80', border: '#da3633' },
  date:         { bg: '#3d2f0a', fg: '#f1c775', border: '#d29922' },
  uid:          { bg: '#2e1f4a', fg: '#d9baff', border: '#bc8cff' },
  institution:  { bg: '#3d240f', fg: '#ffb484', border: '#f0883e' },
  description:  { bg: '#3d2f0a', fg: '#f1c775', border: '#d29922' },
  device:       { bg: '#3d240f', fg: '#ffb484', border: '#f0883e' },
  safe:         { bg: '#0b3d20', fg: '#7ee787', border: '#238636' },
  neutral:      { bg: '#21262d', fg: '#8b949e', border: '#30363d' },
}

export function Badge({ children, color = 'neutral', title }: BadgeProps) {
  const c = COLORS[color]
  return (
    <span
      title={title}
      className="mono"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '1px 6px',
        fontSize: 16,
        lineHeight: '14px',
        borderRadius: 3,
        background: c.bg,
        color: c.fg,
        border: `1px solid ${c.border}`,
        letterSpacing: '0.03em',
        fontWeight: 500,
      }}
    >
      {children}
    </span>
  )
}
