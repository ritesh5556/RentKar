import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number
  totalPages: number
  onChange: (page: number) => void
}) {
  const btn =
    'inline-flex h-9 items-center gap-1 rounded-lg border border-line bg-surface px-3 text-sm font-medium text-ink transition hover:bg-page disabled:cursor-not-allowed disabled:opacity-40'
  return (
    <div className="mt-10 flex items-center justify-center gap-3">
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} className={btn}>
        <ChevronLeft className="h-4 w-4" /> Prev
      </button>
      <span className="text-sm text-muted">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className={btn}
      >
        Next <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
