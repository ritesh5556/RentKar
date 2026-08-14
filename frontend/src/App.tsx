import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/auth/ProtectedRoute'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import BikeListPage from './pages/BikeListPage'
import BikeDetailPage from './pages/BikeDetailPage'
import BikeFormPage from './pages/BikeFormPage'
import MyBikesPage from './pages/MyBikesPage'
import MyBookingsPage from './pages/MyBookingsPage'
import IncomingBookingsPage from './pages/IncomingBookingsPage'
import VerifyIdentityPage from './pages/VerifyIdentityPage'
import ProfilePage from './pages/ProfilePage'
import NotFoundPage from './pages/NotFoundPage'
import { bootstrapSession } from './lib/auth'

export default function App() {
  useEffect(() => {
    void bootstrapSession()
  }, [])

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/bikes" element={<BikeListPage />} />
        <Route path="/bikes/:id" element={<BikeDetailPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/bikes/new" element={<BikeFormPage />} />
          <Route path="/bikes/:id/edit" element={<BikeFormPage />} />
          <Route path="/my-bikes" element={<MyBikesPage />} />
          <Route path="/trips" element={<MyBookingsPage />} />
          <Route path="/bookings/incoming" element={<IncomingBookingsPage />} />
          <Route path="/verify-identity" element={<VerifyIdentityPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
