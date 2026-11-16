import React, { useState, useEffect, useCallback } from "react";
import { BarChart3, Loader2, RefreshCw } from "lucide-react";
import { StatCard } from "../AdminPanel";

export function AdminOverviewView() {
  const [stats, setStats] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);

  const token = localStorage.getItem("devlens.auth_token");
  const authHeaders = { Authorization: `Bearer ${token}` };

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/admin/stats", { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats || []);
      }
    } catch {
      // silently fail
    } finally {
      setStatsLoading(false);
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[var(--accent)]" />
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--ink)]">
            Content Repository Overview
          </h2>
        </div>
        <button
          type="button"
          onClick={loadStats}
          className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[var(--ink-muted)] hover:text-[var(--accent)] transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      {statsLoading ? (
        <div className="flex items-center gap-2 text-[var(--ink-muted)] text-xs py-8">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading stats…
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {stats.map((s) => (
            <StatCard key={s.category} stat={s} />
          ))}
        </div>
      )}
    </div>
  );
}
