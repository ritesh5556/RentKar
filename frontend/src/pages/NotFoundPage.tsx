import { Link } from 'react-router-dom'
import Container from '../components/ui/Container'

export default function NotFoundPage() {
  return (
    <Container className="py-24 text-center">
      <p className="text-sm font-semibold text-brand-700">404</p>
      <h1 className="mt-2 text-3xl font-bold text-ink">Page not found</h1>
      <p className="mt-2 text-muted">The page you're looking for doesn't exist.</p>
      <Link
        to="/"
        className="mt-6 inline-block font-semibold text-brand-700 hover:text-brand-800"
      >
        Go home
      </Link>
    </Container>
  )
}
