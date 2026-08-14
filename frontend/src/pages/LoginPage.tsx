import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Container from '../components/ui/Container'
import Card from '../components/ui/Card'
import TextField from '../components/ui/TextField'
import Button from '../components/ui/Button'
import Alert from '../components/ui/Alert'
import { login } from '../lib/auth'
import { apiErrorMessage } from '../lib/errors'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
})
type Values = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation() as { state?: { from?: string } }
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: Values) => {
    setServerError(null)
    try {
      await login(values.email, values.password)
      navigate(location.state?.from ?? '/', { replace: true })
    } catch (e) {
      setServerError(apiErrorMessage(e, 'Could not log in'))
    }
  }

  return (
    <Container className="py-16">
      <Card className="mx-auto max-w-md p-8">
        <h1 className="text-2xl font-bold text-ink">Welcome back</h1>
        <p className="mt-1 text-sm text-muted">Log in to book rides and manage your bikes.</p>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          {serverError && <Alert variant="error">{serverError}</Alert>}
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
            autoComplete="current-password"
            {...register('password')}
            error={errors.password?.message}
          />
          <Button type="submit" loading={isSubmitting} className="w-full">
            Log in
          </Button>
        </form>
        <p className="mt-6 text-sm text-muted">
          No account?{' '}
          <Link to="/register" className="font-semibold text-brand-700 hover:text-brand-800">
            Sign up
          </Link>
        </p>
      </Card>
    </Container>
  )
}
