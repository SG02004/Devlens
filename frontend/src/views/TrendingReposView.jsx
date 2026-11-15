import React, { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  RefreshCw,
  GitBranch,
  Filter,
  Code2,
  Sparkles,
  Search,
} from "lucide-react";
import { RepoCard } from "../components/RepoCard";
import { repoController } from "../controllers/repoController";

const LANGUAGES = [
  "All",
  "Python",
  "TypeScript",
  "JavaScript",
  "Rust",
  "Go",
  "C++",
  "Swift",
  "Java",
];

const CATEGORIES = [
  { slug: "all", label: "All Domains" },
  { slug: "artificial-intelligence", label: "Artificial Intelligence" },
  { slug: "cloud-computing", label: "Cloud Computing" },
  { slug: "devops", label: "DevOps & SRE" },
  { slug: "cyber-security", label: "Cyber Security" },
  { slug: "data-science", label: "Data Science" },
  { slug: "web-development", label: "Web Development" },
  { slug: "open-source", label: "Core Open Source" },
];

export const TrendingReposView = ({ userProfile }) => {
  const [repos, setRepos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [period, setPeriod] = useState("daily");
  const [selectedLanguage, setSelectedLanguage] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [syncStatus, setSyncStatus] = useState(null);

  const fetchRepos = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await repoController.getTrendingRepos({
        period,
        language: selectedLanguage,
        category: selectedCategory,
        limit: 50,
      });
      setRepos(res.items || []);
    } catch (err) {
      console.error("Failed to load trending repos:", err);
    } finally {
      setIsLoading(false);
    }
  }, [period, selectedLanguage, selectedCategory]);

  useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);

  const handleSyncTrending = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const res = await repoController.syncTrendingRepos(10);
      setSyncStatus(`Sync complete! ${res.repos_saved} repos updated (${res.ai_summaries_generated} new AI breakdowns).`);
      await fetchRepos();
    } catch (err) {
      setSyncStatus(`Sync notice: ${err.message || "Failed to trigger sync"}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Client-side quick search filtering over name, description, and topics
  const filteredRepos = repos.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = r.fullName?.toLowerCase().includes(q);
    const descMatch = (r.summary || r.description || "").toLowerCase().includes(q);
    const topicMatch = (r.topics || []).some((t) => t.toLowerCase().includes(q));
    const langMatch = r.primaryLanguage?.toLowerCase().includes(q);
    return nameMatch || descMatch || topicMatch || langMatch;
  });

  return (
    <div id="trending-repos-view" className="space-y-6">
      {/* View Header */}
      <div className="border-b-2 border-[var(--ink)] pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)] mb-1">
            <TrendingUp className="w-4 h-4" />
            <span>GitHub Star Velocity Pipeline</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[var(--ink)] tracking-tight">
            Trending Repositories
          </h2>
          <p className="font-mono text-xs text-[var(--ink-muted)] mt-1.5 max-w-2xl leading-relaxed">
            Curated, star-velocity open source tools and developer libraries with hallucination-grounded architectural breakdowns and capability highlights.
          </p>
        </div>

        {/* Sync Controls (Visible to Admin or for on-demand trigger) */}
        {userProfile?.role === "admin" && (
          <div className="shrink-0 flex items-center gap-2">
            <button
              id="btn-sync-trending-repos"
              type="button"
              onClick={handleSyncTrending}
              disabled={isSyncing}
              className="border-2 border-[var(--ink)] bg-[var(--accent)] text-[#111113] hover:bg-[var(--ink)] hover:text-[var(--bg)] px-3.5 py-2 font-mono text-xs font-bold tracking-wider uppercase transition-colors flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "Syncing..." : "Sync GitHub Trends"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Sync Status Banner */}
      {syncStatus && (
        <div className="p-3 border border-[var(--border-dim)] bg-[var(--bg-surface)] font-mono text-xs text-[var(--ink)] flex items-center justify-between">
          <span>{syncStatus}</span>
          <button
            type="button"
            onClick={() => setSyncStatus(null)}
            className="text-[var(--ink-muted)] hover:text-[var(--ink)] uppercase font-bold text-[10px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Controls & Filter Bar */}
      <div className="border border-[var(--border-dim)] bg-[var(--bg-surface)] p-4 space-y-3 font-mono text-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Period Selection */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--ink-muted)] mr-1">
              Velocity:
            </span>
            {["daily", "weekly", "monthly"].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 text-[11px] font-bold uppercase transition-colors cursor-pointer border ${
                  period === p
                    ? "bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]"
                    : "border-[var(--border-dim)] text-[var(--ink-muted)] hover:text-[var(--ink)]"
                }`}
              >
                {p === "daily" ? "Past 24h" : p === "weekly" ? "Past Week" : "Past Month"}
              </button>
            ))}
          </div>

          {/* Quick Search Input */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]" />
            <input
              type="text"
              placeholder="Search trending repos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--bg)] border border-[var(--border-dim)] pl-8 pr-3 py-1.5 text-xs text-[var(--ink)] placeholder-[var(--ink-muted)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
        </div>

        {/* Language Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-[var(--border-dim)]">
          <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--ink-muted)] mr-1">
            Language:
          </span>
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setSelectedLanguage(lang)}
              className={`px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase transition-colors cursor-pointer border ${
                selectedLanguage === lang
                  ? "bg-[var(--accent)] text-[#111113] border-[var(--accent)]"
                  : "border-[var(--border-dim)] text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }`}
            >
              {lang}
            </button>
          ))}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-[var(--border-dim)]">
          <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--ink-muted)] mr-1">
            Domain:
          </span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.slug}
              type="button"
              onClick={() => setSelectedCategory(cat.slug)}
              className={`px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase transition-colors cursor-pointer border ${
                selectedCategory === cat.slug
                  ? "bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]"
                  : "border-[var(--border-dim)] text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Repos Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="border-2 border-[var(--border-dim)] bg-[var(--bg-surface)] p-6 space-y-4 animate-pulse"
            >
              <div className="h-4 bg-[var(--border-dim)] w-1/3" />
              <div className="h-6 bg-[var(--border-dim)] w-3/4" />
              <div className="space-y-2">
                <div className="h-3 bg-[var(--border-dim)] w-full" />
                <div className="h-3 bg-[var(--border-dim)] w-5/6" />
              </div>
              <div className="h-16 bg-[var(--bg)] border border-[var(--border-dim)]" />
            </div>
          ))}
        </div>
      ) : filteredRepos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRepos.map((repo) => (
            <RepoCard key={repo.id} repo={repo} />
          ))}
        </div>
      ) : (
        <div className="border-2 border-dashed border-[var(--border-dim)] bg-[var(--bg-surface)] p-12 text-center font-mono">
          <Code2 className="w-10 h-10 text-[var(--ink-muted)] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[var(--ink)] uppercase tracking-wider mb-1">
            No Repositories Found
          </h3>
          <p className="text-xs text-[var(--ink-muted)] max-w-md mx-auto mb-4">
            No trending repositories matched your current language or domain filters.
          </p>
          {userProfile?.role === "admin" && (
            <button
              type="button"
              onClick={handleSyncTrending}
              disabled={isSyncing}
              className="border border-[var(--ink)] bg-[var(--accent)] text-[#111113] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              <span>Fetch Trending Repos Now</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
