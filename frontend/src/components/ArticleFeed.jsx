import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  Bookmark,
  Sparkles,
  Award,
  Clock,
  ArrowUpRight,
  X,
  Plus,
  Filter,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { ArticleCard } from "./ArticleCard";
import { DailyGoalWidget } from "./DailyGoalWidget";
import { CATEGORIES_CONFIG } from "../data/mockDatabase";
import { getArticleCoverImage } from "../utils/imageUtils";

const STORAGE_DAILY_GOAL = "devlens.dailyGoal";

export const ArticleFeed = ({
  articles = [],
  isLoading = false,
  userProfile,
  onOpenArticle,
  onToggleRead,
  onToggleBookmark,
  onTakeQuiz,
  onCreateArticle,
}) => {
  // Draft filter state (controlled by form inputs before clicking "APPLY")
  const [draftCategory, setDraftCategory] = useState("all");
  const [draftContentType, setDraftContentType] = useState("All");
  const [draftTimeRange, setDraftTimeRange] = useState(0); // 0 = ALL TIME
  const [draftSearchQuery, setDraftSearchQuery] = useState("");

  // Applied filter state (drives the active filtered article list)
  const [appliedCategory, setAppliedCategory] = useState("all");
  const [appliedContentType, setAppliedContentType] = useState("All");
  const [appliedTimeRange, setAppliedTimeRange] = useState(0);
  const [appliedSearchQuery, setAppliedSearchQuery] = useState("");
  const [onlyBookmarks, setOnlyBookmarks] = useState(false);

  // Pagination / Load More state (show 15 articles initially)
  const [visibleCount, setVisibleCount] = useState(15);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Daily goal state
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

  // User's formatted display name
  const cleanName = useMemo(() => {
    const raw = userProfile?.name || "Senior Developer";
    return raw
      .trim()
      .replace(/\s+/g, " ")
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }, [userProfile?.name]);

  // Categories subscribed by the user (or all if none selected)
  const userCategories = useMemo(() => {
    const selected = userProfile?.selectedCategories || [];
    if (!Array.isArray(selected) || selected.length === 0) {
      return CATEGORIES_CONFIG.filter((c) => c.id !== "all");
    }
    return CATEGORIES_CONFIG.filter((c) => selected.includes(c.id));
  }, [userProfile?.selectedCategories]);

  // Reset category to "all" if current selection is no longer in user's subscribed topics
  useEffect(() => {
    if (appliedCategory !== "all" && userCategories.length > 0) {
      if (!userCategories.some((c) => c.id === appliedCategory)) {
        setAppliedCategory("all");
        setDraftCategory("all");
      }
    }
  }, [userCategories, appliedCategory]);

  // Today's read articles
  const todayReadCount = useMemo(() => {
    return articles.filter((a) => a.isRead).length;
  }, [articles]);

  // Apply filters action
  const handleApplyFilters = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setAppliedCategory(draftCategory);
    setAppliedContentType(draftContentType);
    setAppliedTimeRange(draftTimeRange);
    setAppliedSearchQuery(draftSearchQuery);
    setVisibleCount(15);
  };

  // Reset filters action
  const handleResetFilters = () => {
    setDraftCategory("all");
    setDraftContentType("All");
    setDraftTimeRange(0);
    setDraftSearchQuery("");
    setAppliedCategory("all");
    setAppliedContentType("All");
    setAppliedTimeRange(0);
    setAppliedSearchQuery("");
    setOnlyBookmarks(false);
    setVisibleCount(15);
  };

  // Quick Topic Pills: instant category jump
  const handleQuickTopicClick = (catId) => {
    const nextCategory = appliedCategory === catId ? "all" : catId;
    setDraftCategory(nextCategory);
    setAppliedCategory(nextCategory);
    setVisibleCount(15);
  };

  // Filtered articles list
  const filteredArticles = useMemo(() => {
    return articles.filter((art) => {
      // Category filter: match chosen category or limit to user-subscribed topics when 'all'
      if (appliedCategory !== "all") {
        if (art.category !== appliedCategory) {
          return false;
        }
      } else if (userCategories.length > 0) {
        if (!userCategories.some((c) => c.id === art.category)) {
          return false;
        }
      }

      // Content Type filter
      if (appliedContentType !== "All") {
        if (appliedContentType === "News" && art.source === "arXiv") return false;
        if (appliedContentType === "Blogs" && (art.source === "arXiv" || art.source === "Hacker News")) return false;
      }

      // Time range filter (0 = All time)
      if (appliedTimeRange > 0) {
        const publishedTime = new Date(art.publishedAt || art.published_at || art.created_at).getTime();
        const cutoff = Date.now() - appliedTimeRange * 24 * 60 * 60 * 1000;
        if (publishedTime < cutoff) return false;
      }

      // Bookmark filter
      if (onlyBookmarks && !art.isBookmarked) {
        return false;
      }

      // Search query
      if (appliedSearchQuery.trim() !== "") {
        const q = appliedSearchQuery.toLowerCase();
        const matchesTitle = art.title?.toLowerCase().includes(q);
        const matchesSummary = art.summary?.toLowerCase().includes(q);
        const matchesAuthor = art.author?.toLowerCase().includes(q);
        const matchesSkills = art.skillsExtracted?.some((s) => s.toLowerCase().includes(q));
        if (!matchesTitle && !matchesSummary && !matchesAuthor && !matchesSkills) {
          return false;
        }
      }
      return true;
    });
  }, [
    articles,
    appliedCategory,
    userCategories,
    appliedContentType,
    appliedTimeRange,
    onlyBookmarks,
    appliedSearchQuery,
  ]);

  // Featured article (first unread or first overall)
  const featuredArticle = useMemo(() => {
    if (onlyBookmarks || appliedSearchQuery.trim() !== "") return null;
    return filteredArticles.find((a) => !a.isRead) || filteredArticles[0] || null;
  }, [filteredArticles, onlyBookmarks, appliedSearchQuery]);

  // Secondary articles (excluding featured)
  const secondaryArticles = useMemo(() => {
    if (!featuredArticle) return filteredArticles;
    return filteredArticles.filter((a) => a.id !== featuredArticle.id);
  }, [filteredArticles, featuredArticle]);

  // Sliced articles for display (15 items initially, loaded in increments of 15)
  const displayedSecondary = useMemo(() => {
    const secondaryLimit = Math.max(0, visibleCount - (featuredArticle ? 1 : 0));
    return secondaryArticles.slice(0, secondaryLimit);
  }, [secondaryArticles, visibleCount, featuredArticle]);

  const totalDisplayed = (featuredArticle ? 1 : 0) + displayedSecondary.length;
  const hasMore = totalDisplayed < filteredArticles.length;

  // Handle Load More with smooth animated loading effect
  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => prev + 15);
      setIsLoadingMore(false);
    }, 450);
  };

  const handleOpenArticle = (article) => {
    if (onOpenArticle) {
      onOpenArticle(article);
    }
    if (!article.isRead && onToggleRead) {
      onToggleRead(article.id);
    }
  };

  return (
    <div id="article-feed-view" className="w-full space-y-8 animate-fade-in-up text-left">
      {/* 1. Today's Briefing Header */}
      <header className="card p-6 sm:p-10 border-2 border-[var(--ink)] bg-[var(--bg-surface)] space-y-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="meta-tag">Today&apos;s Briefing</div>
            <h1 className="font-display text-2xl sm:text-4xl lg:text-5xl text-[var(--ink)] leading-snug tracking-tight m-0">
              Welcome back, {cleanName}
            </h1>
            <p className="font-mono text-xs sm:text-sm text-[var(--ink-muted)] max-w-2xl leading-relaxed">
              Real-time engineering papers, distributed systems RFCs, and production post-mortems aggregated from Dev.to, Hacker News, and arXiv.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 font-mono">
            {onCreateArticle && (
              <button
                id="btn-feed-new-article"
                type="button"
                onClick={onCreateArticle}
                className="border-2 border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)] hover:bg-[var(--accent)] hover:border-[var(--accent)] hover:text-[#111113] px-4 py-2.5 text-xs font-bold font-display uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>NEW ARTICLE</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Category Jump Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[var(--border-dim)] font-mono">
          <span className="text-[10px] font-bold tracking-widest text-[var(--ink-muted)] uppercase mr-1">
            TOPICS:
          </span>
          <button
            onClick={() => handleQuickTopicClick("all")}
            className={`text-xs font-bold uppercase px-3 py-1 border transition-all cursor-pointer ${
              appliedCategory === "all"
                ? "bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]"
                : "border-[var(--border-dim)] text-[var(--ink-muted)] hover:border-[var(--ink)] hover:text-[var(--ink)]"
            }`}
          >
            ALL
          </button>
          {userCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleQuickTopicClick(cat.id)}
              className={`text-xs font-bold uppercase px-3 py-1 border transition-all cursor-pointer ${
                appliedCategory === cat.id
                  ? "bg-[var(--accent)] text-[#111113] border-[var(--accent)]"
                  : "border-[var(--border-dim)] text-[var(--ink-muted)] hover:border-[var(--ink)] hover:text-[var(--ink)]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </header>

      {/* 2. Filter Bar with Apply Button & Daily Goal Tracker */}
      <section className="card p-6 sm:p-8 border-2 border-[var(--ink)] bg-[var(--bg-surface)] space-y-6 shadow-sm">
        <form onSubmit={handleApplyFilters} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-center">
            {/* Filter Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
              {/* Category */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--ink-muted)] mb-1.5">
                  CATEGORY
                </label>
                <select
                  id="select-filter-category"
                  value={draftCategory}
                  onChange={(e) => setDraftCategory(e.target.value)}
                  className="w-full bg-[var(--bg)] border border-[var(--ink)] text-xs text-[var(--ink)] px-3 py-2.5 focus:border-[var(--accent)] outline-none font-mono"
                >
                  <option value="all">ALL SUBSCRIBED ({userCategories.length})</option>
                  {userCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Content Type */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--ink-muted)] mb-1.5">
                  FORMAT
                </label>
                <select
                  id="select-filter-content-type"
                  value={draftContentType}
                  onChange={(e) => setDraftContentType(e.target.value)}
                  className="w-full bg-[var(--bg)] border border-[var(--ink)] text-xs text-[var(--ink)] px-3 py-2.5 focus:border-[var(--accent)] outline-none font-mono"
                >
                  <option value="All">ALL FORMATS</option>
                  <option value="News">NEWS & SYSTEMS</option>
                  <option value="Blogs">BLOGS & PAPERS</option>
                </select>
              </div>

              {/* Time Range (Removed "LAST 3 MONTHS" option) */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--ink-muted)] mb-1.5">
                  TIME HORIZON
                </label>
                <select
                  id="select-filter-time-range"
                  value={draftTimeRange}
                  onChange={(e) => setDraftTimeRange(Number(e.target.value))}
                  className="w-full bg-[var(--bg)] border border-[var(--ink)] text-xs text-[var(--ink)] px-3 py-2.5 focus:border-[var(--accent)] outline-none font-mono"
                >
                  <option value={0}>ALL TIME</option>
                  <option value={1}>LAST 24 HOURS</option>
                  <option value={7}>LAST 7 DAYS</option>
                  <option value={30}>LAST 30 DAYS</option>
                </select>
              </div>
            </div>

            {/* Daily Goal Widget */}
            <DailyGoalWidget
              todayReadCount={todayReadCount}
              dailyGoal={dailyGoal}
              onGoalChange={handleGoalChange}
            />
          </div>

          {/* Search, Apply and Bookmark Filter Bar */}
          <div className="pt-4 border-t border-[var(--border-dim)] flex flex-col md:flex-row items-center gap-3 font-mono">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ink-muted)]" />
              <input
                id="input-search-feed"
                type="text"
                placeholder="SEARCH BY TITLE, TOPIC, KEYWORD (E.G. KAFKA, LLM)..."
                value={draftSearchQuery}
                onChange={(e) => setDraftSearchQuery(e.target.value)}
                className="w-full bg-[var(--bg)] border border-[var(--ink)] pl-10 pr-10 py-2.5 text-xs text-[var(--ink)] placeholder-[var(--ink-muted)]/60 focus:border-[var(--accent)] outline-none font-mono"
              />
              {draftSearchQuery && (
                <button
                  type="button"
                  onClick={() => setDraftSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* APPLY Button */}
            <button
              id="btn-apply-filters"
              type="submit"
              className="px-6 py-2.5 border-2 border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)] hover:bg-[var(--accent)] hover:border-[var(--accent)] hover:text-[#111113] text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 shrink-0 w-full sm:w-auto cursor-pointer shadow-sm tracking-wider"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>APPLY</span>
            </button>

            {/* RESET Button */}
            <button
              id="btn-reset-filters"
              type="button"
              onClick={handleResetFilters}
              title="Reset all filters"
              className="px-3.5 py-2.5 border border-[var(--border-dim)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:border-[var(--ink)] text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 shrink-0 w-full sm:w-auto cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RESET</span>
            </button>

            {/* Saved Papers Toggle */}
            <button
              type="button"
              onClick={() => setOnlyBookmarks(!onlyBookmarks)}
              className={`px-4 py-2.5 border text-xs font-bold uppercase transition-all flex items-center gap-2 shrink-0 w-full sm:w-auto justify-center cursor-pointer ${
                onlyBookmarks
                  ? "bg-[var(--accent)] text-[#111113] border-[var(--accent)]"
                  : "border-[var(--ink)] text-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${onlyBookmarks ? "fill-current" : ""}`} />
              <span>SAVED ({articles.filter((a) => a.isBookmarked).length})</span>
            </button>
          </div>
        </form>
      </section>

      {/* 3. Featured Story / Initial Loading Skeleton */}
      {isLoading ? (
        <section className="card border-2 border-[var(--border-dim)] bg-[var(--bg-surface)] overflow-hidden shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] items-stretch">
            <div className="h-64 sm:h-80 lg:h-full min-h-[280px] bg-[var(--border-dim)]/40 animate-pulse border-b-2 lg:border-b-0 lg:border-r-2 border-[var(--border-dim)]" />
            <div className="p-6 sm:p-10 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="h-4 w-28 bg-[var(--border-dim)]/60 animate-pulse" />
                <div className="space-y-2">
                  <div className="h-7 w-full bg-[var(--border-dim)]/60 animate-pulse" />
                  <div className="h-7 w-3/4 bg-[var(--border-dim)]/60 animate-pulse" />
                </div>
                <div className="space-y-2 pt-2">
                  <div className="h-3 w-full bg-[var(--border-dim)]/30 animate-pulse" />
                  <div className="h-3 w-5/6 bg-[var(--border-dim)]/30 animate-pulse" />
                </div>
              </div>
              <div className="pt-4 border-t border-[var(--border-dim)] flex justify-between items-center">
                <div className="h-3 w-36 bg-[var(--border-dim)]/40 animate-pulse" />
                <div className="h-4 w-24 bg-[var(--border-dim)]/50 animate-pulse" />
              </div>
            </div>
          </div>
        </section>
      ) : featuredArticle ? (
        <section
          id="featured-story-section"
          className="card border-2 border-[var(--ink)] hover:border-[var(--accent)] bg-[var(--bg-surface)] overflow-hidden cursor-pointer transition-colors shadow-sm"
          onClick={() => handleOpenArticle(featuredArticle)}
        >
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] items-stretch">
            {/* Image Column */}
            <div className="relative h-64 sm:h-80 lg:h-full min-h-[280px] bg-[var(--bg)] border-b-2 lg:border-b-0 lg:border-r-2 border-[var(--border-dim)] overflow-hidden">
              <img
                src={getArticleCoverImage(
                  featuredArticle.id,
                  featuredArticle.category,
                  featuredArticle.imageUrl
                )}
                alt={featuredArticle.title}
                className="w-full h-full object-cover grayscale contrast-125"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/20" />
              <div className="absolute top-4 left-4">
                <span className="bg-[var(--bg)] border border-[var(--ink)] text-[var(--ink)] font-mono text-[10px] uppercase font-bold px-3 py-1 shadow-sm">
                  {featuredArticle.source}
                </span>
              </div>
            </div>

            {/* Editorial Content */}
            <div className="p-6 sm:p-10 flex flex-col justify-between">
              <div>
                <div className="meta-tag-accent">Featured Story</div>

                <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[var(--ink)] leading-[1] tracking-tight mt-4 hover:text-[var(--accent)] transition-colors">
                  {featuredArticle.title}
                </h2>

                <p className="font-mono text-xs sm:text-sm text-[var(--ink-muted)] mt-4 leading-relaxed line-clamp-3">
                  {featuredArticle.summary}
                </p>
              </div>

              <div className="mt-8 pt-4 border-t border-[var(--border-dim)] flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
                <div className="flex items-center gap-3 text-[var(--ink-muted)] uppercase tracking-widest text-[10px]">
                  <span className="text-[var(--accent)] font-bold">{featuredArticle.categoryLabel}</span>
                  <span>•</span>
                  <span>{featuredArticle.readTimeMinutes} MIN</span>
                  <span>•</span>
                  <span>{featuredArticle.difficulty}</span>
                </div>

                <span className="font-bold text-[var(--ink)] hover:text-[var(--accent)] flex items-center gap-1">
                  <span>READ SUMMARY</span>
                  <ArrowUpRight className="w-4 h-4 text-[var(--accent)]" />
                </span>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* 4. Recommended Articles Grid & Load More */}
      <section id="recommended-articles-section" className="space-y-6">
        <div className="flex items-center justify-between border-b-2 border-[var(--border-dim)] pb-3 font-mono">
          <div>
            <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-[var(--ink)]">
              Recommended Articles
            </h3>
            <p className="text-xs text-[var(--ink-muted)] mt-1">
              Select any article to view executive summaries, architecture impacts, and quiz assessments.
            </p>
          </div>
          <span className="text-xs font-bold text-[var(--accent)]">
            {isLoading
              ? "[FETCHING...]"
              : `[SHOWING ${totalDisplayed} OF ${filteredArticles.length} ARTICLES]`}
          </span>
        </div>

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="card border-2 border-[var(--border-dim)] bg-[var(--bg-surface)] flex flex-col justify-between overflow-hidden shadow-sm"
              >
                <div>
                  <div className="h-44 w-full bg-[var(--border-dim)]/40 animate-pulse border-b-2 border-[var(--border-dim)]" />
                  <div className="p-5 sm:p-6 space-y-3">
                    <div className="h-3 w-24 bg-[var(--border-dim)]/60 animate-pulse" />
                    <div className="space-y-2">
                      <div className="h-5 w-full bg-[var(--border-dim)]/60 animate-pulse" />
                      <div className="h-5 w-2/3 bg-[var(--border-dim)]/60 animate-pulse" />
                    </div>
                    <div className="space-y-1.5 pt-2">
                      <div className="h-3 w-full bg-[var(--border-dim)]/30 animate-pulse" />
                      <div className="h-3 w-5/6 bg-[var(--border-dim)]/30 animate-pulse" />
                    </div>
                    <div className="pt-4 border-t border-[var(--border-dim)] flex justify-between">
                      <div className="h-3 w-20 bg-[var(--border-dim)]/40 animate-pulse" />
                      <div className="h-3 w-12 bg-[var(--border-dim)]/40 animate-pulse" />
                    </div>
                  </div>
                </div>
                <div className="px-5 sm:px-6 py-3.5 border-t-2 border-[var(--border-dim)] bg-[var(--bg-surface)] flex justify-between items-center">
                  <div className="h-3 w-28 bg-[var(--border-dim)]/50 animate-pulse" />
                  <div className="h-5 w-16 bg-[var(--border-dim)]/40 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : secondaryArticles.length === 0 && !featuredArticle ? (
          <div className="card p-12 text-center border-2 border-[var(--ink)] bg-[var(--bg-surface)] font-mono">
            <h4 className="font-display text-xl text-[var(--ink)]">NO ARTICLES MATCH YOUR FILTERS</h4>
            <p className="text-xs text-[var(--ink-muted)] mt-2">
              Try resetting your category or search query to browse indexed articles.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="btn-primary mt-6 max-w-xs mx-auto text-xs"
            >
              RESET FILTERS
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {displayedSecondary.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  onOpenArticle={handleOpenArticle}
                  onToggleRead={onToggleRead}
                  onToggleBookmark={onToggleBookmark}
                  onTakeQuiz={onTakeQuiz}
                />
              ))}
            </div>

            {/* Skeleton loading cards while fetching next batch */}
            {isLoadingMore && (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-6 animate-fade-in">
                {[1, 2, 3].map((idx) => (
                  <div
                    key={`loading-more-${idx}`}
                    className="card border-2 border-[var(--border-dim)] bg-[var(--bg-surface)] p-5 space-y-4 animate-pulse shadow-sm"
                  >
                    <div className="h-44 bg-[var(--border-dim)]/40 w-full rounded" />
                    <div className="h-4 bg-[var(--border-dim)]/60 w-3/4 rounded" />
                    <div className="h-3 bg-[var(--border-dim)]/40 w-full rounded" />
                    <div className="h-3 bg-[var(--border-dim)]/30 w-5/6 rounded" />
                  </div>
                ))}
              </div>
            )}

            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center pt-8 pb-4 font-mono">
                <button
                  id="btn-feed-load-more"
                  type="button"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="border-2 border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)] hover:bg-[var(--accent)] hover:border-[var(--accent)] hover:text-[#111113] px-8 py-3.5 text-xs font-bold font-mono tracking-widest uppercase transition-all flex items-center gap-3 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
                      <span>LOADING ARTICLES...</span>
                    </>
                  ) : (
                    <>
                      <span>LOAD MORE ARTICLES ({totalDisplayed} of {filteredArticles.length})</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};
