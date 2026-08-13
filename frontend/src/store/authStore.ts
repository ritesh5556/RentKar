import { create } from 'zustand'
import type { User } from '../types'

interface AuthState {
  accessToken: string | null
  user: User | null
  // becomes true once the initial silent-refresh attempt has completed
  bootstrapped: boolean
  setSession: (token: string, user: User) => void
  setAccessToken: (token: string | null) => void
  setUser: (user: User) => void
  clearSession: () => void
  setBootstrapped: (value: boolean) => void
}

// The access token lives only in memory (never localStorage) to limit XSS theft;
// it is re-obtained from the httpOnly refresh cookie on page load.
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  bootstrapped: false,
  setSession: (accessToken, user) => set({ accessToken, user }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setUser: (user) => set({ user }),
  clearSession: () => set({ accessToken: null, user: null }),
  setBootstrapped: (bootstrapped) => set({ bootstrapped }),
}))
