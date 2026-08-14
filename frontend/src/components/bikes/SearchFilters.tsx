import { useEffect, useState, type FormEvent } from 'react'
import Card from '../ui/Card'
import TextField from '../ui/TextField'
import Select from '../ui/Select'
import Button from '../ui/Button'
import { CATEGORY_OPTIONS } from '../../lib/format'
import type { BikeSearchParams } from '../../lib/bikes'

type FilterPatch = Record<string, string | undefined>

interface Props {
  params: BikeSearchParams
  onApply: (patch: FilterPatch) => void
  onReset: () => void
}

const EMPTY = {
  q: '',
  city: '',
  state: '',
  category: '',
  min_price: '',
  max_price: '',
  start_date: '',
  end_date: '',
}

const clean = (v: string) => (v.trim() ? v.trim() : undefined)

export default function SearchFilters({ params, onApply, onReset }: Props) {
  const [local, setLocal] = useState({ ...EMPTY })

  useEffect(() => {
    setLocal({
      q: params.q ?? '',
      city: params.city ?? '',
      state: params.state ?? '',
      category: params.category ?? '',
      min_price: params.min_price ?? '',
      max_price: params.max_price ?? '',
      start_date: params.start_date ?? '',
      end_date: params.end_date ?? '',
    })
  }, [params])

  const set = (key: keyof typeof EMPTY, value: string) =>
    setLocal((s) => ({ ...s, [key]: value }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onApply({
      q: clean(local.q),
      city: clean(local.city),
      state: clean(local.state),
      category: clean(local.category),
      min_price: clean(local.min_price),
      max_price: clean(local.max_price),
      start_date: clean(local.start_date),
      end_date: clean(local.end_date),
    })
  }

  return (
    <Card className="p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-subtle">Filters</h2>
      <form onSubmit={submit} className="space-y-4">
        <TextField
          label="Keyword"
          placeholder="Ninja, Harley…"
          value={local.q}
          onChange={(e) => set('q', e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="City" value={local.city} onChange={(e) => set('city', e.target.value)} />
          <TextField
            label="State"
            value={local.state}
            onChange={(e) => set('state', e.target.value)}
          />
        </div>
        <Select
          label="Category"
          value={local.category}
          onChange={(e) => set('category', e.target.value)}
        >
          <option value="">Any category</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Min $/day"
            type="number"
            min="0"
            value={local.min_price}
            onChange={(e) => set('min_price', e.target.value)}
          />
          <TextField
            label="Max $/day"
            type="number"
            min="0"
            value={local.max_price}
            onChange={(e) => set('max_price', e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="From"
            type="date"
            value={local.start_date}
            onChange={(e) => set('start_date', e.target.value)}
          />
          <TextField
            label="To"
            type="date"
            value={local.end_date}
            onChange={(e) => set('end_date', e.target.value)}
          />
        </div>
        <div className="flex gap-2 pt-1">
          <Button type="submit" className="flex-1">
            Apply
          </Button>
          <Button type="button" variant="secondary" onClick={onReset}>
            Reset
          </Button>
        </div>
      </form>
    </Card>
  )
}
