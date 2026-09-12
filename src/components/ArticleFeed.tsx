import React, { useState, useMemo } from "react";
import {
  Search,
  Bookmark,
  RefreshCw,
  Sparkles,
  Award,
  GraduationCap,
  Clock,
  ArrowUpRight,
  X,
  Plus
} from "lucide-react";
import { Article, CategoryId, UserProfile } from "../types";
import { ArticleCard } from "./ArticleCard";
import { ArticleModal } from "./ArticleModal";
import { DailyGoalWidget } from "./DailyGoalWidget";
import { CATEGORIES_CONFIG } from "../data/mockDatabase";
import { getArticleCoverImage } from "../utils/imageUtils";

interface ArticleFeedProps {
  articles: Article[];
  userProfile: UserProfile;
  onToggleRead: (articleId: string) => void;
  onToggleBookmark: (articleId: string) => void;
  onSyncLive: () => void;
  isSyncing: boolean;
  onOpenLearningPath?: () => void;
  onTakeQuiz?: (article: Article) => void;
  onCreateArticle?: () => void;
}

const STORAGE_DAILY_GOAL = "devlens.dailyGoal";

export const ArticleFeed: React.FC<ArticleFeedProps> = ({
  articles,
  userProfile,
  onToggleRead,
  onToggleBookmark,
  onSyncLive,
  isSyncing,
  onOpenLearningPath,
  onTakeQuiz,
  onCreateArticle,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>("all");
  const [selectedContentType, setSelectedContentType] = useState<string>("All");
  const [selectedTimeRange, setSelectedTimeRange] = useState<number>(30);
  const [onlyBookmarks, setOnlyBookmarks] = useState(false);
  const [activeModalArticle, setActiveModalArticle] = useState<Article | null>(null);

  // Daily goal state
  const [dailyGoal, setDailyGoal] = useState<number>(() => {
    try {
      const stored = Number(localStorage.getItem(STORAGE_DAILY_GOAL));
      return Number.isFinite(stored) && stored > 0 ? stored : 5;
    } catch {
      return 5;
    }
  });

  const handleGoalChange = (newGoal: number) => {
    setDailyGoal(newGoal);
    try {
      localStorage.setItem(STORAGE_DAILY_GOAL, String(newGoal));
    } catch {
      // ignore
    }
  };

  // Today's read articles
  const todayReadCount = useMemo(() => {
    return articles.filter((a) => a.isRead).length;
  }, [articles]);

  // Filtered articles
  const filteredArticles = useMemo(() => {
    return articles.filter((art) => {
      // Category filter
      if (selectedCategory !== "all" && art.category !== selectedCategory) {
        return false;
      }
      // Content Type filter
      if (selectedContentType !== "All") {
        if (selectedContentType === "News" && art.source === "arXiv") return false;
        if (selectedContentType === "Blogs" && (art.source === "arXiv" || art.source === "Hacker News")) return false;
      }
      // Time range filter
      if (selectedTimeRange > 0) {
        const publishedTime = new Date(art.publishedAt).getTime();
        const cutoff = Date.now() - selectedTimeRange * 24 * 60 * 60 * 1000;
        if (publishedTime < cutoff) return false;
      }
      // Bookmark filter
      if (onlyBookmarks && !art.isBookmarked) {
        return false;
      }
      // Search query
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const matchesTitle = art.title.toLowerCase().includes(q);
        const matchesSummary = art.summary.toLowerCase().includes(q);
        const matchesAuthor = art.author.toLowerCase().includes(q);
        const matchesSkills = art.skillsExtracted?.some((s) => s.toLowerCase().includes(q));
        if (!matchesTitle && !matchesSummary && !matchesAuthor && !matchesSkills) {
          return false;
        }
      }
      return true;
    });
  }, [articles, selectedCategory, selectedContentType, selectedTimeRange, onlyBookmarks, searchQuery]);

  // Featured article (first unread or first overall)
  const featuredArticle = useMemo(() => {
    if (onlyBookmarks || searchQuery.trim() !== "") return null;
    return filteredArticles.find((a) => !a.isRead) || filteredArticles[0] || null;
  }, [filteredArticles, onlyBookmarks, searchQuery]);

  // Secondary articles (excluding featured)
  const secondaryArticles = useMemo(() => {
    if (!featuredArticle) return filteredArticles;
    return filteredArticles.filter((a) => a.id !== featuredArticle.id);
  }, [filteredArticles, featuredArticle]);

  const handleOpenArticle = (article: Article) => {
    setActiveModalArticle(article);
    if (!article.isRead) {
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
            <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl text-[var(--ink)] leading-[0.95] tracking-tight m-0">
              Welcome back, {userProfile.name || "Senior Developer"}
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

            {onOpenLearningPath && (
              <button
                type="button"
                onClick={onOpenLearningPath}
                className="border-2 border-[var(--accent)] bg-[var(--accent)] text-[#111113] hover:bg-transparent hover:text-[var(--accent)] px-4 py-2.5 text-xs font-bold font-display uppercase tracking-wider transition-colors flex items-center gap-2 cursor-pointer"
              >
                <GraduationCap className="w-4 h-4" />
                <span>MY LEARNING ROADMAP</span>
              </button>
            )}

            <button
              type="button"
              onClick={onSyncLive}
              disabled={isSyncing}
              className="border border-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--ink)] px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[var(--accent)] ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "SYNCING..." : "LIVE SYNC"}</span>
            </button>
          </div>
        </div>

        {/* Selected Focus Badges */}
        <div className="pt-4 border-t border-[var(--border-dim)] flex flex-wrap items-center gap-2 font-mono">
          <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--ink-muted)] mr-2">
            TOPICS:
          </span>
          {CATEGORIES_CONFIG.slice(1, 6).map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? "all" : cat.id)}
              className={`text-xs font-bold uppercase px-3 py-1 border transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? "bg-[var(--accent)] text-[#111113] border-[var(--accent)]"
                  : "border-[var(--border-dim)] text-[var(--ink-muted)] hover:border-[var(--ink)] hover:text-[var(--ink)]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </header>

      {/* 2. Filter Bar & Daily Goal Tracker */}
      <section className="card p-6 sm:p-8 border-2 border-[var(--ink)] bg-[var(--bg-surface)] space-y-6 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-center">
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
            {/* Category */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--ink-muted)] mb-1.5">
                CATEGORY
              </label>
              <select
                id="select-filter-category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as CategoryId)}
                className="w-full bg-[var(--bg)] border border-[var(--ink)] text-xs text-[var(--ink)] px-3 py-2.5 focus:border-[var(--accent)] outline-none font-mono"
              >
                <option value="all">ALL CATEGORIES</option>
                {CATEGORIES_CONFIG.filter((c) => c.id !== "all").map((cat) => (
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
                value={selectedContentType}
                onChange={(e) => setSelectedContentType(e.target.value)}
                className="w-full bg-[var(--bg)] border border-[var(--ink)] text-xs text-[var(--ink)] px-3 py-2.5 focus:border-[var(--accent)] outline-none font-mono"
              >
                <option value="All">ALL FORMATS</option>
                <option value="News">NEWS & SYSTEMS</option>
                <option value="Blogs">BLOGS & PAPERS</option>
              </select>
            </div>

            {/* Time Range */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--ink-muted)] mb-1.5">
                TIME HORIZON
              </label>
              <select
                id="select-filter-time-range"
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(Number(e.target.value))}
                className="w-full bg-[var(--bg)] border border-[var(--ink)] text-xs text-[var(--ink)] px-3 py-2.5 focus:border-[var(--accent)] outline-none font-mono"
              >
                <option value={1}>LAST 24 HOURS</option>
                <option value={7}>LAST 7 DAYS</option>
                <option value={30}>LAST 30 DAYS</option>
                <option value={90}>LAST 3 MONTHS</option>
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

        {/* Search and Bookmark Filter */}
        <div className="pt-4 border-t border-[var(--border-dim)] flex flex-col sm:flex-row items-center gap-3 font-mono">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ink-muted)]" />
            <input
              id="input-search-feed"
              type="text"
              placeholder="SEARCH BY TITLE, TOPIC, KEYWORD (E.G. KAFKA, LLM)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--bg)] border border-[var(--ink)] pl-10 pr-10 py-2.5 text-xs text-[var(--ink)] placeholder-[var(--ink-muted)]/60 focus:border-[var(--accent)] outline-none font-mono"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

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
            <span>SAVED PAPERS ({articles.filter((a) => a.isBookmarked).length})</span>
          </button>
        </div>
      </section>

      {/* 3. Featured Story Hero Card */}
      {featuredArticle && (
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
      )}

      {/* 4. Recommended Articles Grid */}
      <section id="recommended-articles-section" className="space-y-4">
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
            [{secondaryArticles.length + (featuredArticle ? 1 : 0)} ARTICLES]
          </span>
        </div>

        {secondaryArticles.length === 0 && !featuredArticle ? (
          <div className="card p-12 text-center border-2 border-[var(--ink)] bg-[var(--bg-surface)] font-mono">
            <h4 className="font-display text-xl text-[var(--ink)]">NO ARTICLES MATCH YOUR FILTERS</h4>
            <p className="text-xs text-[var(--ink-muted)] mt-2">
              Try resetting your category or search query to browse indexed articles.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory("all");
                setSelectedContentType("All");
                setSearchQuery("");
                setOnlyBookmarks(false);
              }}
              className="btn-primary mt-6 max-w-xs mx-auto text-xs"
            >
              RESET FILTERS
            </button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {secondaryArticles.map((article) => (
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
        )}
      </section>

      {/* Detail Modal */}
      <ArticleModal
        article={activeModalArticle}
        onClose={() => setActiveModalArticle(null)}
        onToggleRead={onToggleRead}
        onToggleBookmark={onToggleBookmark}
        onTakeQuiz={onTakeQuiz}
      />
    </div>
  );
};
