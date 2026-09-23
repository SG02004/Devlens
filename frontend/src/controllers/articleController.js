import { request } from "./apiClient";

export const articleController = {
  async getArticles(query = {}) {
    const params = {};
    if (query.category && query.category !== "all") params.category = query.category;
    if (query.search) params.search = query.search;
    if (query.page) params.page = query.page;
    if (query.limit) params.limit = query.limit;

    try {
      const res = await request("/api/articles", { params });

      if (Array.isArray(res)) {
        return { items: res };
      }
      if (Array.isArray(res.items)) {
        return { items: res.items, total: res.total, page: res.page, pages: res.pages };
      }
      if (Array.isArray(res.articles)) {
        return { items: res.articles, total: res.total };
      }
      if (Array.isArray(res.data)) {
        return {
          items: res.data,
          total: res.pagination?.total,
          page: res.pagination?.page,
          pages: res.pagination?.pages,
        };
      }
      return { items: [] };
    } catch (err) {
      console.warn("[articleController] getArticles failed, returning empty items:", err);
      throw err;
    }
  },

  async syncLive() {
    return request("/api/articles/sync-live", {
      method: "POST",
    });
  },

  async createArticle(article) {
    return request("/api/articles", {
      method: "POST",
      body: JSON.stringify(article),
    });
  },

  async updateArticle(id, updates) {
    return request(`/api/articles/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },

  async deleteArticle(id) {
    return request(`/api/articles/${id}`, {
      method: "DELETE",
    });
  },
};
