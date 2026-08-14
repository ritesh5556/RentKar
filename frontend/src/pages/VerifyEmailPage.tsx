import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Container from '../components/ui/Container'
import Card from '../components/ui/Card'
import Alert from '../components/ui/Alert'
import Spinner from '../components/ui/Spinner'
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
    <Container className="py-16">
      <Card className="mx-auto max-w-md p-8 text-center">
        <h1 className="text-2xl font-bold text-ink">Email verification</h1>
        <div className="mt-5">
          {status === 'verifying' && (
            <div className="flex justify-center py-4">
              <Spinner className="h-6 w-6 text-brand-600" />
            </div>
          )}
          {status === 'success' && <Alert variant="success">{message}</Alert>}
          {status === 'error' && <Alert variant="error">{message}</Alert>}
        </div>
        <Link
          to="/login"
          className="mt-6 inline-block text-sm font-semibold text-brand-700 hover:text-brand-800"
        >
          Continue to log in
        </Link>
      </Card>
    </Container>
  )
}
