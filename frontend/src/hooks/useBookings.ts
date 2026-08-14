import { useQuery } from '@tanstack/react-query'
import { getIncomingBookings, getMyBookings, getPlans } from '../lib/bookings'

export function useMyBookings() {
  return useQuery({ queryKey: ['my-bookings'], queryFn: getMyBookings })
}

export function useIncomingBookings() {
  return useQuery({ queryKey: ['incoming-bookings'], queryFn: getIncomingBookings })
}

export function usePlans() {
  return useQuery({ queryKey: ['plans'], queryFn: getPlans, staleTime: Infinity })
}
