import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-2xl font-bold">Log in</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
      <p className="mt-4 text-sm text-gray-600">
        No account?{' '}
        <Link to="/register" className="text-emerald-600 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  )
}
