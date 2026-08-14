import { useQuery } from '@tanstack/react-query'
import {
  getBike,
  getBikeReviews,
  getMyBikes,
  searchBikes,
  type BikeSearchParams,
} from '../lib/bikes'

export function useBikes(params: BikeSearchParams) {
  return useQuery({ queryKey: ['bikes', params], queryFn: () => searchBikes(params) })
}

export function useBike(id: number) {
  return useQuery({
    queryKey: ['bike', id],
    queryFn: () => getBike(id),
    enabled: Number.isFinite(id) && id > 0,
  })
}

export function useMyBikes() {
  return useQuery({ queryKey: ['my-bikes'], queryFn: getMyBikes })
}

export function useBikeReviews(id: number) {
  return useQuery({
    queryKey: ['bike-reviews', id],
    queryFn: () => getBikeReviews(id),
    enabled: Number.isFinite(id) && id > 0,
  })
}
