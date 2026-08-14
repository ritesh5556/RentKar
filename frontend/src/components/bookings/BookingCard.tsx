import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Alert from '../ui/Alert'
import ReviewDialog from '../reviews/ReviewDialog'
import { payBooking, transitionBooking, type BookingAction } from '../../lib/bookings'
import { apiErrorMessage } from '../../lib/errors'
import { formatDateRange, usd } from '../../lib/format'
import type { Booking, BookingStatus } from '../../types'

const STATUS_TONE: Record<BookingStatus, 'warning' | 'info' | 'danger' | 'neutral' | 'success'> = {
  pending: 'warning',
  confirmed: 'info',
  rejected: 'danger',
  cancelled: 'neutral',
  completed: 'success',
}

export default function BookingCard({
  booking,
  perspective,
}: {
  booking: Booking
  perspective: 'renter' | 'owner'
}) {
  const qc = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const [reviewed, setReviewed] = useState(false)

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['my-bookings'] })
    qc.invalidateQueries({ queryKey: ['incoming-bookings'] })
  }
  const act = useMutation({
    mutationFn: (action: BookingAction) => transitionBooking(booking.id, action),
    onSuccess: invalidate,
    onError: (e) => setError(apiErrorMessage(e)),
  })
  const pay = useMutation({
    mutationFn: () => payBooking(booking.id),
    onSuccess: invalidate,
    onError: (e) => setError(apiErrorMessage(e)),
  })

  const run = (action: BookingAction) => {
    setError(null)
    act.mutate(action)
  }

  const other = perspective === 'renter' ? booking.owner.full_name : booking.renter.full_name
  const s = booking.status
  const paid = booking.payment_status === 'paid'

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            to={`/bikes/${booking.bike_id}`}
            className="font-semibold text-ink hover:text-brand-700"
          >
            {booking.bike.title}
          </Link>
          <p className="text-sm text-muted">
            {formatDateRange(booking.start_date, booking.end_date)} · {booking.total_days} day
            {booking.total_days === 1 ? '' : 's'}
          </p>
          <p className="text-sm text-muted">
            {perspective === 'renter' ? 'Host' : 'Renter'}: {other} · {booking.bike.city},{' '}
            {booking.bike.state}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge tone={STATUS_TONE[s]}>{s}</Badge>
          {booking.payment_status === 'paid' && <Badge tone="success">Paid</Badge>}
          {booking.payment_status === 'refunded' && <Badge tone="neutral">Refunded</Badge>}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-sm">
        <span className="capitalize text-muted">{booking.protection_plan} protection</span>
        <span className="font-semibold text-ink">{usd(booking.total_price)}</span>
      </div>

      {error && (
        <div className="mt-3">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {perspective === 'owner' && s === 'pending' && (
          <>
            <Button size="sm" loading={act.isPending} onClick={() => run('confirm')}>
              Approve
            </Button>
            <Button size="sm" variant="secondary" onClick={() => run('reject')}>
              Reject
            </Button>
          </>
        )}
        {perspective === 'owner' && s === 'confirmed' && paid && (
          <Button size="sm" loading={act.isPending} onClick={() => run('complete')}>
            Mark complete
          </Button>
        )}
        {perspective === 'owner' && s === 'confirmed' && !paid && (
          <span className="text-xs text-subtle">Waiting for renter payment…</span>
        )}
        {perspective === 'renter' && s === 'confirmed' && !paid && (
          <Button
            size="sm"
            loading={pay.isPending}
            onClick={() => {
              setError(null)
              pay.mutate()
            }}
          >
            Pay {usd(booking.total_price)}
          </Button>
        )}
        {perspective === 'renter' && (s === 'pending' || s === 'confirmed') && (
          <Button size="sm" variant="secondary" onClick={() => run('cancel')}>
            Cancel
          </Button>
        )}
        {s === 'completed' && !reviewed && (
          <Button size="sm" variant="secondary" onClick={() => setReviewing(true)}>
            Leave a review
          </Button>
        )}
        {s === 'completed' && reviewed && (
          <span className="text-xs font-medium text-success">Review submitted ✓</span>
        )}
      </div>

      {reviewing && (
        <ReviewDialog
          bookingId={booking.id}
          targetLabel={perspective === 'renter' ? 'this bike' : other}
          onClose={() => setReviewing(false)}
          onDone={() => {
            setReviewing(false)
            setReviewed(true)
          }}
        />
      )}
    </Card>
  )
}
