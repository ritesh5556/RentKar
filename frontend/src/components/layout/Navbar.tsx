import { Link } from 'react-router-dom'
import { Bike } from 'lucide-react'

export default function Navbar() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-emerald-600">
          <Bike className="h-6 w-6" />
          RenkKar
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link to="/bikes" className="text-gray-600 hover:text-emerald-600">
            Browse bikes
          </Link>
          <Link to="/login" className="text-gray-600 hover:text-emerald-600">
            Log in
          </Link>
          <Link
            to="/register"
            className="rounded-md bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-700"
          >
            Sign up
          </Link>
        </div>
      </nav>
    </header>
  )
}
