import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, Props>(
  ({ label, error, className, ...rest }, ref) => (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>}
      <textarea
        ref={ref}
        className={cn(
          'w-full rounded-lg border bg-surface px-3 py-2.5 text-sm text-ink outline-none transition',
          'placeholder:text-subtle focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30',
          error ? 'border-danger' : 'border-line',
          className,
        )}
        {...rest}
      />
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  ),
)
Textarea.displayName = 'Textarea'

export default Textarea
