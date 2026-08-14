/** USD formatting, dates, and display labels. */

export function usd(value: string | number): string {
  const n = typeof value === 'string' ? Number(value) : value
  const hasCents = Math.round(n * 100) % 100 !== 0
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(n)
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateRange(startIso: string, endIso: string): string {
  const start = new Date(startIso)
  const end = new Date(endIso)
  const sameYear = start.getFullYear() === end.getFullYear()
  const startStr = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
  })
  const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${startStr} – ${endStr}`
}

const CATEGORY_LABELS: Record<string, string> = {
  cruiser: 'Cruiser',
  sport: 'Sport',
  touring: 'Touring',
  adventure: 'Adventure',
  standard: 'Standard',
  dual_sport: 'Dual-Sport',
  scooter: 'Scooter',
  dirt: 'Dirt',
  electric: 'Electric',
  other: 'Other',
}

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category
}

export const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}))

/** Resolve a stored upload path to a browser URL (dev proxies /uploads to the API). */
export function imageUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined
  const apiBase = import.meta.env.VITE_API_URL
  if (!apiBase) return path
  return apiBase.replace(/\/api\/?$/, '') + path
}
