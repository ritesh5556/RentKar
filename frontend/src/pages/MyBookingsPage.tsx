import { Link } from 'react-router-dom'
import { Ticket } from 'lucide-react'
import Container from '../components/ui/Container'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import Button from '../components/ui/Button'
import BookingCard from '../components/bookings/BookingCard'
import { useMyBookings } from '../hooks/useBookings'

export default function MyBookingsPage() {
  const { data, isLoading } = useMyBookings()

  return (
    <Container className="max-w-3xl py-10">
      <h1 className="text-2xl font-bold text-ink">My trips</h1>
      <p className="mt-1 text-sm text-muted">Rides you've booked.</p>

      <div className="mt-6">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner className="h-7 w-7 text-brand-600" />
          </div>
        ) : !data?.length ? (
          <EmptyState
            icon={<Ticket className="h-8 w-8" />}
            title="No trips yet"
            description="Find a bike and book your first ride."
            action={
              <Link to="/bikes">
                <Button>Browse bikes</Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-4">
            {data.map((booking) => (
              <BookingCard key={booking.id} booking={booking} perspective="renter" />
            ))}
          </div>
        )}
      </div>
    </Container>
  )
}
