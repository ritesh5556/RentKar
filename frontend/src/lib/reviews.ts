import { api } from './api'
import type { Review } from '../types'

export interface ReviewInput {
  booking_id: number
  rating: number
  comment?: string
}

export async function createReview(input: ReviewInput): Promise<Review> {
  const { data } = await api.post<Review>('/reviews', input)
  return data
}
