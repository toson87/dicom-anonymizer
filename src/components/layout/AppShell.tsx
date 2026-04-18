import type { ReactNode } from 'react'

interface AppShellProps {
  header: ReactNode
  left: ReactNode
  center: ReactNode
  right: ReactNode
  rightFooter?: ReactNode
}

export function AppShell({ header, left, center, right, rightFooter }: AppShellProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: 'auto 1fr',
        height: '100vh',
        background: '#0d1117',
      }}
    >
      {header}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr 480px', minHeight: 0 }}>
        <aside style={{ borderRight: '1px solid #30363d', minHeight: 0, overflow: 'hidden' }}>{left}</aside>
        <main style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>{center}</main>
        <aside
          style={{
            borderLeft: '1px solid #30363d',
            minHeight: 0,
            display: 'grid',
            gridTemplateRows: '1fr auto',
            overflow: 'hidden',
          }}
        >
          <div style={{ minHeight: 0, overflow: 'hidden' }}>{right}</div>
          {rightFooter}
        </aside>
      </div>
    </div>
  )
}
