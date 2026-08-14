import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Container from '../components/ui/Container'
import Card from '../components/ui/Card'
import TextField from '../components/ui/TextField'
import Button from '../components/ui/Button'
import Alert from '../components/ui/Alert'
import { register as registerUser } from '../lib/auth'
import { apiErrorMessage } from '../lib/errors'

const schema = z.object({
  full_name: z.string().min(1, 'Required'),
  email: z.string().email('Enter a valid email'),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/(?=.*[A-Za-z])(?=.*\d)/, 'Include both letters and numbers'),
  phone: z.string().optional(),
  date_of_birth: z.string().optional(),
})
type Values = z.infer<typeof schema>

export default function RegisterPage() {
  const [serverError, setServerError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: Values) => {
    setServerError(null)
    try {
      await registerUser({
        full_name: values.full_name,
        email: values.email,
        password: values.password,
        phone: values.phone || undefined,
        date_of_birth: values.date_of_birth || undefined,
      })
      setDone(true)
    } catch (e) {
      setServerError(apiErrorMessage(e, 'Could not register'))
    }
  }

  if (done) {
    return (
      <Container className="py-16">
        <Card className="mx-auto max-w-md p-8 text-center">
          <h1 className="text-2xl font-bold text-ink">Almost there</h1>
          <div className="mt-4">
            <Alert variant="success">
              Registered! Check your email to verify your account. (Dev: the verification link is
              printed in the backend logs.)
            </Alert>
          </div>
          <Link
            to="/login"
            className="mt-6 inline-block text-sm font-semibold text-brand-700 hover:text-brand-800"
          >
            Go to log in
          </Link>
        </Card>
      </Container>
    )
  }

  return (
    <Container className="py-16">
      <Card className="mx-auto max-w-md p-8">
        <h1 className="text-2xl font-bold text-ink">Create your account</h1>
        <p className="mt-1 text-sm text-muted">List your bike or book your next ride.</p>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          {serverError && <Alert variant="error">{serverError}</Alert>}
          <TextField label="Full name" {...register('full_name')} error={errors.full_name?.message} />
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            {...register('email')}
            error={errors.email?.message}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="new-password"
            {...register('password')}
            error={errors.password?.message}
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Phone (optional)" {...register('phone')} error={errors.phone?.message} />
            <TextField
              label="Date of birth"
              type="date"
              {...register('date_of_birth')}
              error={errors.date_of_birth?.message}
            />
          </div>
          <Button type="submit" loading={isSubmitting} className="w-full">
            Sign up
          </Button>
        </form>
        <p className="mt-6 text-sm text-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-700 hover:text-brand-800">
            Log in
          </Link>
        </p>
      </Card>
    </Container>
  )
}
