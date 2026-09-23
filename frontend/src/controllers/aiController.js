import { request } from "./apiClient";

export const aiController = {
  async generateQuiz(params) {
    const res = await request("/api/ai/quiz", {
      method: "POST",
      body: JSON.stringify(params),
    });
    return res.quiz || res.data || res;
  },

  async generateLearningPath(topic, targetRole) {
    const res = await request("/api/ai/learning-path", {
      method: "POST",
      body: JSON.stringify({ topic, targetRole }),
    });
    return res.path || res.learningPath || res.data || res;
  },

  async generateSummary(params) {
    const res = await request("/api/ai/summary", {
      method: "POST",
      body: JSON.stringify(params),
    });
    return res.summary || res.data || res;
  },

  async runPipelineStep(step, toolName, payload = {}) {
    return request("/api/pipeline/run", {
      method: "POST",
      body: JSON.stringify({ step, toolName, ...payload }),
    });
  },
};
