import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  X,
  ExternalLink,
  Clock,
  Calendar,
  CheckCircle2,
  Bookmark,
  Award,
  ThumbsUp,
  Sparkles,
  BookOpen,
  Cpu,
  Code2,
  Copy,
  Check,
  Layers,
} from "lucide-react";
import { getArticleCoverImage } from "../utils/imageUtils";

export const ArticleModal = ({
  article,
  onClose,
  onToggleRead,
  onToggleBookmark,
  onUpvote,
  onTakeQuiz,
  onSelectArticle,
}) => {
  const cardRef = useRef(null);
  const [viewMode, setViewMode] = useState("overview"); // "overview" | "deepdive" | "reader"
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Fetch local TF-IDF recommendations when article opens
  useEffect(() => {
    if (!article?.id) return;
    setRecommendations([]);
    setLoadingRecs(true);
    fetch(`/api/articles/${article.id}/recommendations?limit=3`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.recommendations) {
          setRecommendations(data.recommendations);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingRecs(false));
  }, [article?.id]);

  // Lock body scroll and reset modal scroll to top when opened
  useEffect(() => {
    if (!article) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    if (cardRef.current) {
      cardRef.current.scrollTop = 0;
    }

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [article, onClose]);

  const coverImage = useMemo(() => {
    if (!article) return "";
    return getArticleCoverImage(article.id, article.category, article.imageUrl);
  }, [article]);

  const formattedDate = useMemo(() => {
    if (!article?.publishedAt) return "Recently";
    try {
      const d = new Date(article.publishedAt);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
    } catch {
      // ignore
    }
    return "Recently";
  }, [article?.publishedAt]);

  if (!article) return null;

  return (
    <div
      id="article-detail-modal-backdrop"
      className="modal-backdrop animate-fade-in-up"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        ref={cardRef}
        id={`article-detail-modal-${article.id}`}
        className="modal-card p-4 sm:p-10 relative border-2 border-[var(--ink)] bg-[var(--bg-surface)] text-left shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-5 sm:right-5 z-10 w-8 h-8 sm:w-9 sm:h-9 border border-[var(--ink)] bg-[var(--bg-surface)] hover:bg-[var(--accent)] hover:border-[var(--accent)] hover:text-[#111113] text-[var(--ink)] flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Cover Image - Compact Editorial Banner */}
        <div className="relative w-full h-28 sm:h-32 border-2 border-[var(--border-dim)] overflow-hidden mb-4 bg-[var(--bg)]">
          <img
            src={coverImage}
            alt={article.title}
            className="w-full h-full object-cover grayscale contrast-125"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)]/90 via-transparent to-transparent" />
          <div className="absolute bottom-2.5 left-3 right-3 sm:bottom-3 sm:left-4 sm:right-4 flex flex-wrap items-center justify-between gap-2 font-mono">
            <span className="meta-tag-accent bg-[var(--bg-surface)]">
              {article.categoryLabel}
            </span>
            <span className="bg-[var(--bg-surface)] border border-[var(--ink)] text-[var(--ink)] text-[10px] uppercase font-bold px-2 sm:px-2.5 py-0.5 shadow-sm">
              {article.source}
            </span>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--border-dim)] font-mono text-xs">
          <div className="flex items-center gap-3 text-[var(--ink-muted)] uppercase tracking-wider text-[11px]">
            <span className="flex items-center gap-1.5 text-[var(--accent)] font-bold">
              <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
              {article.readTimeMinutes} MIN
            </span>
            <span>•</span>
            <span>{formattedDate}</span>
            <span>•</span>
            <span className="text-[var(--accent)] font-bold">{article.difficulty}</span>
          </div>

          <div className="flex items-center gap-2">
            {onToggleBookmark && (
              <button
                type="button"
                onClick={() => onToggleBookmark(article.id)}
                className={`px-3 py-1.5 border font-mono text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                  article.isBookmarked
                    ? "bg-[var(--accent)] text-[#111113] border-[var(--accent)]"
                    : "border-[var(--ink)]/50 text-[var(--ink)] hover:border-[var(--ink)]"
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${article.isBookmarked ? "fill-current" : ""}`} />
                <span>{article.isBookmarked ? "SAVED" : "SAVE"}</span>
              </button>
            )}

            {onToggleRead && (
              <button
                type="button"
                onClick={() => onToggleRead(article.id)}
                className={`px-3 py-1.5 border font-mono text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                  article.isRead
                    ? "bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]"
                    : "border-[var(--ink)]/50 text-[var(--ink)] hover:border-[var(--ink)]"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{article.isRead ? "READ" : "MARK READ"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Title in Syne */}
        <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-[var(--ink)] leading-[1.05] tracking-tight mt-6">
          {article.title}
        </h2>
        <p className="font-mono text-xs text-[var(--ink-muted)] uppercase tracking-widest mt-2">
          BY <span className="text-[var(--ink)] font-bold">{article.author}</span>
        </p>

        {/* Content Mode Navigation Tabs */}
        <div className="mt-6 flex items-center gap-1.5 sm:gap-2 border-b-2 border-[var(--border-dim)] pb-2 font-mono text-xs overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setViewMode("overview")}
            className={`px-3 py-1.5 font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === "overview"
                ? "bg-[var(--ink)] text-[var(--bg)] border border-[var(--ink)]"
                : "text-[var(--ink-muted)] hover:text-[var(--ink)] border border-transparent"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>OVERVIEW</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("deepdive")}
            className={`px-3 py-1.5 font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === "deepdive"
                ? "bg-[var(--accent)] text-[#111113] border border-[var(--accent)]"
                : "text-[var(--ink-muted)] hover:text-[var(--accent)] border border-transparent"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>DEEP DIVE ANALYSIS</span>
            <span className="text-[9px] bg-[var(--ink)]/10 px-1 py-0.5 rounded font-mono uppercase tracking-wider">
              {article.deepDive ? "AI EXPANDED" : "SYNTHESIS"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("reader")}
            className={`px-3 py-1.5 font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === "reader"
                ? "bg-[var(--ink)] text-[var(--bg)] border border-[var(--ink)]"
                : "text-[var(--ink-muted)] hover:text-[var(--ink)] border border-transparent"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>CLEAN READER</span>
          </button>
        </div>

        {/* Tab 1: Executive Overview */}
        {viewMode === "overview" && (
          <div className="animate-fade-in space-y-6 mt-5">
            {/* Executive Summary */}
            <div className="font-sans text-sm sm:text-base leading-relaxed text-[var(--ink)]">
              {article.summary}
            </div>

            {/* Why It Matters Callout */}
            {article.whyItMatters && (
              <div className="border-2 border-[var(--accent)] bg-[var(--accent-muted)] p-4 sm:p-5 text-left">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
                  WHY IT MATTERS TO SYSTEM ARCHITECTS
                </p>
                <p className="mt-2 font-sans text-sm leading-relaxed text-[var(--ink)]">
                  {article.whyItMatters}
                </p>
              </div>
            )}

            {/* Key Takeaways */}
            {article.keyTakeaways && article.keyTakeaways.length > 0 && (
              <div>
                <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                  KEY ENGINEERING TAKEAWAYS
                </h3>
                <ul className="mt-3 space-y-2.5 font-sans text-xs sm:text-sm text-[var(--ink)]">
                  {article.keyTakeaways.map((takeaway, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="w-1.5 h-1.5 bg-[var(--accent)] mt-2 shrink-0" />
                      <span>{takeaway}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Skills Covered */}
            {article.skillsExtracted && article.skillsExtracted.length > 0 && (
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                  DOMAIN CONCEPTS & SKILLS
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {article.skillsExtracted.map((skill) => (
                    <span
                      key={skill}
                      className="font-mono text-xs px-3 py-1 border border-[var(--border-dim)] text-[var(--ink)]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Architecture Deep-Dive */}
        {viewMode === "deepdive" && (
          <div className="animate-fade-in space-y-6 mt-5">
            <div className="border-l-2 border-[var(--accent)] pl-4 py-1">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
                PRINCIPAL ARCHITECTURAL BREAKDOWN
              </span>
              <p className="font-sans text-xs text-[var(--ink-muted)] mt-1">
                Grounded analysis of underlying mechanisms, engineering trade-offs, and operational failure modes.
              </p>
            </div>

            {/* Deep Dive Text */}
            <div className="font-sans text-sm sm:text-base leading-relaxed text-[var(--ink)] space-y-4">
              {article.deepDive ? (
                article.deepDive.split("\n\n").map((para, i) => (
                  <p key={i} className="leading-relaxed">
                    {para}
                  </p>
                ))
              ) : (
                <>
                  <p className="leading-relaxed">
                    The core engineering paradigm described in <strong className="text-[var(--accent)]">{article.title}</strong> addresses critical operational and structural challenges in <span className="font-bold">{article.categoryLabel}</span>. Production distributed services adopting this pattern prioritize predictable tail latency, modular separation of concerns, and automated recovery boundaries.
                  </p>
                  <p className="leading-relaxed">
                    {article.whyItMatters || article.summary}
                  </p>
                  <p className="leading-relaxed">
                    When evaluating this approach against legacy patterns, architects must balance initial implementation complexity against long-term maintenance overhead. Key trade-offs include serialization costs, network partition tolerance, and strict schema validation boundaries across downstream consumers.
                  </p>
                </>
              )}
            </div>

            {/* Code / Architecture Pattern Box */}
            {article.codeSnippet && (
              <div className="border border-[var(--border-dim)] bg-[var(--bg)] p-4 text-xs font-mono rounded-none">
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-[var(--border-dim)] text-[var(--ink-muted)]">
                  <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-[var(--accent)]">
                    <Code2 className="w-3.5 h-3.5" />
                    <span>IMPLEMENTATION PATTERN / CONFIG</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(article.codeSnippet);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    className="flex items-center gap-1 text-[10px] text-[var(--ink-muted)] hover:text-[var(--accent)] cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCode ? "COPIED" : "COPY"}</span>
                  </button>
                </div>
                <pre className="overflow-x-auto text-[var(--ink)] leading-relaxed p-1">
                  <code>{article.codeSnippet}</code>
                </pre>
              </div>
            )}

            {/* Trade-off Matrix Callout */}
            <div className="border border-[var(--border-dim)] bg-[var(--bg)] p-4 space-y-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--accent)]">
                PRODUCTION ARCHITECTURAL TRADE-OFFS
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                <div className="p-2.5 border border-[var(--border-dim)] bg-[var(--bg-surface)]">
                  <span className="font-bold text-emerald-500 dark:text-emerald-400 block mb-1">PROS & ADVANTAGES</span>
                  <p className="font-sans text-[var(--ink-muted)] text-xs leading-relaxed">
                    Decoupled state mutation, horizontal throughput elasticity, and verified failure isolation.
                  </p>
                </div>
                <div className="p-2.5 border border-[var(--border-dim)] bg-[var(--bg-surface)]">
                  <span className="font-bold text-amber-600 dark:text-amber-400 block mb-1">CONS & OVERHEAD</span>
                  <p className="font-sans text-[var(--ink-muted)] text-xs leading-relaxed">
                    Higher operational monitoring requirements, eventual consistency trade-offs, and debugging complexity.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Full Clean Reader */}
        {viewMode === "reader" && (
          <div className="animate-fade-in space-y-5 mt-5">
            <div className="flex items-center justify-between border-b border-[var(--border-dim)] pb-3">
              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
                  DISTRACTION-FREE ARTICLE READER
                </span>
                <p className="font-mono text-xs text-[var(--ink-muted)] mt-0.5">
                  Source: {article.source} • Author: {article.author}
                </p>
              </div>
              <a
                href={article.sourceUrl || article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[11px] font-bold text-[var(--accent)] hover:underline flex items-center gap-1"
              >
                <span>OPEN CANONICAL</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {article.fullContent ? (
              <div className="font-sans text-sm sm:text-base leading-relaxed text-[var(--ink)] space-y-4 max-h-[440px] overflow-y-auto pr-2 custom-scrollbar">
                {article.fullContent.split("\n\n").map((chunk, i) => (
                  <p key={i} className="leading-relaxed">
                    {chunk}
                  </p>
                ))}
              </div>
            ) : (
              <div className="p-6 border border-[var(--border-dim)] bg-[var(--bg)] text-center space-y-3">
                <BookOpen className="w-8 h-8 text-[var(--accent)] mx-auto opacity-80" />
                <h4 className="font-display text-base font-bold text-[var(--ink)]">
                  Full Article Hosted on {article.source}
                </h4>
                <p className="text-xs text-[var(--ink-muted)] max-w-md mx-auto leading-relaxed">
                  This publication is optimized for reading on the canonical source domain. Read our AI Executive Overview & Deep Dive, or jump directly to the original publisher.
                </p>
                <div className="pt-2">
                  <a
                    href={article.sourceUrl || article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 border-2 border-[var(--accent)] bg-[var(--accent)] text-[#111113] px-5 py-2 text-xs font-bold font-display uppercase tracking-wider hover:bg-transparent hover:text-[var(--accent)] transition-colors"
                  >
                    <span>READ FULL ARTICLE ON {article.source.toUpperCase()}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Local AI: Content-Based Recommendations (TF-IDF + Cosine Similarity) */}
        <div className="mt-8 pt-6 border-t-2 border-[var(--border-dim)] font-mono">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>RELATED ARTICLES</span>
              <span className="text-[var(--ink-muted)] text-[9px] font-normal tracking-wider">(TF-IDF SIMILARITY)</span>
            </p>
          </div>

          {loadingRecs ? (
            <div className="text-[11px] text-[var(--ink-muted)] py-3 animate-pulse">
              Computing content similarity matrix...
            </div>
          ) : recommendations.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  onClick={() => onSelectArticle && onSelectArticle(rec)}
                  className="p-3 border border-[var(--border-dim)] hover:border-[var(--accent)] bg-[var(--bg)] cursor-pointer transition-all flex flex-col justify-between group shadow-sm"
                  title="Click to view article"
                >
                  <div>
                    <div className="flex items-center justify-between text-[9px] text-[var(--accent)] mb-1.5 font-bold">
                      <span className="uppercase tracking-wider">{rec.category?.replace(/-/g, " ")}</span>
                      {rec.matchPercentage > 0 && (
                        <span className="bg-[var(--accent)]/10 text-[var(--accent)] px-1 py-0.5 border border-[var(--accent)]/30 text-[8px]">
                          {rec.matchPercentage}% MATCH
                        </span>
                      )}
                    </div>
                    <h5 className="font-display text-xs font-bold text-[var(--ink)] group-hover:text-[var(--accent)] line-clamp-2 leading-tight transition-colors">
                      {rec.title}
                    </h5>
                    {rec.matchedKeywords && rec.matchedKeywords.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {rec.matchedKeywords.slice(0, 3).map((kw, idx) => (
                          <span
                            key={idx}
                            className="text-[8px] font-mono text-[var(--accent)] bg-[var(--accent)]/5 px-1 py-0.5 border border-[var(--accent)]/20"
                          >
                            #{kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-[var(--border-dim)] flex items-center justify-between text-[9px] text-[var(--ink-muted)]">
                    <span className="truncate max-w-[120px]">{rec.source}</span>
                    <span className="text-[var(--accent)] font-bold group-hover:translate-x-0.5 transition-transform">READ →</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-[var(--ink-muted)]">No related articles found.</p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t-2 border-[var(--border-dim)] flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-3 sm:gap-4 font-mono">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:ml-auto w-full sm:w-auto">
            {onUpvote && (
              <button
                type="button"
                onClick={() => onUpvote(article.id)}
                className={`flex-1 sm:flex-initial justify-center border px-3 sm:px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 sm:gap-2 cursor-pointer ${
                  article.isUpvoted
                    ? "bg-[var(--accent)] text-[#111113] border-[var(--accent)]"
                    : "border-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--ink)]"
                }`}
                title={article.isUpvoted ? "Remove upvote" : "Upvote this article"}
              >
                <ThumbsUp
                  className={`w-3.5 h-3.5 shrink-0 ${
                    article.isUpvoted ? "text-[#111113] fill-current" : "text-[var(--accent)]"
                  }`}
                />
                <span>{article.isUpvoted ? "UPVOTED" : "UPVOTE"} ({article.upvotes || 0})</span>
              </button>
            )}

            <a
              href={article.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-initial justify-center border border-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--ink)] px-3 sm:px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 sm:gap-2"
            >
              <span className="truncate">SOURCE ON {article.source}</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </a>

            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto justify-center border border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)] hover:bg-[var(--accent)] hover:border-[var(--accent)] hover:text-[#111113] px-5 py-2.5 text-xs font-bold font-display uppercase tracking-wider transition-colors cursor-pointer"
            >
              CLOSE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
