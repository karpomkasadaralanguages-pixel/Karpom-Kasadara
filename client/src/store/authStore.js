import { create } from 'zustand';
import api from '../api/axios';

// Minimal JWT payload decode (no signature check needed client-side — the
// server already validated it; we're just reading the claims we embedded).
function decodeToken(token) {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
  // Student-only: the list of child profiles on this account, and which one
  // is currently active. Empty/null for admin and teacher accounts.
  profiles: [],
  activeProfileId: null,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    set({
      user: data.user,
      accessToken: data.accessToken,
      isAuthenticated: true,
      profiles: data.profiles || [],
      activeProfileId: data.activeProfileId || null,
    });
    api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
    return data.user;
  },

  register: async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    set({
      user: data.user,
      accessToken: data.accessToken,
      isAuthenticated: true,
      profiles: data.profiles || [],
      activeProfileId: data.activeProfileId || null,
    });
    api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
    return data.user;
  },

  logout: async () => {
    try { await api.post('/auth/logout'); } catch {}
    delete api.defaults.headers.common['Authorization'];
    set({ user: null, accessToken: null, isAuthenticated: false, profiles: [], activeProfileId: null });
  },

  // Switch to a different child profile on this account — no re-login needed.
  switchProfile: async (profileId) => {
    const { data } = await api.post('/auth/switch-profile', { profileId });
    set({ accessToken: data.accessToken, activeProfileId: data.activeProfile.id });
    api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
    // Keep the profiles list's copy of the active profile in sync too.
    set(state => ({
      profiles: state.profiles.map(p => p.id === data.activeProfile.id ? { ...p, ...data.activeProfile } : p),
    }));
    return data.activeProfile;
  },

  // Re-fetch this account's profiles (e.g. after adding a sibling).
  reloadProfiles: async () => {
    const { user } = get();
    if (!user?.id) return;
    const { data } = await api.get(`/users/${user.id}/profiles`);
    set({ profiles: data.profiles });
  },

  refreshToken: async () => {
    try {
      const { data } = await api.post('/auth/refresh');
      api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;

      const claims = decodeToken(data.accessToken);
      if (!claims?.sub) throw new Error('Could not read refreshed token.');

      const me = await api.get(`/users/${claims.sub}`);
      set({
        accessToken: data.accessToken,
        user: me.data.user,
        isAuthenticated: true,
        isLoading: false,
        profiles: me.data.user.profiles || [],
        activeProfileId: claims.profileId || null,
      });
      return true;
    } catch {
      set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false, profiles: [], activeProfileId: null });
      return false;
    }
  },

  setLoading: (isLoading) => set({ isLoading }),

  updateUser: (partialUser) => set(state => ({ user: { ...state.user, ...partialUser } })),
}));

export default useAuthStore;
