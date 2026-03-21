import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      isLoggedIn: false,

      // Update user profile in the store without affecting the auth token.
      setUser: (user) =>
        set({
          user,
          isLoggedIn: !!user,
        }),
      
      login: (token, user) => set({
        token,
        user,
        isLoggedIn: true
      }),
      
      logout: () => set({
        token: null,
        user: null,
        isLoggedIn: false
      })
    }),
    {
      name: 'auth-storage'
    }
  )
);

export default useAuthStore;
