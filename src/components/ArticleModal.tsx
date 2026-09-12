import React from "react";
import { X, ExternalLink, Clock, Calendar, CheckCircle2, Bookmark, Award } from "lucide-react";
import { Article } from "../types";
import { getArticleCoverImage } from "../utils/imageUtils";

interface ArticleModalProps {
  article: Article | null;
  onClose: () => void;
  onToggleRead?: (id: string) => void;
  onToggleBookmark?: (id: string) => void;
  onTakeQuiz?: (article: Article) => void;
}

export const ArticleModal: React.FC<ArticleModalProps> = ({
  article,
  onClose,
  onToggleRead,
  onToggleBookmark,
  onTakeQuiz,
}) => {
  if (!article) return null;

  const coverImage = getArticleCoverImage(article.id, article.category, article.imageUrl);

  const formattedDate = new Date(article.publishedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      id="article-detail-modal-backdrop"
      className="modal-backdrop animate-fade-in-up"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        id={`article-detail-modal-${article.id}`}
        className="modal-card p-6 sm:p-10 relative border-2 border-[var(--ink)] bg-[var(--bg-surface)] text-left shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 z-10 w-9 h-9 border border-[var(--ink)] bg-[var(--bg-surface)] hover:bg-[var(--accent)] hover:border-[var(--accent)] hover:text-[#111113] text-[var(--ink)] flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cover Image */}
        <div className="relative w-full h-56 sm:h-72 border-2 border-[var(--border-dim)] overflow-hidden mb-6 bg-[var(--bg)]">
          <img
            src={coverImage}
            alt={article.title}
            className="w-full h-full object-cover grayscale contrast-125"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)]/90 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-mono">
            <span className="meta-tag-accent bg-[var(--bg-surface)]">
              {article.categoryLabel}
            </span>
            <span className="bg-[var(--bg-surface)] border border-[var(--ink)] text-[var(--ink)] text-[10px] uppercase font-bold px-3 py-1 shadow-sm">
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

        {/* Executive Summary */}
        <div className="mt-5 font-mono text-sm sm:text-base leading-relaxed text-[var(--ink)]">
          {article.summary}
        </div>

        {/* Why It Matters Callout */}
        {article.whyItMatters && (
          <div className="mt-6 border-2 border-[var(--accent)] bg-[var(--accent-muted)] p-5 sm:p-6 text-left">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
              WHY IT MATTERS TO SYSTEM ARCHITECTS
            </p>
            <p className="mt-2 font-mono text-sm leading-relaxed text-[var(--ink)]">
              {article.whyItMatters}
            </p>
          </div>
        )}

        {/* Key Takeaways */}
        {article.keyTakeaways && article.keyTakeaways.length > 0 && (
          <div className="mt-6">
            <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--ink-muted)]">
              KEY ENGINEERING TAKEAWAYS
            </h3>
            <ul className="mt-3 space-y-2.5 font-mono text-xs sm:text-sm text-[var(--ink)]">
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
          <div className="mt-6">
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

        {/* Footer Actions */}
        <div className="mt-8 pt-6 border-t-2 border-[var(--border-dim)] flex flex-wrap items-center justify-between gap-4 font-mono">
          {onTakeQuiz && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onTakeQuiz(article);
              }}
              className="border-2 border-[var(--accent)] bg-[var(--accent)] text-[#111113] hover:bg-transparent hover:text-[var(--accent)] px-5 py-2.5 text-xs font-bold font-display uppercase tracking-wider transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Award className="w-4 h-4" />
              <span>TEST KNOWLEDGE (QUIZ)</span>
            </button>
          )}

          <div className="flex items-center gap-3 ml-auto">
            <a
              href={article.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--ink)] px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2"
            >
              <span>SOURCE ON {article.source}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              type="button"
              onClick={onClose}
              className="border border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)] hover:bg-[var(--accent)] hover:border-[var(--accent)] hover:text-[#111113] px-5 py-2.5 text-xs font-bold font-display uppercase tracking-wider transition-colors cursor-pointer"
            >
              CLOSE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
