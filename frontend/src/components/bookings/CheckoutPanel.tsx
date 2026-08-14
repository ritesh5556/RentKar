import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Card from '../ui/Card'
import Button from '../ui/Button'
import Alert from '../ui/Alert'
import Spinner from '../ui/Spinner'
import TextField from '../ui/TextField'
import { cn } from '../../lib/cn'
import { usd } from '../../lib/format'
import { apiErrorMessage } from '../../lib/errors'
import { createBooking, quoteBooking } from '../../lib/bookings'
import { usePlans } from '../../hooks/useBookings'
import { useAuth } from '../../hooks/useAuth'
import type { Bike, ProtectionPlan } from '../../types'

const todayIso = new Date().toISOString().slice(0, 10)

function Row({
  label,
  value,
  strong,
  muted,
}: {
  label: string
  value: string
  strong?: boolean
  muted?: boolean
}) {
  return (
    <div className="flex justify-between">
      <span className={cn(strong ? 'font-semibold text-ink' : muted ? 'text-subtle' : 'text-muted')}>
        {label}
      </span>
      <span className={cn(strong ? 'font-semibold text-ink' : muted ? 'text-subtle' : 'text-ink')}>
        {value}
      </span>
    </div>
  )
}

export default function CheckoutPanel({ bike }: { bike: Bike }) {
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const plans = usePlans()

  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [plan, setPlan] = useState<ProtectionPlan>('standard')
  const [terms, setTerms] = useState(false)

  const validRange = Boolean(start && end && end >= start)

  const quote = useQuery({
    queryKey: ['quote', bike.id, start, end, plan],
    queryFn: () =>
      quoteBooking({ bike_id: bike.id, start_date: start, end_date: end, protection_plan: plan }),
    enabled: validRange,
  })

  const create = useMutation({
    mutationFn: () =>
      createBooking({
        bike_id: bike.id,
        start_date: start,
        end_date: end,
        protection_plan: plan,
        accept_terms: terms,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-bookings'] })
      navigate('/trips')
    },
  })

  if (bike.is_owner) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted">
          This is your listing. Manage it from{' '}
          <Link to="/my-bikes" className="font-semibold text-brand-700">
            My bikes
          </Link>
          .
        </p>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-ink">{usd(bike.price_per_day)}</span>
        <span className="text-muted">/ day</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <TextField
          label="From"
          type="date"
          min={todayIso}
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
        <TextField
          label="To"
          type="date"
          min={start || todayIso}
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
      </div>

      <div className="mt-4">
        <p className="mb-2 text-sm font-medium text-ink">Protection plan</p>
        <div className="space-y-2">
          {plans.data?.map((p) => (
            <label
              key={p.plan}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition',
                plan === p.plan ? 'border-brand-500 bg-brand-50' : 'border-line hover:bg-page',
              )}
            >
              <input
                type="radio"
                name="plan"
                checked={plan === p.plan}
                onChange={() => setPlan(p.plan)}
                className="mt-1 accent-brand-600"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize text-ink">{p.plan}</span>
                  <span className="text-sm text-ink">{usd(p.daily_fee)}/day</span>
                </div>
                <p className="text-xs text-muted">{p.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {validRange && (
        <div className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
          {quote.isLoading ? (
            <div className="flex justify-center py-2">
              <Spinner className="h-4 w-4 text-brand-600" />
            </div>
          ) : quote.isError ? (
            <Alert variant="error">{apiErrorMessage(quote.error)}</Alert>
          ) : quote.data ? (
            <>
              <Row
                label={`${usd(bike.price_per_day)} × ${quote.data.total_days} day${quote.data.total_days === 1 ? '' : 's'}`}
                value={usd(quote.data.rental_subtotal)}
              />
              <Row label="Protection" value={usd(quote.data.insurance_fee)} />
              <Row label="Total" value={usd(quote.data.total_price)} strong />
              <Row label="Security deposit (held)" value={usd(quote.data.deposit_amount)} muted />
              <p className="pt-1 text-xs text-subtle">Roadside assistance included.</p>
            </>
          ) : null}
        </div>
      )}

      <label className="mt-4 flex items-start gap-2 text-sm text-muted">
        <input
          type="checkbox"
          checked={terms}
          onChange={(e) => setTerms(e.target.checked)}
          className="mt-0.5 accent-brand-600"
        />
        I accept the rental terms and understand the deposit is held until the bike is returned.
      </label>

      {create.isError && (
        <div className="mt-3">
          <Alert variant="error">{apiErrorMessage(create.error)}</Alert>
        </div>
      )}

      <div className="mt-4">
        {!isAuthenticated ? (
          <Link to="/login" state={{ from: `/bikes/${bike.id}` }} className="block">
            <Button className="w-full">Log in to book</Button>
          </Link>
        ) : !user?.license_verified ? (
          <Link to="/verify-identity" className="block">
            <Button className="w-full">Verify license to book</Button>
          </Link>
        ) : (
          <Button
            className="w-full"
            disabled={!validRange || !terms || quote.isError}
            loading={create.isPending}
            onClick={() => create.mutate()}
          >
            Request to book
          </Button>
        )}
      </div>
    </Card>
  )
}
