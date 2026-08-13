import axios from 'axios'

// Dev: baseURL '/api' is proxied to the backend by Vite.
// Prod: set VITE_API_URL to the deployed API origin (including /api).
// withCredentials lets the browser send the httpOnly refresh-token cookie.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  withCredentials: true,
})
