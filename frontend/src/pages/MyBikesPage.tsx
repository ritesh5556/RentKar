import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Bike as BikeIcon, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import Container from '../components/ui/Container'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import { useMyBikes } from '../hooks/useBikes'
import { deleteBike } from '../lib/bikes'
import { categoryLabel, imageUrl, usd } from '../lib/format'

export default function MyBikesPage() {
  const { data, isLoading } = useMyBikes()
  const qc = useQueryClient()
  const del = useMutation({
    mutationFn: (id: number) => deleteBike(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-bikes'] }),
  })

  const onDelete = (id: number) => {
    if (window.confirm('Delete this listing? This cannot be undone.')) del.mutate(id)
  }

  return (
    <Container className="py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">My bikes</h1>
          <p className="text-sm text-muted">Manage your listings.</p>
        </div>
        <Link to="/bikes/new">
          <Button leftIcon={<Plus className="h-4 w-4" />}>List a bike</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-7 w-7 text-brand-600" />
        </div>
      ) : !data?.length ? (
        <EmptyState
          icon={<BikeIcon className="h-8 w-8" />}
          title="No listings yet"
          description="List your first bike to start earning."
          action={
            <Link to="/bikes/new">
              <Button>List a bike</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {data.map((b) => (
            <Card key={b.id} className="flex items-center gap-4 p-3">
              <Link
                to={`/bikes/${b.id}`}
                className="h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-line-soft"
              >
                {b.primary_image ? (
                  <img src={imageUrl(b.primary_image)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-subtle">
                    No photo
                  </div>
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    to={`/bikes/${b.id}`}
                    className="truncate font-semibold text-ink hover:text-brand-700"
                  >
                    {b.title}
                  </Link>
                  <Badge tone={b.status === 'active' ? 'success' : 'neutral'}>{b.status}</Badge>
                </div>
                <p className="text-sm text-muted">
                  {categoryLabel(b.category)} · {b.city}, {b.state}
                </p>
                <p className="mt-0.5 flex items-center gap-2 text-sm font-medium text-ink">
                  {usd(b.price_per_day)}/day
                  {b.avg_rating != null && (
                    <span className="inline-flex items-center gap-0.5 font-normal text-muted">
                      <Star className="h-3.5 w-3.5 fill-gold text-gold" />
                      {b.avg_rating.toFixed(1)}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link to={`/bikes/${b.id}/edit`}>
                  <Button variant="secondary" size="sm" leftIcon={<Pencil className="h-4 w-4" />}>
                    Edit
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(b.id)}
                  className="text-danger"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Container>
  )
}
