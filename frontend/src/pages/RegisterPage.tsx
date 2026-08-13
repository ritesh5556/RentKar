import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
      <div className="mx-auto max-w-sm py-8 text-center">
        <h1 className="mb-4 text-2xl font-bold">Almost there</h1>
        <Alert variant="success">
          Registered! Check your email to verify your account. (Dev: the verification link is
          printed in the backend logs.)
        </Alert>
        <p className="mt-4 text-sm">
          <Link to="/login" className="text-emerald-600 hover:underline">
            Go to log in
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-2xl font-bold">Create your account</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
        <TextField label="Phone (optional)" {...register('phone')} error={errors.phone?.message} />
        <TextField
          label="Date of birth (optional)"
          type="date"
          {...register('date_of_birth')}
          error={errors.date_of_birth?.message}
        />
        <Button type="submit" loading={isSubmitting} className="w-full">
          Sign up
        </Button>
      </form>
      <p className="mt-4 text-sm text-gray-600">
        Already have an account?{' '}
        <Link to="/login" className="text-emerald-600 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  )
}
