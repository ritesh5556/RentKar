import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-3xl font-bold">404</h1>
      <p className="mt-2 text-gray-600">This page could not be found.</p>
      <Link to="/" className="mt-4 inline-block font-medium text-emerald-600 hover:underline">
        Go home
      </Link>
    </div>
  )
}
