import type { ReactNode } from 'react'
import clsx from 'clsx'

interface Props {
  variant?: 'error' | 'success' | 'info'
  children: ReactNode
}

export default function Alert({ variant = 'info', children }: Props) {
  return (
    <div
      className={clsx(
        'rounded-md border px-3 py-2 text-sm',
        variant === 'error' && 'border-red-200 bg-red-50 text-red-700',
        variant === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
        variant === 'info' && 'border-blue-200 bg-blue-50 text-blue-700',
      )}
    >
      {children}
    </div>
  )
}
