import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bike, ChevronDown, Inbox, LogOut, Plus, Ticket, User as UserIcon } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { logout } from '../../lib/auth'
import type { User } from '../../types'

function initialsOf(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function UserMenu({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-white/15 py-1 pl-1 pr-2 hover:bg-white/5"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
          {initialsOf(user.full_name)}
        </span>
        <ChevronDown className="h-4 w-4 text-night-muted" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={close} />
          <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-surface py-1 text-ink shadow-pop">
            <div className="border-b border-line px-4 py-3">
              <p className="text-sm font-semibold">{user.full_name}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
            </div>
            <MenuLink to="/my-bikes" icon={<Bike className="h-4 w-4" />} onClick={close}>
              My bikes
            </MenuLink>
            <MenuLink to="/trips" icon={<Ticket className="h-4 w-4" />} onClick={close}>
              My trips
            </MenuLink>
            <MenuLink to="/bookings/incoming" icon={<Inbox className="h-4 w-4" />} onClick={close}>
              Booking requests
            </MenuLink>
            <MenuLink to="/profile" icon={<UserIcon className="h-4 w-4" />} onClick={close}>
              Profile
            </MenuLink>
            <button
              type="button"
              onClick={() => {
                close()
                onLogout()
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-line-soft"
            >
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function MenuLink({
  to,
  icon,
  onClick,
  children,
}: {
  to: string
  icon: React.ReactNode
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-line-soft"
    >
      {icon}
      {children}
    </Link>
  )
}

export default function Navbar() {
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-night text-night-fg">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600">
            <Bike className="h-5 w-5 text-white" />
          </span>
          RenkKar
        </Link>

        <div className="flex items-center gap-2">
          <Link
            to="/bikes"
            className="hidden rounded-lg px-3 py-2 text-sm text-night-muted hover:text-night-fg sm:inline"
          >
            Browse
          </Link>
          {isAuthenticated && user ? (
            <>
              <Link
                to="/bikes/new"
                className="hidden items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/15 sm:inline-flex"
              >
                <Plus className="h-4 w-4" /> List your bike
              </Link>
              <UserMenu user={user} onLogout={handleLogout} />
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-lg px-3 py-2 text-sm text-night-muted hover:text-night-fg"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
