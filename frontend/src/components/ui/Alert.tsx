import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type Variant = 'error' | 'success' | 'info' | 'warning'

const STYLES: Record<Variant, string> = {
  error: 'border-danger/30 bg-danger-soft text-danger',
  success: 'border-success/30 bg-success-soft text-success',
  info: 'border-info/30 bg-info-soft text-info',
  warning: 'border-warning/30 bg-warning-soft text-warning',
}

export default function Alert({
  variant = 'info',
  children,
  className,
}: {
  variant?: Variant
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('rounded-lg border px-3.5 py-2.5 text-sm', STYLES[variant], className)}>
      {children}
    </div>
  )
}
