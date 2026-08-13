import { useState } from 'react'
import { useForm } from 'react-hook-form'
import TextField from '../components/ui/TextField'
import Button from '../components/ui/Button'
import Alert from '../components/ui/Alert'
import { api } from '../lib/api'
import { apiErrorMessage } from '../lib/errors'
import { useAuthStore } from '../store/authStore'
import type { User } from '../types'

interface FormValues {
  full_name: string
  phone: string
  avatar_url: string
  date_of_birth: string
  bio: string
}

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={
        ok
          ? 'rounded-full bg-emerald-100 px-2 py-1 text-emerald-700'
          : 'rounded-full bg-gray-100 px-2 py-1 text-gray-500'
      }
    >
      {ok ? '✓' : '—'} {label}
    </span>
  )
}

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      full_name: user?.full_name ?? '',
      phone: user?.phone ?? '',
      avatar_url: user?.avatar_url ?? '',
      date_of_birth: user?.date_of_birth ?? '',
      bio: user?.bio ?? '',
    },
  })

  if (!user) return null

  const onSubmit = async (values: FormValues) => {
    setStatus(null)
    try {
      const { data } = await api.patch<User>('/users/me', {
        full_name: values.full_name,
        phone: values.phone || null,
        avatar_url: values.avatar_url || null,
        date_of_birth: values.date_of_birth || null,
        bio: values.bio || null,
      })
      setUser(data)
      setStatus({ type: 'success', msg: 'Profile updated.' })
    } catch (e) {
      setStatus({ type: 'error', msg: apiErrorMessage(e, 'Could not update profile') })
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-2 text-2xl font-bold">Your profile</h1>
      <div className="mb-6 flex flex-wrap gap-2 text-xs">
        <Badge ok={user.is_email_verified} label="Email verified" />
        <Badge ok={user.id_verified} label="ID verified" />
        <Badge ok={user.license_verified} label="License verified" />
      </div>

      {!user.is_email_verified && (
        <div className="mb-4">
          <Alert variant="info">
            Verify your email to list or book bikes. During development the verification link is
            printed in the backend logs.
          </Alert>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {status && <Alert variant={status.type}>{status.msg}</Alert>}
        <TextField label="Full name" {...register('full_name')} />
        <TextField label="Phone" {...register('phone')} />
        <TextField label="Avatar URL" {...register('avatar_url')} />
        <TextField label="Date of birth" type="date" {...register('date_of_birth')} />
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Bio</span>
          <textarea
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            rows={3}
            {...register('bio')}
          />
        </label>
        <Button type="submit" loading={isSubmitting}>
          Save changes
        </Button>
      </form>

      <p className="mt-6 text-sm text-gray-500">Signed in as {user.email}</p>
    </div>
  )
}
