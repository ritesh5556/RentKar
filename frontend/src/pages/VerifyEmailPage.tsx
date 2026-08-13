import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Alert from '../components/ui/Alert'
import { verifyEmail } from '../lib/auth'
import { apiErrorMessage } from '../lib/errors'

type Status = 'verifying' | 'success' | 'error'

export default function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [status, setStatus] = useState<Status>('verifying')
  const [message, setMessage] = useState('')
  const ran = useRef(false)

  useEffect(() => {
    // Guard against React StrictMode's double-invoke consuming the single-use token twice.
    if (ran.current) return
    ran.current = true
    if (!token) {
      setStatus('error')
      setMessage('Missing verification token.')
      return
    }
    verifyEmail(token)
      .then(() => {
        setStatus('success')
        setMessage('Your email is verified. You can now list and book bikes.')
      })
      .catch((e) => {
        setStatus('error')
        setMessage(apiErrorMessage(e, 'Verification failed'))
      })
  }, [token])

  return (
    <div className="mx-auto max-w-md py-8 text-center">
      <h1 className="mb-4 text-2xl font-bold">Email verification</h1>
      {status === 'verifying' && <p className="text-gray-500">Verifying…</p>}
      {status === 'success' && <Alert variant="success">{message}</Alert>}
      {status === 'error' && <Alert variant="error">{message}</Alert>}
      <p className="mt-6 text-sm">
        <Link to="/login" className="text-emerald-600 hover:underline">
          Continue to log in
        </Link>
      </p>
    </div>
  )
}
