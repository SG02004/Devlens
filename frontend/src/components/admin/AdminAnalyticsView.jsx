import React, { useState, useEffect, useCallback } from "react";
import { TrendingUp, Loader2, AlertCircle, Users, FileText, Flame, Award, RefreshCw } from "lucide-react";

function KpiCard({ icon: Icon, label, value }) {
  return (
    <div className="border border-[var(--border-dim)] bg-[var(--bg-surface)] p-4 font-mono flex items-center gap-4">
      <div className="w-9 h-9 border border-[var(--border-dim)] flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-[var(--accent)]" />
      </div>
      <div>
        <div className="text-2xl font-display font-bold text-[var(--ink)]">{value}</div>
        <div className="text-[9px] text-[var(--ink-muted)] uppercase tracking-wider mt-0.5">{label}</div>
      </div>
    </div>
  );
}

function CategoryBar({ label, count, maxCount }) {
  const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[10px] text-[var(--ink-muted)] uppercase tracking-wider w-32 shrink-0 truncate">
        {label}
      </span>
      <div className="flex-1 h-2 bg-[var(--border-dim)]">
        <div
          className="h-2 bg-[var(--accent)] transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-[10px] font-bold text-[var(--ink)] w-10 text-right shrink-0">
        {count}
      </span>
    </div>
  );
}

export function AdminAnalyticsView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const token = localStorage.getItem("devlens.auth_token");
  const getAuthHeaders = useCallback(() => {
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, [token]);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/analytics", { headers: getAuthHeaders() });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.detail || `Failed to load analytics (${res.status})`);
      }
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[var(--ink-muted)] text-xs py-16">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading platform analytics…
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between border border-red-500/40 bg-red-500/5 px-4 py-3 text-xs text-red-400 font-mono">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={loadAnalytics}
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--accent)] hover:underline cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const maxCategoryCount = Math.max(...(data?.articles_by_category || []).map((c) => c.count), 1);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[var(--accent)]" />
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--ink)]">
            Platform Analytics
          </h2>
        </div>
        <button
          type="button"
          onClick={loadAnalytics}
          className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[var(--ink-muted)] hover:text-[var(--accent)] transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <KpiCard icon={Users} label="Total Users" value={data?.total_users ?? 0} />
        <KpiCard icon={FileText} label="Total Articles" value={data?.total_articles ?? 0} />
      </div>

      {/* Articles by Category */}
      <section>
        <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-muted)] mb-4">
          Articles by Category
        </h3>
        <div className="space-y-3">
          {(data?.articles_by_category || []).map((cat) => (
            <CategoryBar
              key={cat.category}
              label={cat.label}
              count={cat.count}
              maxCount={maxCategoryCount}
            />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Articles */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-3.5 h-3.5 text-[var(--accent)]" />
            <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-muted)]">
              Top Articles by Upvotes
            </h3>
          </div>
          <div className="space-y-2">
            {(!data?.top_articles || data.top_articles.length === 0) && (
              <p className="font-mono text-[10px] text-[var(--ink-muted)] italic">No articles yet.</p>
            )}
            {(data?.top_articles || []).map((article, i) => (
              <div
                key={article.id}
                className="flex items-start gap-3 border border-[var(--border-dim)] bg-[var(--bg-surface)] px-3 py-2.5"
              >
                <span className="font-mono text-[10px] font-bold text-[var(--accent)] w-4 shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[10px] font-bold text-[var(--ink)] leading-tight line-clamp-2">
                    {article.title}
                  </p>
                  <span className="font-mono text-[9px] text-[var(--ink-muted)] uppercase tracking-wider">
                    {article.category_label}
                  </span>
                </div>
                <span className="font-mono text-[10px] font-bold text-[var(--accent)] shrink-0">
                  ↑{article.upvotes}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Most Active Users */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-3.5 h-3.5 text-[var(--accent)]" />
            <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-muted)]">
              Most Active Readers
            </h3>
          </div>
          <div className="space-y-2">
            {(!data?.most_active_users || data.most_active_users.length === 0) && (
              <p className="font-mono text-[10px] text-[var(--ink-muted)] italic">No activity yet.</p>
            )}
            {(data?.most_active_users || []).map((user, i) => (
              <div
                key={user.username}
                className="flex items-center gap-3 border border-[var(--border-dim)] bg-[var(--bg-surface)] px-3 py-2.5"
              >
                <span className="font-mono text-[10px] font-bold text-[var(--accent)] w-4 shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[10px] font-bold text-[var(--ink)] truncate">
                    {user.name}
                  </p>
                  <p className="font-mono text-[9px] text-[var(--ink-muted)] truncate">
                    @{user.username}
                  </p>
                </div>
                <span className="font-mono text-[9px] text-[var(--ink-muted)] shrink-0">
                  <span className="font-bold text-[var(--ink)]">{user.read_count}</span> reads
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
