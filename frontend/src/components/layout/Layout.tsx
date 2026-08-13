import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

export default function Layout() {
  return (
    <div className="flex min-h-full flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-gray-200 py-6 text-center text-sm text-gray-500">
        RenkKar — rent bikes from people near you
      </footer>
    </div>
  )
}
