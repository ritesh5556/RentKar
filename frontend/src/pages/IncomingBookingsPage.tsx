import { Link } from 'react-router-dom'
import { Inbox } from 'lucide-react'
import Container from '../components/ui/Container'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import Button from '../components/ui/Button'
import BookingCard from '../components/bookings/BookingCard'
import { useIncomingBookings } from '../hooks/useBookings'

export default function IncomingBookingsPage() {
  const { data, isLoading } = useIncomingBookings()

  return (
    <Container className="max-w-3xl py-10">
      <h1 className="text-2xl font-bold text-ink">Booking requests</h1>
      <p className="mt-1 text-sm text-muted">Requests to rent your bikes.</p>

      <div className="mt-6">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner className="h-7 w-7 text-brand-600" />
          </div>
        ) : !data?.length ? (
          <EmptyState
            icon={<Inbox className="h-8 w-8" />}
            title="No requests yet"
            description="When someone books one of your bikes, it'll show up here."
            action={
              <Link to="/my-bikes">
                <Button variant="secondary">Manage my bikes</Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-4">
            {data.map((booking) => (
              <BookingCard key={booking.id} booking={booking} perspective="owner" />
            ))}
          </div>
        )}
      </div>
    </Container>
  )
}
