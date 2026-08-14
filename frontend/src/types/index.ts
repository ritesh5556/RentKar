// ---- Auth / users ----
export interface User {
  id: number
  full_name: string
  email: string
  phone?: string | null
  avatar_url?: string | null
  bio?: string | null
  date_of_birth?: string | null
  is_email_verified: boolean
  id_verified: boolean
  license_verified: boolean
  is_admin: boolean
  created_at: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

export interface RegisterInput {
  email: string
  password: string
  full_name: string
  phone?: string
  date_of_birth?: string
}

// ---- Bikes ----
export type BikeCategory =
  | 'cruiser'
  | 'sport'
  | 'touring'
  | 'adventure'
  | 'standard'
  | 'dual_sport'
  | 'scooter'
  | 'dirt'
  | 'electric'
  | 'other'

export type BikeStatus = 'draft' | 'active' | 'inactive'

export interface BikeImage {
  id: number
  path: string
  is_primary: boolean
  sort_order: number
}

export interface OwnerPublic {
  id: number
  full_name: string
  avatar_url?: string | null
}

export interface BikeSummary {
  id: number
  title: string
  make: string
  model: string
  year: number
  category: string
  price_per_day: string
  security_deposit: string
  city: string
  state: string
  status: string
  primary_image?: string | null
  avg_rating?: number | null
  review_count: number
  created_at: string
}

export interface Bike {
  id: number
  owner_id: number
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
  latitude?: number | null
  longitude?: number | null
  status: string
  created_at: string
  updated_at: string
  images: BikeImage[]
  owner: OwnerPublic
  is_owner: boolean
  avg_rating?: number | null
  review_count: number
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

// ---- Bookings / payments ----
export type ProtectionPlan = 'basic' | 'standard' | 'premium'

export interface PlanInfo {
  plan: ProtectionPlan
  daily_fee: string
  deductible: string
  description: string
}

export interface BookingQuote {
  bike_id: number
  start_date: string
  end_date: string
  total_days: number
  unit_price: string
  protection_plan: ProtectionPlan
  insurance_fee: string
  rental_subtotal: string
  total_price: string
  deposit_amount: string
  roadside_assistance: boolean
}

export type BookingStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed'
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded'

export interface BikeMini {
  id: number
  title: string
  make: string
  model: string
  year: number
  city: string
  state: string
}

export interface PartyMini {
  id: number
  full_name: string
}

export interface Booking {
  id: number
  bike_id: number
  renter_id: number
  owner_id: number
  start_date: string
  end_date: string
  total_days: number
  unit_price: string
  protection_plan: string
  insurance_fee: string
  rental_subtotal: string
  total_price: string
  deposit_amount: string
  status: BookingStatus
  payment_status: PaymentStatus
  roadside_assistance: boolean
  created_at: string
  updated_at: string
  bike: BikeMini
  renter: PartyMini
  owner: PartyMini
}

// ---- Reviews ----
export interface Review {
  id: number
  booking_id: number
  bike_id: number
  reviewer_id: number
  reviewer_name: string
  target: string
  rating: number
  comment?: string | null
  created_at: string
}

export interface BikeReviews {
  average: number | null
  count: number
  items: Review[]
}
