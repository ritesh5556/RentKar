import { useSearchParams } from 'react-router-dom'
import { Bike as BikeIcon } from 'lucide-react'
import Container from '../components/ui/Container'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import Select from '../components/ui/Select'
import Pagination from '../components/ui/Pagination'
import BikeCard from '../components/bikes/BikeCard'
import SearchFilters from '../components/bikes/SearchFilters'
import { useBikes } from '../hooks/useBikes'
import type { BikeSearchParams } from '../lib/bikes'

const PAGE_SIZE = 12
type Sort = 'newest' | 'price_asc' | 'price_desc'
type FilterPatch = Record<string, string | undefined>

export default function BikeListPage() {
  const [sp, setSp] = useSearchParams()
  const page = Number(sp.get('page')) || 1

  const params: BikeSearchParams = {
    q: sp.get('q') ?? undefined,
    city: sp.get('city') ?? undefined,
    state: sp.get('state') ?? undefined,
    category: sp.get('category') ?? undefined,
    min_price: sp.get('min_price') ?? undefined,
    max_price: sp.get('max_price') ?? undefined,
    sort: (sp.get('sort') as Sort) ?? 'newest',
    start_date: sp.get('start_date') ?? undefined,
    end_date: sp.get('end_date') ?? undefined,
    page,
    page_size: PAGE_SIZE,
  }

  const { data, isLoading } = useBikes(params)

  const update = (patch: FilterPatch, resetPage = true) => {
    const next = new URLSearchParams(sp)
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    if (resetPage) next.delete('page')
    setSp(next)
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1

  return (
    <Container className="py-8">
      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <SearchFilters
            params={params}
            onApply={(patch) => update(patch)}
            onReset={() => setSp(new URLSearchParams())}
          />
        </aside>

        <section>
          <div className="mb-5 flex items-center justify-between gap-4">
            <p className="text-sm text-muted">
              {data ? `${data.total} bike${data.total === 1 ? '' : 's'} available` : 'Searching…'}
            </p>
            <div className="w-48">
              <Select
                value={params.sort}
                onChange={(e) => update({ sort: e.target.value }, false)}
                aria-label="Sort"
              >
                <option value="newest">Newest</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-24">
              <Spinner className="h-7 w-7 text-brand-600" />
            </div>
          ) : data && data.items.length > 0 ? (
            <>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {data.items.map((bike) => (
                  <BikeCard key={bike.id} bike={bike} />
                ))}
              </div>
              {totalPages > 1 && (
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onChange={(p) => update({ page: String(p) }, false)}
                />
              )}
            </>
          ) : (
            <EmptyState
              icon={<BikeIcon className="h-8 w-8" />}
              title="No bikes match your search"
              description="Try widening your filters or clearing the date range."
            />
          )}
        </section>
      </div>
    </Container>
  )
}
