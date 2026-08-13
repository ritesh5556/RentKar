import { api } from './api'
import { useAuthStore } from '../store/authStore'
import type { RegisterInput, TokenResponse, User } from '../types'

export async function login(email: string, password: string): Promise<User> {
  const { data } = await api.post<TokenResponse>('/auth/login', { email, password })
  useAuthStore.getState().setAccessToken(data.access_token)
  const { data: user } = await api.get<User>('/auth/me')
  useAuthStore.getState().setSession(data.access_token, user)
  return user
}

export async function register(input: RegisterInput): Promise<void> {
  await api.post('/auth/register', input)
}

export async function verifyEmail(token: string): Promise<void> {
  await api.post('/auth/verify-email', { token })
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout')
  } finally {
    useAuthStore.getState().clearSession()
  }
}

/** On app load, try to restore a session from the refresh cookie. */
export async function bootstrapSession(): Promise<void> {
  const store = useAuthStore.getState()
  try {
    const { data } = await api.post<TokenResponse>('/auth/refresh')
    store.setAccessToken(data.access_token)
    const { data: user } = await api.get<User>('/auth/me')
    store.setSession(data.access_token, user)
  } catch {
    store.clearSession()
  } finally {
    store.setBootstrapped(true)
  }
}
