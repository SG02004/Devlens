import React, { useState, useEffect, useMemo } from "react";
import {
  BookOpen,
  Bookmark,
  Flame,
  Award,
  ArrowUpRight,
  Sparkles,
  History,
  Cpu,
  Clock,
} from "lucide-react";
import { CATEGORIES_CONFIG } from "../data/mockDatabase";
import { DailyGoalWidget } from "./DailyGoalWidget";

const STORAGE_DAILY_GOAL = "devlens.dailyGoal";

function getHeatmapCellStyle(reads) {
  if (!reads || reads <= 0) {
    return "bg-[var(--bg)] border-[var(--border-dim)]";
  }
  if (reads === 1) {
    return "bg-[var(--accent)]/30 border-[var(--accent)]/50";
  }
  if (reads === 2) {
    return "bg-[var(--accent)]/55 border-[var(--accent)]/70";
  }
  if (reads === 3) {
    return "bg-[var(--accent)]/80 border-[var(--accent)]/90";
  }
  return "bg-[var(--accent)] border-[var(--accent)]";
}

export const AnalyticsBoard = ({
  username,
  articles = [],
  userProfile,
  onOpenArticle,
}) => {
  const [serverAnalytics, setServerAnalytics] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [activeListTab, setActiveListTab] = useState("history");

  const [dailyGoal, setDailyGoal] = useState(() => {
    try {
      const stored = Number(localStorage.getItem(STORAGE_DAILY_GOAL));
      return Number.isFinite(stored) && stored > 0 ? stored : 5;
    } catch {
      return 5;
    }
  });

  const handleGoalChange = (newGoal) => {
    setDailyGoal(newGoal);
    try {
      localStorage.setItem(STORAGE_DAILY_GOAL, String(newGoal));
    } catch {
      // ignore
    }
  };

  // Fetch server-side analytics & reading history whenever engagement state changes
  const readSignature = useMemo(
    () =>
      articles
        .filter((a) => a.isRead || a.isBookmarked)
        .map((a) => `${a.id}:${a.isRead ? 1 : 0}:${a.isBookmarked ? 1 : 0}`)
        .join(","),
    [articles]
  );

  useEffect(() => {
    let cancelled = false;
    async function fetchTelemetry() {
      try {
        const token = localStorage.getItem("devlens.auth_token");
        if (!token) return;
        const headers = { Authorization: `Bearer ${token}` };

        const [anaRes, histRes] = await Promise.all([
          fetch("/api/analytics/me", { headers }),
          fetch("/api/analytics/me/history?limit=25", { headers }),
        ]);

        if (!cancelled && anaRes.ok) {
          const anaData = await anaRes.json();
          setServerAnalytics(anaData);
        }
        if (!cancelled && histRes.ok) {
          const histData = await histRes.json();
          setHistoryItems(histData.history || []);
        }
      } catch {
        // Fallback to local state derived from articles prop
      }
    }
    fetchTelemetry();
    return () => {
      cancelled = true;
    };
  }, [readSignature]);

  // Local fallbacks derived from articles prop
  const readArticles = useMemo(() => articles.filter((a) => a.isRead), [articles]);
  const bookmarkedArticles = useMemo(
    () => articles.filter((a) => a.isBookmarked),
    [articles]
  );

  const localCategoryCounts = useMemo(() => {
    const counts = {};
    readArticles.forEach((a) => {
      counts[a.category] = (counts[a.category] || 0) + 1;
    });
    return counts;
  }, [readArticles]);

  const totalRead = serverAnalytics?.totals?.articlesRead ?? readArticles.length;
  const totalBookmarks = serverAnalytics?.totals?.bookmarks ?? bookmarkedArticles.length;
  const totalMinutes =
    serverAnalytics?.totals?.minutesRead ??
    readArticles.reduce((acc, curr) => acc + (curr.readTimeMinutes || 5), 0);
  const currentStreak =
    serverAnalytics?.totals?.currentStreak ?? (readArticles.length > 0 ? 1 : 0);
  const longestStreak =
    serverAnalytics?.totals?.longestStreak ?? (readArticles.length > 0 ? 1 : 0);
  const todayReadCount =
    serverAnalytics?.totals?.todayReads ?? readArticles.length;

  // Category velocity series
  const activeCategories = CATEGORIES_CONFIG.filter((c) => c.id !== "all");
  const categorySeries = useMemo(() => {
    if (serverAnalytics?.categories?.length) {
      return activeCategories.map((c) => {
        const match = serverAnalytics.categories.find((sc) => sc.category === c.id);
        return {
          id: c.id,
          label: c.label,
          count: match ? match.reads : 0,
        };
      });
    }
    return activeCategories.map((c) => ({
      id: c.id,
      label: c.label,
      count: localCategoryCounts[c.id] || 0,
    }));
  }, [serverAnalytics, activeCategories, localCategoryCounts]);

  const highestCount = Math.max(1, ...categorySeries.map((s) => s.count));

  const topCategoryLabel = useMemo(() => {
    if (serverAnalytics?.totals?.topCategory && totalRead > 0) {
      return serverAnalytics.totals.topCategory;
    }
    let best = "Artificial Intelligence";
    let max = 0;
    categorySeries.forEach((c) => {
      if (c.count > max) {
        max = c.count;
        best = c.label;
      }
    });
    return best;
  }, [serverAnalytics, categorySeries, totalRead]);

  // Difficulty counts
  const beginnerCount =
    serverAnalytics?.difficulty?.Beginner ??
    readArticles.filter((a) => a.difficulty === "Beginner").length;
  const intermediateCount =
    serverAnalytics?.difficulty?.Intermediate ??
    readArticles.filter((a) => a.difficulty === "Intermediate").length;
  const advancedCount =
    serverAnalytics?.difficulty?.Advanced ??
    readArticles.filter((a) => a.difficulty === "Advanced").length;

  // Top skills cloud ("Developer Skill ID")
  const topSkills = useMemo(() => {
    if (serverAnalytics?.topSkills?.length) {
      return serverAnalytics.topSkills;
    }
    const counts = {};
    readArticles.forEach((a) => {
      (a.skillsExtracted || []).forEach((s) => {
        counts[s] = (counts[s] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([skill, count]) => ({ skill, count }));
  }, [serverAnalytics, readArticles]);

  // 105-day heatmap cells (15 weeks x 7 days)
  const heatmapCells = useMemo(() => {
    if (serverAnalytics?.heatmap?.length === 105) {
      return serverAnalytics.heatmap;
    }
    const today = new Date();
    const cells = [];
    for (let i = 104; i >= 0; i--) {
      const d = new Date(today);
      d.setUTCDate(today.getUTCDate() - i);
      const iso = d.toISOString().slice(0, 10);
      cells.push({
        date: iso,
        reads: i === 0 ? readArticles.length : 0,
      });
    }
    return cells;
  }, [serverAnalytics, readArticles.length]);

  const effectiveHistory = useMemo(() => {
    if (historyItems.length > 0) return historyItems;
    return readArticles;
  }, [historyItems, readArticles]);

  const displayName =
    userProfile?.name || username || "Senior Developer";

  return (
    <div id="analytics-board" className="w-full space-y-8 animate-fade-in-up text-left">
      {/* 1. Header Card + Daily Goal Tracker */}
      <section className="card p-6 sm:p-10 border-2 border-[var(--ink)] bg-[var(--bg-surface)] shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-center">
          <div>
            <div className="meta-tag">Personal Insights & Telemetry</div>
            <h1 className="font-display text-3xl sm:text-5xl text-[var(--ink)] leading-[0.95] tracking-tight mt-4">
              Learning Analytics
            </h1>
            <p className="font-mono text-xs sm:text-sm text-[var(--ink-muted)] mt-3 leading-relaxed max-w-xl">
              Developer knowledge telemetry for{" "}
              <span className="text-[var(--accent)] font-bold">{displayName}</span>{" "}
              derived from {totalRead} tracked reading sessions across{" "}
              {articles.length} indexed engineering papers.
            </p>
          </div>

          <DailyGoalWidget
            todayReadCount={todayReadCount}
            dailyGoal={dailyGoal}
            onGoalChange={handleGoalChange}
          />
        </div>
      </section>

      {/* 2. Four Core Metric Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 font-mono">
        <article className="card p-6 border-2 border-[var(--ink)] bg-[var(--bg-surface)] flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 border border-[var(--ink)] flex items-center justify-center bg-[var(--bg)] text-[var(--ink)]">
            <BookOpen className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--ink-muted)]">
              ARTICLES READ
            </p>
            <p className="font-display text-2xl font-extrabold text-[var(--ink)]">
              {totalRead}
            </p>
          </div>
        </article>

        <article className="card p-6 border-2 border-[var(--ink)] bg-[var(--bg-surface)] flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 border border-[var(--ink)] flex items-center justify-center bg-[var(--bg)] text-[var(--ink)]">
            <Bookmark className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--ink-muted)]">
              SAVED PAPERS
            </p>
            <p className="font-display text-2xl font-extrabold text-[var(--ink)]">
              {totalBookmarks}
            </p>
          </div>
        </article>

        <article className="card p-6 border-2 border-[var(--ink)] bg-[var(--bg-surface)] flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 border border-[var(--ink)] flex items-center justify-center bg-[var(--bg)] text-[var(--ink)]">
            <Flame className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--ink-muted)]">
              READING STREAK
            </p>
            <div className="flex items-baseline gap-2">
              <p className="font-display text-2xl font-extrabold text-[var(--ink)]">
                {currentStreak}d
              </p>
              <span className="text-[10px] text-[var(--accent)] font-bold">
                BEST: {longestStreak}d
              </span>
            </div>
          </div>
        </article>

        <article className="card p-6 border-2 border-[var(--ink)] bg-[var(--bg-surface)] flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 border border-[var(--ink)] flex items-center justify-center bg-[var(--bg)] text-[var(--ink)]">
            <Award className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--ink-muted)]">
              TIME INVESTED
            </p>
            <div className="flex items-baseline gap-2">
              <p className="font-display text-2xl font-extrabold text-[var(--ink)]">
                {totalMinutes}m
              </p>
              <span
                className="text-[9px] text-[var(--ink-muted)] truncate max-w-[95px]"
                title={topCategoryLabel}
              >
                {topCategoryLabel.split(" ")[0]}
              </span>
            </div>
          </div>
        </article>
      </section>

      {/* 3. 15-Week Reading Streak Heatmap + Developer Skill ID Cloud */}
      <section className="grid gap-6 lg:grid-cols-[1.25fr_1fr] font-mono">
        {/* Streak Heatmap */}
        <article className="card p-6 sm:p-8 border-2 border-[var(--ink)] bg-[var(--bg-surface)] space-y-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[var(--border-dim)]">
            <div>
              <h2 className="font-display text-xl sm:text-2xl text-[var(--ink)] flex items-center gap-2">
                <Flame className="w-5 h-5 text-[var(--accent)]" />
                <span>Reading Streak Matrix</span>
              </h2>
              <p className="text-xs text-[var(--ink-muted)] mt-1">
                Last 15 weeks (105 days) of engineering reading consistency (UTC)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="meta-tag-accent text-[10px]">
                {currentStreak} DAY STREAK
              </span>
            </div>
          </div>

          {/* 15 columns x 7 rows pure CSS Grid */}
          <div className="overflow-x-auto py-2">
            <div className="grid grid-rows-7 grid-flow-col gap-1.5 w-max min-w-full justify-between">
              {heatmapCells.map((cell) => (
                <div
                  key={cell.date}
                  title={`${cell.date}: ${cell.reads} article${cell.reads === 1 ? "" : "s"} read`}
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 border transition-transform hover:scale-125 ${getHeatmapCellStyle(
                    cell.reads
                  )}`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 text-[10px] text-[var(--ink-muted)] uppercase tracking-wider">
            <span>105-DAY HORIZON</span>
            <div className="flex items-center gap-1.5">
              <span>LESS</span>
              {[0, 1, 2, 3, 4].map((lvl) => (
                <span
                  key={lvl}
                  className={`w-3 h-3 border inline-block ${getHeatmapCellStyle(lvl)}`}
                />
              ))}
              <span>MORE</span>
            </div>
          </div>
        </article>

        {/* Top Technical Skills Cloud ("Developer Skill ID") */}
        <article className="card p-6 sm:p-8 border-2 border-[var(--ink)] bg-[var(--bg-surface)] flex flex-col justify-between space-y-5 shadow-sm">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-dim)]">
              <div>
                <h2 className="font-display text-xl sm:text-2xl text-[var(--ink)] flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-[var(--accent)]" />
                  <span>Developer Skill ID</span>
                </h2>
                <p className="text-xs text-[var(--ink-muted)] mt-1">
                  Auto-constructed from technical concepts in your read papers
                </p>
              </div>
              <span className="meta-tag text-[10px]">{topSkills.length} SKILLS</span>
            </div>

            {topSkills.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {topSkills.map((item, idx) => (
                  <span
                    key={item.skill}
                    className={`px-3 py-1.5 border text-xs flex items-center gap-2 transition-colors ${
                      idx < 3
                        ? "border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--ink)] font-bold"
                        : "border-[var(--border-dim)] bg-[var(--bg)] text-[var(--ink)]"
                    }`}
                  >
                    <span>#{item.skill}</span>
                    <span className="text-[10px] text-[var(--accent)] font-bold">
                      ×{item.count}
                    </span>
                  </span>
                ))}
              </div>
            ) : (
              <div className="mt-6 p-6 border border-dashed border-[var(--border-dim)] text-center text-xs text-[var(--ink-muted)]">
                Read articles from the feed to automatically populate your technical skill profile and sharpen your &ldquo;FOR YOU&rdquo; recommendations.
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-[var(--border-dim)] flex items-center justify-between text-[10px] text-[var(--ink-muted)]">
            <span>USED BY HYBRID PERSONALIZER</span>
            <span className="text-[var(--accent)] font-bold">25% WEIGHT</span>
          </div>
        </article>
      </section>

      {/* 4. Category Velocity & Difficulty Depth */}
      <section className="grid gap-6 lg:grid-cols-2 font-mono">
        {/* Skill Interest Velocity */}
        <article className="card p-6 sm:p-8 border-2 border-[var(--ink)] bg-[var(--bg-surface)] space-y-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border-dim)]">
            <div>
              <h2 className="font-display text-xl sm:text-2xl text-[var(--ink)]">
                Skill Interest Map
              </h2>
              <p className="text-xs text-[var(--ink-muted)] mt-1">
                Reading velocity by engineering specialization
              </p>
            </div>
            <span className="meta-tag text-[10px]">{totalRead} READ</span>
          </div>

          <div className="space-y-4">
            {categorySeries.map((item) => {
              const pct =
                totalRead > 0 ? Math.round((item.count / totalRead) * 100) : 0;
              const barWidth = Math.round((item.count / highestCount) * 100);

              return (
                <div key={item.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--ink)]">{item.label}</span>
                    <span className="text-[var(--accent)] font-bold">
                      {item.count} read ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-[var(--bg)] border border-[var(--border-dim)] overflow-hidden">
                    <div
                      className="h-full bg-[var(--accent)] transition-all duration-300"
                      style={{
                        width: `${Math.max(barWidth, item.count > 0 ? 5 : 0)}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        {/* Difficulty Depth */}
        <article className="card p-6 sm:p-8 border-2 border-[var(--ink)] bg-[var(--bg-surface)] flex flex-col justify-between space-y-6 shadow-sm">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-dim)]">
              <div>
                <h2 className="font-display text-xl sm:text-2xl text-[var(--ink)]">
                  Difficulty Depth
                </h2>
                <p className="text-xs text-[var(--ink-muted)] mt-1">
                  Distribution across Flesch Reading Ease complexity tiers
                </p>
              </div>
              <span className="meta-tag-accent text-[10px]">TEXTSTAT NLP</span>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3 text-center">
              <div className="border border-[var(--border-dim)] p-2.5 sm:p-4 bg-[var(--bg)] min-w-0">
                <span className="text-[8px] sm:text-[10px] uppercase font-bold tracking-wider sm:tracking-widest text-[var(--ink-muted)] block truncate">
                  BEGINNER
                </span>
                <span className="font-display text-xl sm:text-3xl font-extrabold text-[var(--ink)] mt-1.5 sm:mt-2 block">
                  {beginnerCount}
                </span>
                <span className="text-[8px] sm:text-[9px] text-[var(--ink-muted)] block truncate">
                  Foundations
                </span>
              </div>

              <div className="border border-[var(--accent)]/50 p-2.5 sm:p-4 bg-[var(--accent-muted)] min-w-0">
                <span className="text-[8px] sm:text-[10px] uppercase font-bold tracking-wider sm:tracking-widest text-[var(--accent)] block truncate">
                  INTERMEDIATE
                </span>
                <span className="font-display text-xl sm:text-3xl font-extrabold text-[var(--accent)] mt-1.5 sm:mt-2 block">
                  {intermediateCount}
                </span>
                <span className="text-[8px] sm:text-[9px] text-[var(--ink-muted)] block truncate">
                  Architectures
                </span>
              </div>

              <div className="border border-[var(--border-dim)] p-2.5 sm:p-4 bg-[var(--bg)] min-w-0">
                <span className="text-[8px] sm:text-[10px] uppercase font-bold tracking-wider sm:tracking-widest text-[var(--ink-muted)] block truncate">
                  ADVANCED
                </span>
                <span className="font-display text-xl sm:text-3xl font-extrabold text-[var(--ink)] mt-1.5 sm:mt-2 block">
                  {advancedCount}
                </span>
                <span className="text-[8px] sm:text-[9px] text-[var(--ink-muted)] block truncate">
                  RFCs & Preprints
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 border border-[var(--accent)] bg-[var(--accent-muted)] text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-[var(--accent)] uppercase tracking-wider text-[10px]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Senior Developer Advisory</span>
            </div>
            <p className="text-[var(--ink)] leading-relaxed">
              Primary focus detected in{" "}
              <span className="font-bold text-[var(--accent)]">
                {topCategoryLabel}
              </span>
              . DevLens automatically reserves 12.5% of your &ldquo;FOR YOU&rdquo; feed slots for cross-domain exploration to prevent technical filter bubbles.
            </p>
          </div>
        </article>
      </section>

      {/* 5. Reading History & Saved Papers Switchable Table */}
      <section className="card p-6 sm:p-8 border-2 border-[var(--ink)] bg-[var(--bg-surface)] font-mono shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--border-dim)]">
          <div>
            <h2 className="font-display text-xl sm:text-2xl text-[var(--ink)]">
              {activeListTab === "history"
                ? "Reading History Log"
                : "Saved for Deep Reading"}
            </h2>
            <p className="text-xs text-[var(--ink-muted)] mt-1">
              {activeListTab === "history"
                ? "Every post you have read — click any entry to revisit its summary and takeaways"
                : "Quick access to articles and papers you bookmarked for reference"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveListTab("history")}
              className={`px-3 py-1.5 border text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer transition-colors ${
                activeListTab === "history"
                  ? "bg-[var(--accent)] text-[#111113] border-[var(--accent)]"
                  : "border-[var(--border-dim)] text-[var(--ink-muted)] hover:border-[var(--ink)] hover:text-[var(--ink)]"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>HISTORY ({effectiveHistory.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveListTab("saved")}
              className={`px-3 py-1.5 border text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer transition-colors ${
                activeListTab === "saved"
                  ? "bg-[var(--accent)] text-[#111113] border-[var(--accent)]"
                  : "border-[var(--border-dim)] text-[var(--ink-muted)] hover:border-[var(--ink)] hover:text-[var(--ink)]"
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>SAVED ({bookmarkedArticles.length})</span>
            </button>
          </div>
        </div>

        {activeListTab === "history" ? (
          effectiveHistory.length > 0 ? (
            <div className="mt-4 divide-y divide-[var(--border-dim)]">
              {effectiveHistory.map((art) => (
                <div
                  key={`${art.id}-${art.readAt || "read"}`}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--accent-muted)] px-2 transition-colors cursor-pointer"
                  onClick={() => onOpenArticle && onOpenArticle(art)}
                >
                  <div className="flex items-center gap-3">
                    <span className="meta-tag text-[9px]">
                      {art.categoryLabel || art.category}
                    </span>
                    <h4 className="font-bold text-sm text-[var(--ink)] hover:text-[var(--accent)] transition-colors">
                      {art.title}
                    </h4>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--ink-muted)] self-end sm:self-auto shrink-0">
                    {art.readAt && (
                      <>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(art.readAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <span>•</span>
                      </>
                    )}
                    <span>{art.readTimeMinutes || 5} MIN</span>
                    <span>•</span>
                    <span className="text-[var(--accent)] font-bold">
                      {art.difficulty || "Intermediate"}
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-[var(--accent)]" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 p-8 border border-dashed border-[var(--border-dim)] text-center text-xs text-[var(--ink-muted)]">
              No reading history recorded yet. Open or mark any article as read from the feed to start tracking your history.
            </div>
          )
        ) : bookmarkedArticles.length > 0 ? (
          <div className="mt-4 divide-y divide-[var(--border-dim)]">
            {bookmarkedArticles.map((art) => (
              <div
                key={art.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--accent-muted)] px-2 transition-colors cursor-pointer"
                onClick={() => onOpenArticle && onOpenArticle(art)}
              >
                <div className="flex items-center gap-3">
                  <span className="meta-tag text-[9px]">
                    {art.categoryLabel || art.category}
                  </span>
                  <h4 className="font-bold text-sm text-[var(--ink)] hover:text-[var(--accent)] transition-colors">
                    {art.title}
                  </h4>
                </div>
                <div className="flex items-center gap-3 text-xs text-[var(--ink-muted)] self-end sm:self-auto shrink-0">
                  <span>{art.readTimeMinutes || 5} MIN</span>
                  <span>•</span>
                  <span className="text-[var(--accent)] font-bold">
                    {art.difficulty || "Intermediate"}
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-[var(--accent)]" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 p-8 border border-dashed border-[var(--border-dim)] text-center text-xs text-[var(--ink-muted)]">
            No saved articles yet. Click the bookmark icon on any article card to save it for deep reading.
          </div>
        )}
      </section>
    </div>
  );
};
