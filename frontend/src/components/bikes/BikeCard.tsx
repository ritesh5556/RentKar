import { Link } from 'react-router-dom'
import { MapPin, Star } from 'lucide-react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import { categoryLabel, imageUrl, usd } from '../../lib/format'
import type { BikeSummary } from '../../types'

export default function BikeCard({ bike }: { bike: BikeSummary }) {
  return (
    <Link to={`/bikes/${bike.id}`} className="group block">
      <Card className="overflow-hidden transition group-hover:-translate-y-0.5 group-hover:shadow-pop">
        <div className="relative aspect-[4/3] bg-line-soft">
          {bike.primary_image ? (
            <img
              src={imageUrl(bike.primary_image)}
              alt={bike.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-subtle">
              No photo yet
            </div>
          )}
          <div className="absolute left-3 top-3">
            <Badge tone="brand">{categoryLabel(bike.category)}</Badge>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 font-semibold text-ink">{bike.title}</h3>
            {bike.avg_rating != null && (
              <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-ink">
                <Star className="h-4 w-4 fill-gold text-gold" />
                {bike.avg_rating.toFixed(1)}
              </span>
            )}
          </div>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted">
            <MapPin className="h-3.5 w-3.5" />
            {bike.city}, {bike.state}
          </p>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-lg font-bold text-ink">{usd(bike.price_per_day)}</span>
            <span className="text-sm text-muted">/ day</span>
          </div>
        </div>
      </Card>
    </Link>
  )
}
