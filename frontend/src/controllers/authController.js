import { request, setAuthToken, getAuthToken } from "./apiClient";

export const authController = {
  isAuthenticated() {
    return !!getAuthToken();
  },

  async login(credentials) {
    const payload = {
      username: credentials.username || credentials.email,
      password: credentials.password,
    };
    const res = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (res.token) {
      setAuthToken(res.token);
    }
    return res;
  },

  async register(data) {
    const payload = {
      username: data.username || data.name || data.email,
      email: data.email,
      password: data.password,
      selectedCategories: data.selectedCategories || [],
    };
    const res = await request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (res.token) {
      setAuthToken(res.token);
    }
    return res;
  },

  async getProfile() {
    try {
      return await request("/api/auth/profile");
    } catch {
      const meRes = await request("/api/auth/me");
      const user = meRes.user || meRes.data || meRes;
      return { user };
    }
  },

  async updatePreferences(selectedCategories) {
    try {
      const res = await request("/api/auth/preferences", {
        method: "PUT",
        body: JSON.stringify({ selectedCategories }),
      });
      return res.user;
    } catch {
      const altRes = await request("/api/auth/categories", {
        method: "PUT",
        body: JSON.stringify({ selectedCategories }),
      });
      return altRes.user || altRes.data || altRes;
    }
  },

  logout() {
    setAuthToken(null);
  },
};
