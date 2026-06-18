import { create } from 'zustand';
import api from '../api/axios';

const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    set({ user: data.user, accessToken: data.accessToken, isAuthenticated: true });
    api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
    return data.user;
  },

  logout: async () => {
    try { await api.post('/auth/logout'); } catch {}
    delete api.defaults.headers.common['Authorization'];
    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  refreshToken: async () => {
    try {
      const { data } = await api.post('/auth/refresh');
      set({ accessToken: data.accessToken, isAuthenticated: true });
      api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
      // Fetch user profile
      const me = await api.get(`/users/${get().user?.id || 'me'}`);
      set({ user: me.data.user, isLoading: false });
      return true;
    } catch {
      set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
      return false;
    }
  },

  setLoading: (isLoading) => set({ isLoading }),
}));

export default useAuthStore;
