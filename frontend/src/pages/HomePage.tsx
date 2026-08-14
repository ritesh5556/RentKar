import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BadgeCheck, LifeBuoy, Search, ShieldCheck } from 'lucide-react'
import Container from '../components/ui/Container'
import Spinner from '../components/ui/Spinner'
import BikeCard from '../components/bikes/BikeCard'
import { useBikes } from '../hooks/useBikes'
import { CATEGORY_OPTIONS } from '../lib/format'

export default function HomePage() {
  const navigate = useNavigate()
  const [city, setCity] = useState('')
  const featured = useBikes({ sort: 'newest', page_size: 8 })

  const onSearch = (e: FormEvent) => {
    e.preventDefault()
    navigate(city.trim() ? `/bikes?city=${encodeURIComponent(city.trim())}` : '/bikes')
  }

  return (
    <>
      <section className="relative overflow-hidden bg-night text-night-fg">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-600/30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-brand-500/10 blur-3xl"
        />
        <Container className="relative py-20 sm:py-28">
          <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-night-muted">
            The peer-to-peer motorcycle marketplace
          </span>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
            Rent the ride you want, from riders near you
          </h1>
          <p className="mt-4 max-w-xl text-lg text-night-muted">
            Cruisers, sport bikes, adventure and more — booked by the day, with rider screening,
            insurance and roadside assistance built in.
          </p>
          <form
            onSubmit={onSearch}
            className="mt-8 flex max-w-md items-center gap-2 rounded-xl bg-surface p-2 shadow-pop"
          >
            <Search className="ml-2 h-5 w-5 text-subtle" />
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Search by city (e.g. Austin)"
              className="flex-1 bg-transparent px-1 text-ink outline-none placeholder:text-subtle"
            />
            <button
              type="submit"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Find rides
            </button>
          </form>
        </Container>
      </section>

      <Container className="py-10">
        <div className="flex flex-wrap gap-2">
          {CATEGORY_OPTIONS.map((c) => (
            <Link
              key={c.value}
              to={`/bikes?category=${c.value}`}
              className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink transition hover:border-brand-300 hover:bg-brand-50"
            >
              {c.label}
            </Link>
          ))}
        </div>
      </Container>

      <Container className="pb-4">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="text-2xl font-bold text-ink">Recently listed</h2>
          <Link
            to="/bikes"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {featured.isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-6 w-6 text-brand-600" />
          </div>
        ) : featured.data && featured.data.items.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.data.items.map((bike) => (
              <BikeCard key={bike.id} bike={bike} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-line bg-surface px-4 py-12 text-center text-muted">
            No bikes listed yet — be the first to{' '}
            <Link to="/bikes/new" className="font-semibold text-brand-700">
              list yours
            </Link>
            .
          </p>
        )}
      </Container>

      <section className="mt-10 border-y border-line bg-surface">
        <Container className="py-14">
          <h2 className="text-2xl font-bold text-ink">How it works</h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            <Step n="1" title="Find & book">
              Search by city and dates, pick a protection plan, and request your ride.
            </Step>
            <Step n="2" title="Get verified">
              Verify your license once. The owner approves and you pay securely.
            </Step>
            <Step n="3" title="Ride & review">
              Enjoy the ride with roadside assistance, then leave a review.
            </Step>
          </div>
        </Container>
      </section>

      <Container className="py-14">
        <div className="grid gap-6 sm:grid-cols-3">
          <Trust icon={<ShieldCheck className="h-6 w-6" />} title="Rider screening">
            Every renter verifies their driver's license before booking a motorized bike.
          </Trust>
          <Trust icon={<BadgeCheck className="h-6 w-6" />} title="Protection plans">
            Choose basic, standard, or premium coverage with a security deposit held safely.
          </Trust>
          <Trust icon={<LifeBuoy className="h-6 w-6" />} title="Roadside assistance">
            Included on every rental, so help is a call away if the road gets rough.
          </Trust>
        </div>
      </Container>
    </>
  )
}

function Step({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <div>
      <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-100 text-lg font-bold text-brand-700">
        {n}
      </span>
      <h3 className="mt-4 text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-sm text-muted">{children}</p>
    </div>
  )
}

function Trust({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700">
        {icon}
      </div>
      <h3 className="mt-4 font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-sm text-muted">{children}</p>
    </div>
  )
}
