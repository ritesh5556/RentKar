import { forwardRef, type InputHTMLAttributes } from 'react'
import clsx from 'clsx'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

const TextField = forwardRef<HTMLInputElement, Props>(
  ({ label, error, className, ...rest }, ref) => (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <input
        ref={ref}
        className={clsx(
          'w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500',
          error ? 'border-red-400' : 'border-gray-300',
          className,
        )}
        {...rest}
      />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  ),
)
TextField.displayName = 'TextField'

export default TextField
