import { api } from './api'
import type { User } from '../types'

export interface ProfileUpdate {
  full_name?: string
  phone?: string | null
  bio?: string | null
  avatar_url?: string | null
  date_of_birth?: string | null
}

export interface IdentityInput {
  driver_license_number: string
  date_of_birth?: string
}

export async function updateProfile(input: ProfileUpdate): Promise<User> {
  const { data } = await api.patch<User>('/users/me', input)
  return data
}

export async function verifyIdentity(input: IdentityInput): Promise<User> {
  const { data } = await api.post<User>('/users/me/verify-identity', input)
  return data
}
