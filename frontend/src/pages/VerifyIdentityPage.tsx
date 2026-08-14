import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { ShieldCheck } from 'lucide-react'
import Container from '../components/ui/Container'
import Card from '../components/ui/Card'
import TextField from '../components/ui/TextField'
import Button from '../components/ui/Button'
import Alert from '../components/ui/Alert'
import { verifyIdentity } from '../lib/users'
import { apiErrorMessage } from '../lib/errors'
import { useAuthStore } from '../store/authStore'

interface FormValues {
  driver_license_number: string
  date_of_birth: string
}

export default function VerifyIdentityPage() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const navigate = useNavigate()
  const [done, setDone] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { driver_license_number: '', date_of_birth: user?.date_of_birth ?? '' },
  })

  const mut = useMutation({
    mutationFn: (v: FormValues) =>
      verifyIdentity({
        driver_license_number: v.driver_license_number,
        date_of_birth: v.date_of_birth || undefined,
      }),
    onSuccess: (updated) => {
      setUser(updated)
      setDone(true)
    },
  })

  if (user?.license_verified && !done) {
    return (
      <Container className="max-w-md py-16">
        <Card className="p-8 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-success" />
          <h1 className="mt-3 text-xl font-bold text-ink">You're verified</h1>
          <p className="mt-1 text-sm text-muted">Your license is verified — you're ready to book.</p>
          <Link to="/bikes" className="mt-5 inline-block">
            <Button>Browse bikes</Button>
          </Link>
        </Card>
      </Container>
    )
  }

  return (
    <Container className="max-w-md py-14">
      <Card className="p-8">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-ink">Rider verification</h1>
        <p className="mt-1 text-sm text-muted">
          Riders must verify a driver's license before booking a motorcycle.
        </p>
        <Alert variant="info">
          <span className="text-xs">
            Demo: this is a mock check that stands in for a real KYC provider (Persona / Veriff /
            Checkr). No data is validated.
          </span>
        </Alert>

        {done ? (
          <div className="mt-4">
            <Alert variant="success">License verified — you can now book rides.</Alert>
            <Button className="mt-4 w-full" onClick={() => navigate(-1)}>
              Continue
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit((v) => mut.mutate(v))} className="mt-4 space-y-4">
            {mut.isError && <Alert variant="error">{apiErrorMessage(mut.error)}</Alert>}
            <TextField
              label="Driver's license number"
              placeholder="D1234567"
              {...register('driver_license_number', {
                required: 'Required',
                minLength: { value: 3, message: 'Enter your license number' },
              })}
              error={errors.driver_license_number?.message}
            />
            <TextField
              label="Date of birth"
              type="date"
              {...register('date_of_birth', { required: 'Required' })}
              error={errors.date_of_birth?.message}
              hint="You must be at least 18 to book"
            />
            <Button type="submit" className="w-full" loading={mut.isPending}>
              Verify my license
            </Button>
          </form>
        )}
      </Card>
    </Container>
  )
}
