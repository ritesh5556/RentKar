import { api } from './api'
import type { Bike, BikeReviews, BikeSummary, Page } from '../types'

export interface BikeSearchParams {
  q?: string
  city?: string
  state?: string
  category?: string
  min_price?: string
  max_price?: string
  sort?: 'newest' | 'price_asc' | 'price_desc'
  start_date?: string
  end_date?: string
  page?: number
  page_size?: number
}

export interface BikeInput {
  title: string
  description?: string | null
  make: string
  model: string
  year: number
  category: string
  engine_cc?: number | null
  mileage?: number | null
  transmission?: string | null
  price_per_day: string
  security_deposit: string
  city: string
  state: string
  address?: string | null
  status?: string
}

export async function searchBikes(params: BikeSearchParams): Promise<Page<BikeSummary>> {
  const { data } = await api.get<Page<BikeSummary>>('/bikes', { params })
  return data
}

export async function getBike(id: number): Promise<Bike> {
  const { data } = await api.get<Bike>(`/bikes/${id}`)
  return data
}

export async function getMyBikes(): Promise<BikeSummary[]> {
  const { data } = await api.get<BikeSummary[]>('/bikes/mine')
  return data
}

export async function createBike(input: BikeInput): Promise<Bike> {
  const { data } = await api.post<Bike>('/bikes', input)
  return data
}

export async function updateBike(id: number, input: Partial<BikeInput>): Promise<Bike> {
  const { data } = await api.patch<Bike>(`/bikes/${id}`, input)
  return data
}

export async function deleteBike(id: number): Promise<void> {
  await api.delete(`/bikes/${id}`)
}

export async function uploadBikeImages(id: number, files: File[]): Promise<Bike> {
  const form = new FormData()
  files.forEach((file) => form.append('files', file))
  const { data } = await api.post<Bike>(`/bikes/${id}/images`, form)
  return data
}

export async function deleteBikeImage(bikeId: number, imageId: number): Promise<void> {
  await api.delete(`/bikes/${bikeId}/images/${imageId}`)
}

export async function getBikeReviews(id: number): Promise<BikeReviews> {
  const { data } = await api.get<BikeReviews>(`/bikes/${id}/reviews`)
  return data
}
