import React from "react";
import { BookOpen, Bookmark, TrendingUp, Award, ArrowUpRight, Sparkles } from "lucide-react";
import { CATEGORIES_CONFIG } from "../data/mockDatabase";

export const AnalyticsBoard = ({
  username,
  articles,
  userProfile,
  onOpenArticle,
}) => {
  const readArticles = articles.filter((a) => a.isRead);
  const bookmarkedArticles = articles.filter((a) => a.isBookmarked);

  // Compute category counts
  const categoryCounts = {};
  readArticles.forEach((a) => {
    categoryCounts[a.category] = (categoryCounts[a.category] || 0) + 1;
  });

  // Top category
  let topCategoryKey = "artificial-intelligence";
  let maxCatCount = -1;
  Object.entries(categoryCounts).forEach(([cat, count]) => {
    if (count > maxCatCount) {
      maxCatCount = count;
      topCategoryKey = cat;
    }
  });

  const topCategoryLabel =
    CATEGORIES_CONFIG.find((c) => c.id === topCategoryKey)?.label || "Artificial Intelligence";

  // Level counts
  const beginnerCount = readArticles.filter((a) => a.difficulty === "Beginner").length;
  const intermediateCount = readArticles.filter((a) => a.difficulty === "Intermediate").length;
  const advancedCount = readArticles.filter((a) => a.difficulty === "Advanced").length;

  const totalRead = readArticles.length;
  const totalMinutes = readArticles.reduce((acc, curr) => acc + curr.readTimeMinutes, 0);

  // Category series
  const activeCategories = CATEGORIES_CONFIG.filter((c) => c.id !== "all");
  const categorySeries = activeCategories.map((c) => ({
    id: c.id,
    label: c.label,
    count: categoryCounts[c.id] || 0,
  }));
  const highestCount = Math.max(1, ...categorySeries.map((s) => s.count));

  return (
    <div id="analytics-board" className="w-full space-y-8 animate-fade-in-up text-left">
      {/* Header Card */}
      <section className="card p-6 sm:p-10 border-2 border-[var(--ink)] bg-[var(--bg-surface)] shadow-sm">
        <div className="meta-tag">Personal Insights & Activity</div>
        <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl text-[var(--ink)] leading-[0.95] tracking-tight mt-4">
          Learning Analytics
        </h1>
        <p className="font-mono text-xs sm:text-sm text-[var(--ink-muted)] mt-3 leading-relaxed max-w-xl">
          Activity profile for <span className="text-[var(--accent)] font-bold">{username || "Senior Developer"}</span> derived from {totalRead} tracked reading sessions across {articles.length} indexed engineering papers.
        </p>
      </section>

      {/* 4 Metric Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 font-mono">
        <article className="card p-6 border-2 border-[var(--ink)] bg-[var(--bg-surface)] flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 border border-[var(--ink)] flex items-center justify-center bg-[var(--bg)] text-[var(--ink)]">
            <BookOpen className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--ink-muted)]">TOTAL READ</p>
            <p className="font-display text-2xl font-extrabold text-[var(--ink)]">{totalRead}</p>
          </div>
        </article>

        <article className="card p-6 border-2 border-[var(--ink)] bg-[var(--bg-surface)] flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 border border-[var(--ink)] flex items-center justify-center bg-[var(--bg)] text-[var(--ink)]">
            <Bookmark className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--ink-muted)]">SAVED PAPERS</p>
            <p className="font-display text-2xl font-extrabold text-[var(--ink)]">{bookmarkedArticles.length}</p>
          </div>
        </article>

        <article className="card p-6 border-2 border-[var(--ink)] bg-[var(--bg-surface)] flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 border border-[var(--ink)] flex items-center justify-center bg-[var(--bg)] text-[var(--ink)]">
            <TrendingUp className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--ink-muted)]">TOP DOMAIN</p>
            <p className="font-display text-lg font-bold text-[var(--ink)] truncate max-w-[140px]" title={topCategoryLabel}>
              {topCategoryLabel.split("&")[0].trim()}
            </p>
          </div>
        </article>

        <article className="card p-6 border-2 border-[var(--ink)] bg-[var(--bg-surface)] flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 border border-[var(--ink)] flex items-center justify-center bg-[var(--bg)] text-[var(--ink)]">
            <Award className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--ink-muted)]">TIME INVESTED</p>
            <p className="font-display text-2xl font-extrabold text-[var(--ink)]">{totalMinutes}m</p>
          </div>
        </article>
      </section>

      {/* Detailed Grids */}
      <section className="grid gap-6 lg:grid-cols-2 font-mono">
        {/* Skill Interest Velocity */}
        <article className="card p-6 sm:p-8 border-2 border-[var(--ink)] bg-[var(--bg-surface)] space-y-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border-dim)]">
            <div>
              <h2 className="font-display text-xl sm:text-2xl text-[var(--ink)]">Skill Interest Map</h2>
              <p className="text-xs text-[var(--ink-muted)] mt-1">Reading velocity by engineering specialization</p>
            </div>
            <span className="meta-tag text-[10px]">{totalRead} READ</span>
          </div>

          <div className="space-y-4">
            {categorySeries.map((item) => {
              const pct = totalRead > 0 ? Math.round((item.count / totalRead) * 100) : 0;
              const barWidth = Math.round((item.count / highestCount) * 100);

              return (
                <div key={item.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--ink)]">{item.label}</span>
                    <span className="text-[var(--accent)] font-bold">{item.count} read ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full bg-[var(--bg)] border border-[var(--border-dim)] overflow-hidden">
                    <div
                      className="h-full bg-[var(--accent)] transition-all duration-300"
                      style={{ width: `${Math.max(barWidth, item.count > 0 ? 5 : 0)}%` }}
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
                <h2 className="font-display text-xl sm:text-2xl text-[var(--ink)]">Difficulty Depth</h2>
                <p className="text-xs text-[var(--ink-muted)] mt-1">Distribution across conceptual complexity tiers</p>
              </div>
              <span className="meta-tag-accent text-[10px]">BALANCED</span>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              <div className="border border-[var(--border-dim)] p-4 bg-[var(--bg)]">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--ink-muted)] block">BEGINNER</span>
                <span className="font-display text-3xl font-extrabold text-[var(--ink)] mt-2 block">{beginnerCount}</span>
                <span className="text-[9px] text-[var(--ink-muted)]">Foundations</span>
              </div>

              <div className="border border-[var(--accent)]/50 p-4 bg-[var(--accent-muted)]">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--accent)] block">INTERMEDIATE</span>
                <span className="font-display text-3xl font-extrabold text-[var(--accent)] mt-2 block">{intermediateCount}</span>
                <span className="text-[9px] text-[var(--ink-muted)]">Architectures</span>
              </div>

              <div className="border border-[var(--border-dim)] p-4 bg-[var(--bg)]">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--ink-muted)] block">ADVANCED</span>
                <span className="font-display text-3xl font-extrabold text-[var(--ink)] mt-2 block">{advancedCount}</span>
                <span className="text-[9px] text-[var(--ink-muted)]">RFCs & Preprints</span>
              </div>
            </div>
          </div>

          <div className="p-4 border border-[var(--accent)] bg-[var(--accent-muted)] text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-[var(--accent)] uppercase tracking-wider text-[10px]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Senior Developer Advisory</span>
            </div>
            <p className="text-[var(--ink)] leading-relaxed">
              Your reading velocity is highest in distributed systems and AI serving pipelines. Adding 1-2 advanced security/cryptography papers each week will strengthen your cross-disciplinary engineering readiness.
            </p>
          </div>
        </article>
      </section>

      {/* Saved Papers Table */}
      {bookmarkedArticles.length > 0 && (
        <section className="card p-6 sm:p-8 border-2 border-[var(--ink)] bg-[var(--bg-surface)] font-mono shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border-dim)]">
            <div>
              <h2 className="font-display text-xl sm:text-2xl text-[var(--ink)]">Saved for Deep Reading</h2>
              <p className="text-xs text-[var(--ink-muted)] mt-1">Quick access to articles and papers you flagged</p>
            </div>
            <span className="meta-tag text-[10px]">{bookmarkedArticles.length} SAVED</span>
          </div>

          <div className="mt-4 divide-y divide-[var(--border-dim)]">
            {bookmarkedArticles.map((art) => (
              <div
                key={art.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--accent-muted)] px-2 transition-colors cursor-pointer"
                onClick={() => onOpenArticle(art)}
              >
                <div className="flex items-center gap-3">
                  <span className="meta-tag text-[9px]">{art.categoryLabel}</span>
                  <h4 className="font-bold text-sm text-[var(--ink)] hover:text-[var(--accent)] transition-colors">
                    {art.title}
                  </h4>
                </div>
                <div className="flex items-center gap-3 text-xs text-[var(--ink-muted)] self-end sm:self-auto shrink-0">
                  <span>{art.readTimeMinutes} MIN</span>
                  <span>•</span>
                  <span className="text-[var(--accent)] font-bold">{art.difficulty}</span>
                  <ArrowUpRight className="w-4 h-4 text-[var(--accent)]" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
