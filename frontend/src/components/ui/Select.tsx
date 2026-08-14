import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

const Select = forwardRef<HTMLSelectElement, Props>(
  ({ label, error, className, children, ...rest }, ref) => (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>}
      <select
        ref={ref}
        className={cn(
          'w-full rounded-lg border bg-surface px-3 py-2.5 text-sm text-ink outline-none transition',
          'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30',
          error ? 'border-danger' : 'border-line',
          className,
        )}
        {...rest}
      >
        {children}
      </select>
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  ),
)
Select.displayName = 'Select'

export default Select
