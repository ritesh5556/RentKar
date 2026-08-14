import { Star } from 'lucide-react'
import { cn } from '../../lib/cn'

interface Props {
  value: number
  onChange?: (value: number) => void
  size?: number
  className?: string
}

/** Read-only when no onChange is given; interactive input otherwise. */
export default function StarRating({ value, onChange, size = 18, className }: Props) {
  const interactive = Boolean(onChange)
  return (
    <div className={cn('inline-flex items-center gap-0.5', className)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= Math.round(value)
        const icon = (
          <Star
            style={{ width: size, height: size }}
            className={filled ? 'fill-gold text-gold' : 'text-subtle'}
          />
        )
        return interactive ? (
          <button
            key={n}
            type="button"
            onClick={() => onChange?.(n)}
            className="p-0.5 transition hover:scale-110"
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
          >
            {icon}
          </button>
        ) : (
          <span key={n}>{icon}</span>
        )
      })}
    </div>
  )
}
