import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '../store/authStore'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

// Dev: baseURL '/api' is proxied to the backend by Vite.
// withCredentials lets the browser send the httpOnly refresh-token cookie.
export const api = axios.create({ baseURL: BASE_URL, withCredentials: true })

// Attach the in-memory access token to every request.
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Single-flight refresh so concurrent 401s trigger only one refresh call.
let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  try {
    // Bare axios (no interceptors) to avoid recursion.
    const { data } = await axios.post<{ access_token: string }>(
      `${BASE_URL}/auth/refresh`,
      {},
      { withCredentials: true },
    )
    useAuthStore.getState().setAccessToken(data.access_token)
    return data.access_token
  } catch {
    useAuthStore.getState().clearSession()
    return null
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
    const url = original?.url ?? ''
    const isAuthPath = /\/auth\/(login|refresh|register)/.test(url)

    if (error.response?.status === 401 && original && !original._retry && !isAuthPath) {
      original._retry = true
      refreshPromise ??= refreshAccessToken()
      const token = await refreshPromise
      refreshPromise = null
      if (token) {
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      }
    }
    return Promise.reject(error)
  },
)
