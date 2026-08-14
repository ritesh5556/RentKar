import { api } from './api'
import type { Booking, BookingQuote, PlanInfo, ProtectionPlan } from '../types'

export interface QuoteInput {
  bike_id: number
  start_date: string
  end_date: string
  protection_plan: ProtectionPlan
}

export interface CreateBookingInput extends QuoteInput {
  accept_terms: boolean
}

export type BookingAction = 'confirm' | 'reject' | 'cancel' | 'complete'

export async function getPlans(): Promise<PlanInfo[]> {
  const { data } = await api.get<PlanInfo[]>('/bookings/plans')
  return data
}

export async function quoteBooking(input: QuoteInput): Promise<BookingQuote> {
  const { data } = await api.post<BookingQuote>('/bookings/quote', input)
  return data
}

export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  const { data } = await api.post<Booking>('/bookings', input)
  return data
}

export async function getMyBookings(): Promise<Booking[]> {
  const { data } = await api.get<Booking[]>('/bookings/mine')
  return data
}

export async function getIncomingBookings(): Promise<Booking[]> {
  const { data } = await api.get<Booking[]>('/bookings/incoming')
  return data
}

export async function transitionBooking(id: number, action: BookingAction): Promise<Booking> {
  const { data } = await api.post<Booking>(`/bookings/${id}/${action}`)
  return data
}

export async function payBooking(id: number): Promise<Booking> {
  // Stable per-booking idempotency key so accidental double-clicks never double-charge.
  const { data } = await api.post<Booking>(
    `/bookings/${id}/pay`,
    {},
    { headers: { 'Idempotency-Key': `pay-${id}` } },
  )
  return data
}
