import React, { useState } from "react";
import {
  BookOpen,
  ChevronDown,
  Loader2,
  Star,
  AlertCircle,
} from "lucide-react";
import { CandidateCard, CATEGORIES } from "../AdminPanel";

export function AdminCurationView() {
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
    <div className="space-y-6">
      {/* Inline notification */}
      {notification && (
        <div className="border border-[var(--accent)]/40 bg-[var(--accent)]/5 px-4 py-3 text-xs text-[var(--accent)] font-mono flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-pulse shrink-0" />
          {notification}
        </div>
      )}

      <div className="flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-[var(--accent)]" />
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--ink)]">
          Manual Article Curation
        </h2>
      </div>

      <p className="text-[10px] text-[var(--ink-muted)] leading-relaxed">
        Fetch 3 candidate articles, review their AI summary + full-text excerpt + readability score,
        then Approve to save or Discard.
      </p>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
        <div className="relative w-full sm:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-auto appearance-none border-2 border-[var(--ink)] bg-[var(--bg-surface)] text-[var(--ink)] font-mono text-xs uppercase tracking-wider px-4 py-2.5 pr-8 focus:border-[var(--accent)] focus:outline-none cursor-pointer"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
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
        <div className="flex items-center gap-2 border border-red-500/40 bg-red-500/5 px-4 py-3 text-xs text-red-400 font-mono">
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
    </div>
  );
}
