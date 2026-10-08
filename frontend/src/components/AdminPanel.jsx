import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  Loader2,
  ExternalLink,
  Star,
  BookOpen,
  Zap,
} from "lucide-react";

const CATEGORIES = [
  { value: "artificial-intelligence", label: "Artificial Intelligence" },
  { value: "web-development", label: "Web Development" },
  { value: "cloud-computing", label: "Cloud Computing" },
  { value: "cyber-security", label: "Cyber Security" },
  { value: "data-science", label: "Data Science" },
  { value: "devops", label: "DevOps" },
];

function difficultyColor(d) {
  if (d === "Beginner") return "text-green-400";
  if (d === "Advanced") return "text-red-400";
  return "text-yellow-400";
}

function ReadabilityBadge({ score, difficulty }) {
  const color = difficultyColor(difficulty);
  return (
    <span className={`font-mono text-[9px] font-bold uppercase tracking-widest ${color} flex items-center gap-1`}>
      <Zap className="w-2.5 h-2.5" />
      {difficulty} · {score > 0 ? `Flesch ${score}` : "N/A"}
    </span>
  );
}

function StatCard({ stat }) {
  const pct = stat.daily_auto_cap > 0
    ? Math.round((stat.added_today / stat.daily_auto_cap) * 100)
    : 0;
  return (
    <div className="border border-[var(--border-dim)] bg-[var(--bg-surface)] p-4 font-mono">
      <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent)] mb-1">
        {stat.label}
      </div>
      <div className="text-2xl font-display font-bold text-[var(--ink)]">{stat.total_articles}</div>
      <div className="text-[9px] text-[var(--ink-muted)] mt-1 uppercase tracking-wider">total articles</div>
      <div className="mt-3 h-1 bg-[var(--border-dim)] w-full">
        <div
          className="h-1 bg-[var(--accent)] transition-all duration-500"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-[var(--ink-muted)] mt-1 uppercase tracking-wider">
        <span>Today: {stat.added_today}/{stat.daily_auto_cap}</span>
        <span>{stat.quota_remaining} slots left</span>
      </div>
    </div>
  );
}

function CandidateCard({ candidate, onApprove, onDiscard, isApproving }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border-2 border-[var(--ink)] bg-[var(--bg-surface)] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-dim)]">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)] font-mono">
            {candidate.category?.replace(/-/g, " ")}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="font-mono text-[9px] text-[var(--ink-muted)] uppercase tracking-wider">
              Score: <span className="text-[var(--ink)] font-bold">{candidate.relevance_score?.toFixed(2)}</span>
            </span>
          </div>
        </div>
        <h3 className="font-display font-bold text-base text-[var(--ink)] leading-tight line-clamp-2">
          {candidate.title}
        </h3>
        <div className="flex items-center gap-3 mt-2">
          <span className="font-mono text-[9px] text-[var(--ink-muted)] uppercase tracking-wider">
            {candidate.source}
          </span>
          <span className="text-[var(--border-dim)]">·</span>
          <span className="font-mono text-[9px] text-[var(--ink-muted)] uppercase tracking-wider">
            {candidate.read_time_minutes} min read
          </span>
          <span className="text-[var(--border-dim)]">·</span>
          <ReadabilityBadge score={candidate.readability_score} difficulty={candidate.difficulty} />
        </div>
      </div>

      {/* Summary */}
      <div className="p-4 flex-1">
        <p className="font-mono text-xs text-[var(--ink-muted)] leading-relaxed line-clamp-3">
          {candidate.summary || "No summary available."}
        </p>

        {/* Full text excerpt toggle */}
        {candidate.full_text_excerpt && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setExpanded((p) => !p)}
              className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-[var(--ink-muted)] hover:text-[var(--accent)] transition-colors cursor-pointer"
            >
              <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
              {expanded ? "Hide" : "Show"} full-text excerpt
              {candidate.full_text_available && (
                <span className="ml-1 bg-[var(--accent)] text-[#111113] px-1 text-[8px] font-bold">FULL TEXT</span>
              )}
            </button>
            {expanded && (
              <div className="mt-2 p-3 border border-[var(--border-dim)] bg-[var(--bg)] font-mono text-[10px] text-[var(--ink-muted)] leading-relaxed max-h-40 overflow-y-auto">
                {candidate.full_text_excerpt}…
              </div>
            )}
          </div>
        )}

        {/* Key takeaways */}
        {candidate.key_takeaways?.length > 0 && (
          <ul className="mt-3 space-y-1">
            {candidate.key_takeaways.slice(0, 3).map((t, i) => (
              <li key={i} className="font-mono text-[9px] text-[var(--ink-muted)] flex items-start gap-1.5">
                <span className="text-[var(--accent)] mt-0.5 shrink-0">▸</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-[var(--border-dim)] flex flex-wrap items-center justify-between gap-2">
        <a
          href={candidate.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[9px] uppercase tracking-widest text-[var(--ink-muted)] hover:text-[var(--accent)] flex items-center gap-1 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          Open Article
        </a>
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={() => onDiscard(candidate._candidate_id)}
            className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 border border-[var(--border-dim)] text-[var(--ink-muted)] hover:border-red-500 hover:text-red-400 transition-colors cursor-pointer"
          >
            <XCircle className="w-3.5 h-3.5" />
            Discard
          </button>
          <button
            type="button"
            onClick={() => onApprove(candidate)}
            disabled={isApproving}
            className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 bg-[var(--accent)] text-[#111113] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
          >
            {isApproving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle className="w-3.5 h-3.5" />
            )}
            Approve & Save
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminPanel({ userProfile, onLogout }) {
  const [stats, setStats] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState("artificial-intelligence");
  const [candidates, setCandidates] = useState([]);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [approvingId, setApprovingId] = useState(null);
  const [notification, setNotification] = useState(null);

  const token = localStorage.getItem("devlens.auth_token");
  const authHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const notify = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/admin/stats", { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats || []);
      }
    } catch {
      // silently fail — stats are non-critical
    } finally {
      setStatsLoading(false);
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleFetchCandidates = async () => {
    setFetchLoading(true);
    setFetchError(null);
    setCandidates([]);
    try {
      const res = await fetch("/api/admin/articles/fetch-candidates", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ category: selectedCategory, limit: 3 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to fetch candidates");
      setCandidates(data.candidates || []);
    } catch (err) {
      setFetchError(err.message);
    } finally {
      setFetchLoading(false);
    }
  };

  const handleApprove = async (candidate) => {
    setApprovingId(candidate._candidate_id);
    try {
      const res = await fetch("/api/admin/articles/approve", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          title: candidate.title,
          url: candidate.url,
          url_hash: candidate.url_hash,
          source: candidate.source,
          author: candidate.author,
          published_at: candidate.published_at,
          category: candidate.category,
          read_time_minutes: candidate.read_time_minutes,
          difficulty: candidate.difficulty,
          summary: candidate.summary,
          why_it_matters: candidate.why_it_matters,
          key_takeaways: candidate.key_takeaways,
          skills_extracted: candidate.skills_extracted,
          upvotes: candidate.upvotes,
          comments_count: candidate.comments_count,
          relevance_score: candidate.relevance_score,
          readability_score: candidate.readability_score,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Approval failed");
      notify(`✓ Saved: "${candidate.title.slice(0, 50)}…"`);
      setCandidates((prev) => prev.filter((c) => c._candidate_id !== candidate._candidate_id));
      loadStats();
    } catch (err) {
      notify(`✗ Error: ${err.message}`);
    } finally {
      setApprovingId(null);
    }
  };

  const handleDiscard = (candidateId) => {
    setCandidates((prev) => prev.filter((c) => c._candidate_id !== candidateId));
    notify("Candidate discarded.");
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] font-mono">
      {/* Notification */}
      {notification && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:bottom-6 sm:right-6 z-50 border-2 border-[var(--ink)] bg-[var(--bg-surface)] px-4 py-3 text-xs flex items-center gap-3 animate-fade-in-up">
          <span className="w-2 h-2 bg-[var(--accent)] animate-pulse shrink-0" />
          <span className="font-bold uppercase tracking-wider text-[var(--accent)] text-[10px] shrink-0">[ADMIN]:</span>
          <span className="truncate">{notification}</span>
        </div>
      )}

      {/* Admin Header */}
      <div className="border-2 border-[var(--ink)] px-4 sm:px-6 py-3.5 sm:py-4 flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-surface)]">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <span className="w-2 h-2 bg-[var(--accent)] animate-pulse shrink-0" />
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)] shrink-0">DevLens Admin</span>
          <span className="text-[var(--border-dim)] font-bold">|</span>
          <span className="text-[10px] text-[var(--ink-muted)] uppercase tracking-widest truncate">
            {userProfile?.name || userProfile?.username}
          </span>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 ml-auto">
          <button
            type="button"
            onClick={loadStats}
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[var(--ink-muted)] hover:text-[var(--accent)] transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh Stats</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="text-[10px] uppercase tracking-widest text-[var(--ink-muted)] hover:text-red-400 transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-0 sm:px-2 py-6 sm:py-8 space-y-8 sm:space-y-10">

        {/* ── Section 1: Category Stats Dashboard ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--ink)]">
              Content Repository Overview
            </h2>
          </div>
          {statsLoading ? (
            <div className="flex items-center gap-2 text-[var(--ink-muted)] text-xs py-8">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading stats…
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {stats.map((s) => <StatCard key={s.category} stat={s} />)}
            </div>
          )}
        </section>

        {/* ── Section 2: Manual Curation Tool ── */}
        <section>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--ink)]">
              Manual Article Curation
            </h2>
          </div>
          <p className="text-[10px] text-[var(--ink-muted)] mb-5 leading-relaxed">
            Fetch 3 candidate articles, review their AI summary + full-text excerpt + readability score, then Approve to save or Discard.
          </p>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 mb-6">
            <div className="relative w-full sm:w-auto">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full sm:w-auto appearance-none border-2 border-[var(--ink)] bg-[var(--bg-surface)] text-[var(--ink)] font-mono text-xs uppercase tracking-wider px-4 py-2.5 pr-8 focus:border-[var(--accent)] focus:outline-none cursor-pointer"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--ink-muted)] pointer-events-none" />
            </div>

            <button
              type="button"
              onClick={handleFetchCandidates}
              disabled={fetchLoading}
              className="w-full sm:w-auto justify-center flex items-center gap-2 border-2 border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)] font-mono text-xs font-bold uppercase tracking-wider px-5 py-2.5 hover:bg-[var(--accent)] hover:border-[var(--accent)] hover:text-[#111113] transition-colors cursor-pointer disabled:opacity-50"
            >
              {fetchLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Star className="w-3.5 h-3.5" />
              )}
              {fetchLoading ? "Fetching + Analyzing…" : "Fetch 3 Candidates"}
            </button>
          </div>

          {/* Error */}
          {fetchError && (
            <div className="flex items-center gap-2 border border-red-500/40 bg-red-500/5 px-4 py-3 text-xs text-red-400 mb-4 font-mono">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {fetchError}
            </div>
          )}

          {/* Candidate Cards */}
          {candidates.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {candidates.map((c) => (
                <CandidateCard
                  key={c._candidate_id}
                  candidate={c}
                  onApprove={handleApprove}
                  onDiscard={handleDiscard}
                  isApproving={approvingId === c._candidate_id}
                />
              ))}
            </div>
          )}

          {candidates.length === 0 && !fetchLoading && !fetchError && (
            <div className="border border-dashed border-[var(--border-dim)] py-16 text-center text-[var(--ink-muted)] text-xs uppercase tracking-widest">
              Select a category and click "Fetch 3 Candidates" to begin curation.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
