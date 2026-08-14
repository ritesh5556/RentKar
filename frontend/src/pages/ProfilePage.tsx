import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Mail, ShieldCheck } from 'lucide-react'
import Container from '../components/ui/Container'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import TextField from '../components/ui/TextField'
import Textarea from '../components/ui/Textarea'
import Button from '../components/ui/Button'
import Alert from '../components/ui/Alert'
import { updateProfile } from '../lib/users'
import { apiErrorMessage } from '../lib/errors'
import { useAuthStore } from '../store/authStore'

interface FormValues {
  full_name: string
  phone: string
  avatar_url: string
  date_of_birth: string
  bio: string
}

function VerifyBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <Badge tone={ok ? 'success' : 'neutral'}>
      {ok ? '✓' : '—'} {label}
    </Badge>
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
      const updated = await updateProfile({
        full_name: values.full_name,
        phone: values.phone || null,
        avatar_url: values.avatar_url || null,
        date_of_birth: values.date_of_birth || null,
        bio: values.bio || null,
      })
      setUser(updated)
      setStatus({ type: 'success', msg: 'Profile updated.' })
    } catch (e) {
      setStatus({ type: 'error', msg: apiErrorMessage(e, 'Could not update profile') })
    }
  }

  return (
    <Container className="max-w-3xl py-10">
      <h1 className="text-2xl font-bold text-ink">Your profile</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        <VerifyBadge ok={user.is_email_verified} label="Email verified" />
        <VerifyBadge ok={user.license_verified} label="License verified" />
        <VerifyBadge ok={user.id_verified} label="ID verified" />
      </div>

      {!user.is_email_verified && (
        <div className="mt-4">
          <Alert variant="info">
            Verify your email to list or book bikes. During development the verification link is
            printed in the backend logs.
          </Alert>
        </div>
      )}

      {!user.license_verified && (
        <Card className="mt-4 flex flex-col items-start justify-between gap-3 border-brand-200 bg-brand-50 p-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-brand-700" />
            <div>
              <p className="font-medium text-ink">Verify your license to book</p>
              <p className="text-sm text-muted">
                Riders must verify a driver's license before booking a motorcycle.
              </p>
            </div>
          </div>
          <Link to="/verify-identity">
            <Button size="sm">Verify now</Button>
          </Link>
        </Card>
      )}

      <Card className="mt-6 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {status && <Alert variant={status.type}>{status.msg}</Alert>}
          <TextField label="Full name" {...register('full_name')} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Phone" {...register('phone')} />
            <TextField label="Date of birth" type="date" {...register('date_of_birth')} />
          </div>
          <TextField label="Avatar URL" {...register('avatar_url')} />
          <Textarea label="Bio" rows={3} {...register('bio')} />
          <Button type="submit" loading={isSubmitting}>
            Save changes
          </Button>
        </form>
        <p className="mt-5 flex items-center gap-1.5 text-sm text-muted">
          <Mail className="h-4 w-4" /> {user.email}
        </p>
      </Card>
    </Container>
  )
}
