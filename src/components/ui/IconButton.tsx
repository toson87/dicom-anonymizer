import type { ReactNode, ButtonHTMLAttributes } from 'react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  label: string
  active?: boolean
}

export function IconButton({ children, label, active, style, ...rest }: IconButtonProps) {
  return (
    <button
      {...rest}
      title={label}
      aria-label={label}
      style={{
        width: 30,
        height: 30,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: active ? '#1f6feb' : 'transparent',
        color: active ? '#fff' : '#c9d1d9',
        border: '1px solid #30363d',
        borderRadius: 4,
        padding: 0,
        transition: 'background 120ms, color 120ms',
        ...style,
      }}
      onMouseEnter={e => {
        if (!active) e.currentTarget.style.background = '#21262d'
      }}
      onMouseLeave={e => {
        if (!active) e.currentTarget.style.background = 'transparent'
      }}
    >
      {children}
    </button>
  )
}
