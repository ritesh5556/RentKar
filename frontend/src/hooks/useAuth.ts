import { useAuthStore } from '../store/authStore'

export function useAuth() {
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const bootstrapped = useAuthStore((s) => s.bootstrapped)
  return {
    user,
    isAuthenticated: Boolean(user && accessToken),
    bootstrapped,
  }
}
