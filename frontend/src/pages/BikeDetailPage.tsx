import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MapPin, Star } from 'lucide-react'
import Container from '../components/ui/Container'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import StarRating from '../components/ui/StarRating'
import CheckoutPanel from '../components/bookings/CheckoutPanel'
import { useBike, useBikeReviews } from '../hooks/useBikes'
import { categoryLabel, formatDate, imageUrl } from '../lib/format'
import { cn } from '../lib/cn'
import type { Bike, Review } from '../types'

function Gallery({ images, title }: { images: Bike['images']; title: string }) {
  const [active, setActive] = useState(0)
  if (!images.length) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center rounded-2xl bg-line-soft text-subtle">
        No photos yet
      </div>
    )
  }
  return (
    <div>
      <div className="aspect-[16/10] overflow-hidden rounded-2xl bg-line-soft">
        <img
          src={imageUrl(images[active].path)}
          alt={title}
          className="h-full w-full object-cover"
        />
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                'h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2',
                i === active ? 'border-brand-500' : 'border-transparent',
              )}
            >
              <img src={imageUrl(img.path)} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Specs({ bike }: { bike: Bike }) {
  const items: { label: string; value: string }[] = [
    { label: 'Make', value: bike.make },
    { label: 'Model', value: bike.model },
    { label: 'Year', value: String(bike.year) },
    { label: 'Category', value: categoryLabel(bike.category) },
  ]
  if (bike.engine_cc) items.push({ label: 'Engine', value: `${bike.engine_cc} cc` })
  if (bike.mileage != null) items.push({ label: 'Mileage', value: `${bike.mileage.toLocaleString()} mi` })
  if (bike.transmission) items.push({ label: 'Transmission', value: bike.transmission })
  return (
    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {items.map((s) => (
        <div key={s.label}>
          <dt className="text-xs text-subtle">{s.label}</dt>
          <dd className="text-sm font-medium text-ink">{s.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function Reviews({ items }: { items: Review[] }) {
  if (!items.length) return <p className="text-sm text-muted">No reviews yet.</p>
  return (
    <div className="space-y-4">
      {items.map((r) => (
        <div key={r.id} className="border-b border-line pb-4 last:border-0 last:pb-0">
          <div className="flex items-center justify-between">
            <span className="font-medium text-ink">{r.reviewer_name}</span>
            <StarRating value={r.rating} size={14} />
          </div>
          {r.comment && <p className="mt-1 text-sm text-muted">{r.comment}</p>}
          <p className="mt-1 text-xs text-subtle">{formatDate(r.created_at)}</p>
        </div>
      ))}
    </div>
  )
}

export default function BikeDetailPage() {
  const { id } = useParams()
  const bikeId = Number(id)
  const bike = useBike(bikeId)
  const reviews = useBikeReviews(bikeId)

  if (bike.isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-7 w-7 text-brand-600" />
      </div>
    )
  }
  if (bike.isError || !bike.data) {
    return (
      <Container className="py-24 text-center">
        <h1 className="text-2xl font-bold text-ink">Bike not found</h1>
        <Link to="/bikes" className="mt-4 inline-block font-semibold text-brand-700">
          Back to browse
        </Link>
      </Container>
    )
  }

  const b = bike.data
  return (
    <Container className="py-8">
      <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
        <div>
          <Gallery images={b.images} title={b.title} />

          <div className="mt-6">
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="brand">{categoryLabel(b.category)}</Badge>
              {b.avg_rating != null && (
                <span className="flex items-center gap-1 text-sm font-medium text-ink">
                  <Star className="h-4 w-4 fill-gold text-gold" />
                  {b.avg_rating.toFixed(1)} · {b.review_count} review{b.review_count === 1 ? '' : 's'}
                </span>
              )}
            </div>
            <h1 className="mt-3 text-3xl font-bold text-ink">{b.title}</h1>
            <p className="mt-1 flex items-center gap-1 text-muted">
              <MapPin className="h-4 w-4" /> {b.city}, {b.state}
            </p>
            <p className="mt-1 text-sm text-muted">Hosted by {b.owner.full_name}</p>
          </div>

          <Card className="mt-6 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-subtle">Specs</h2>
            <div className="mt-4">
              <Specs bike={b} />
            </div>
          </Card>

          {b.description && (
            <Card className="mt-6 p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-subtle">
                About this bike
              </h2>
              <p className="mt-3 whitespace-pre-line text-sm text-muted">{b.description}</p>
            </Card>
          )}

          {b.address && (
            <Card className="mt-6 p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-subtle">
                Pickup location
              </h2>
              <p className="mt-2 text-sm text-muted">
                {b.address}, {b.city}, {b.state}
              </p>
            </Card>
          )}

          <Card className="mt-6 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-subtle">Reviews</h2>
              {reviews.data && reviews.data.average != null && (
                <span className="flex items-center gap-1 text-sm text-ink">
                  <Star className="h-4 w-4 fill-gold text-gold" />
                  {reviews.data.average.toFixed(1)}
                </span>
              )}
            </div>
            <div className="mt-4">
              {reviews.isLoading ? (
                <Spinner className="h-5 w-5 text-brand-600" />
              ) : (
                <Reviews items={reviews.data?.items ?? []} />
              )}
            </div>
          </Card>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <CheckoutPanel bike={b} />
        </aside>
      </div>
    </Container>
  )
}
