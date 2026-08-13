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
