import type { ButtonHTMLAttributes } from 'react'
import clsx from 'clsx'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
  loading?: boolean
}

export default function Button({
  variant = 'primary',
  loading = false,
  className,
  children,
  disabled,
  ...rest
}: Props) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition',
        'disabled:cursor-not-allowed disabled:opacity-60',
        variant === 'primary' && 'bg-emerald-600 text-white hover:bg-emerald-700',
        variant === 'secondary' && 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-100',
        variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700',
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? 'Please wait…' : children}
    </button>
  )
}
