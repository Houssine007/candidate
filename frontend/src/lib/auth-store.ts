import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface AuthUser {
  id: number
  email: string
  full_name: string
  role: "CANDIDATE" | "RECRUITER" | "ADMIN" | "EMPLOYEE"
  is_instructor?: boolean
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  setAuth: (user: AuthUser, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
    }),
    {
      name: "recruitpro-auth",
    }
  )
)