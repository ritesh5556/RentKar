import { isAxiosError } from 'axios'

/** Extract a human-readable message from an API error (FastAPI `detail` shapes). */
export function apiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (isAxiosError(error)) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg)
  }
  return fallback
}
