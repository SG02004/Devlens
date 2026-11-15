import { request } from "./apiClient";

export const repoController = {
  async getTrendingRepos(query = {}) {
    const params = {};
    if (query.period) params.period = query.period;
    if (query.language && query.language !== "All") params.language = query.language;
    if (query.category && query.category !== "all") params.category = query.category;
    if (query.limit) params.limit = query.limit;
    if (query.skip) params.skip = query.skip;

    try {
      const res = await request("/api/repos/trending", { params });
      return {
        items: res.items || [],
        total: res.total || 0,
        period: res.period || "daily",
      };
    } catch (err) {
      console.warn("[repoController] getTrendingRepos failed:", err);
      throw err;
    }
  },

  async syncTrendingRepos(maxSummaries = 10) {
    return request("/api/repos/sync", {
      method: "POST",
      params: { max_summaries: maxSummaries },
    });
  },
};
