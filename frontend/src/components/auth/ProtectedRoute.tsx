import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function ProtectedRoute() {
  const { isAuthenticated, bootstrapped } = useAuth()
  const location = useLocation()

  if (!bootstrapped) {
    return <div className="py-16 text-center text-gray-500">Loading…</div>
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}
