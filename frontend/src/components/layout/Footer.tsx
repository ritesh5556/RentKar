import { Link } from 'react-router-dom'
import { Bike } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 font-bold text-ink">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600">
              <Bike className="h-5 w-5 text-white" />
            </span>
            RenkKar
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted">
            Rent motorcycles from people near you. List your bike and earn, or find the perfect ride
            by the day.
          </p>
        </div>
        <FooterCol
          title="Explore"
          links={[
            { to: '/bikes', label: 'Browse bikes' },
            { to: '/bikes/new', label: 'List your bike' },
          ]}
        />
        <FooterCol
          title="Account"
          links={[
            { to: '/trips', label: 'My trips' },
            { to: '/my-bikes', label: 'My bikes' },
            { to: '/profile', label: 'Profile' },
          ]}
        />
        <FooterCol
          title="Trust & safety"
          links={[
            { to: '/verify-identity', label: 'Rider verification' },
            { to: '/bikes', label: 'Protection plans' },
          ]}
        />
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-subtle sm:flex-row">
          <span>© {new Date().getFullYear()} RenkKar</span>
          <span>Demo build — mock payments &amp; verification.</span>
        </div>
      </div>
    </footer>
  )
}

function FooterCol({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-ink">{title}</h4>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map((link) => (
          <li key={link.to + link.label}>
            <Link to={link.to} className="text-muted hover:text-brand-700">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
