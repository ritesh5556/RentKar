import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Container from '../components/ui/Container'
import Card from '../components/ui/Card'
import TextField from '../components/ui/TextField'
import Textarea from '../components/ui/Textarea'
import Select from '../components/ui/Select'
import Button from '../components/ui/Button'
import Alert from '../components/ui/Alert'
import Spinner from '../components/ui/Spinner'
import ImageUploader from '../components/bikes/ImageUploader'
import { useBike } from '../hooks/useBikes'
import { createBike, updateBike, type BikeInput } from '../lib/bikes'
import { apiErrorMessage } from '../lib/errors'
import { CATEGORY_OPTIONS } from '../lib/format'
import type { Bike } from '../types'

interface FormValues {
  title: string
  description?: string
  make: string
  model: string
  year: number
  category: string
  engine_cc?: number
  mileage?: number
  transmission?: string
  price_per_day: string
  security_deposit: string
  city: string
  state: string
  address?: string
  status: string
}

const MONEY = /^\d+(\.\d{1,2})?$/
const num = (v?: number) => (v == null || Number.isNaN(v) ? null : v)

export default function BikeFormPage() {
  const { id } = useParams()
  const editing = Boolean(id)
  const bikeId = Number(id)
  const existing = useBike(editing ? bikeId : -1)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [saved, setSaved] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { status: 'active', category: 'sport', security_deposit: '500' },
  })

  useEffect(() => {
    if (editing && existing.data) {
      const b = existing.data
      reset({
        title: b.title,
        description: b.description ?? '',
        make: b.make,
        model: b.model,
        year: b.year,
        category: b.category,
        engine_cc: b.engine_cc ?? undefined,
        mileage: b.mileage ?? undefined,
        transmission: b.transmission ?? '',
        price_per_day: b.price_per_day,
        security_deposit: b.security_deposit,
        city: b.city,
        state: b.state,
        address: b.address ?? '',
        status: b.status,
      })
    }
  }, [editing, existing.data, reset])

  const save = useMutation({
    mutationFn: (payload: BikeInput) =>
      editing ? updateBike(bikeId, payload) : createBike(payload),
    onSuccess: (bike) => {
      qc.invalidateQueries({ queryKey: ['my-bikes'] })
      qc.setQueryData(['bike', bike.id], bike)
      if (editing) {
        setSaved(true)
      } else {
        navigate(`/bikes/${bike.id}/edit`, { replace: true })
      }
    },
  })

  const onSubmit = (values: FormValues) => {
    setSaved(false)
    save.mutate({
      title: values.title,
      description: values.description || null,
      make: values.make,
      model: values.model,
      year: values.year,
      category: values.category,
      engine_cc: num(values.engine_cc),
      mileage: num(values.mileage),
      transmission: values.transmission || null,
      price_per_day: values.price_per_day,
      security_deposit: values.security_deposit,
      city: values.city,
      state: values.state,
      address: values.address || null,
      status: values.status,
    })
  }

  if (editing && existing.isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-7 w-7 text-brand-600" />
      </div>
    )
  }
  if (editing && existing.data && !existing.data.is_owner) {
    return (
      <Container className="py-24 text-center">
        <h1 className="text-2xl font-bold text-ink">You can't edit this listing</h1>
      </Container>
    )
  }

  const bike: Bike | undefined = editing ? existing.data : undefined

  return (
    <Container className="max-w-3xl py-10">
      <h1 className="text-2xl font-bold text-ink">{editing ? 'Edit listing' : 'List your bike'}</h1>
      <p className="mt-1 text-sm text-muted">
        Motorcycles, scooters, and e-bikes welcome. Prices are in USD.
      </p>

      <Card className="mt-6 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {save.isError && <Alert variant="error">{apiErrorMessage(save.error)}</Alert>}
          {saved && <Alert variant="success">Listing saved.</Alert>}

          <TextField
            label="Listing title"
            placeholder="2021 Kawasaki Ninja 400"
            {...register('title', { required: 'Required', minLength: { value: 3, message: 'Min 3 characters' } })}
            error={errors.title?.message}
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <TextField label="Make" {...register('make', { required: 'Required' })} error={errors.make?.message} />
            <TextField label="Model" {...register('model', { required: 'Required' })} error={errors.model?.message} />
            <TextField
              label="Year"
              type="number"
              {...register('year', {
                required: 'Required',
                valueAsNumber: true,
                validate: (v) => (!Number.isNaN(v) && v >= 1900 && v <= 2100) || 'Enter a valid year',
              })}
              error={errors.year?.message}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Select label="Category" {...register('category', { required: true })}>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
            <TextField
              label="Engine (cc)"
              type="number"
              {...register('engine_cc', { valueAsNumber: true })}
              hint="Leave blank for electric"
            />
            <TextField label="Mileage (mi)" type="number" {...register('mileage', { valueAsNumber: true })} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Select label="Transmission" {...register('transmission')}>
              <option value="">—</option>
              <option value="manual">Manual</option>
              <option value="automatic">Automatic</option>
            </Select>
            <TextField
              label="Price / day (USD)"
              placeholder="45.00"
              {...register('price_per_day', {
                required: 'Required',
                pattern: { value: MONEY, message: 'e.g. 45.00' },
              })}
              error={errors.price_per_day?.message}
            />
            <TextField
              label="Security deposit (USD)"
              placeholder="500.00"
              {...register('security_deposit', {
                required: 'Required',
                pattern: { value: MONEY, message: 'e.g. 500.00' },
              })}
              error={errors.security_deposit?.message}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <TextField label="City" {...register('city', { required: 'Required' })} error={errors.city?.message} />
            <TextField
              label="State"
              placeholder="TX"
              {...register('state', { required: 'Required' })}
              error={errors.state?.message}
            />
            <Select label="Status" {...register('status')}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>

          <TextField
            label="Pickup address (private)"
            hint="Shown to renters only after a booking is confirmed"
            {...register('address')}
          />

          <Textarea
            label="Description"
            rows={4}
            placeholder="Tell renters about the bike, its condition, and pickup details…"
            {...register('description')}
          />

          <Button type="submit" loading={isSubmitting || save.isPending}>
            {editing ? 'Save changes' : 'Create listing'}
          </Button>
        </form>
      </Card>

      {editing && bike && (
        <Card className="mt-6 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-subtle">Photos</h2>
          <div className="mt-4">
            <ImageUploader bike={bike} />
          </div>
        </Card>
      )}
    </Container>
  )
}
