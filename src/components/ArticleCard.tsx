import React from "react";
import { Clock, Calendar, CheckCircle2, Bookmark, Award, ArrowUpRight } from "lucide-react";
import { Article } from "../types";
import { getArticleCoverImage } from "../utils/imageUtils";

interface ArticleCardProps {
  article: Article;
  onOpenArticle: (article: Article) => void;
  onToggleRead: (articleId: string) => void;
  onToggleBookmark: (articleId: string) => void;
  onTakeQuiz?: (article: Article) => void;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({
  article,
  onOpenArticle,
  onToggleRead,
  onToggleBookmark,
  onTakeQuiz,
}) => {
  const coverImage = getArticleCoverImage(article.id, article.category, article.imageUrl);

  const formattedDate = new Date(article.publishedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <article
      id={`article-card-${article.id}`}
      className={`card border-2 transition-all duration-200 flex flex-col justify-between text-left group ${
        article.isRead
          ? "border-[var(--border-dim)] bg-[var(--bg-surface)] opacity-80"
          : "border-[var(--ink)] bg-[var(--bg-surface)] hover:border-[var(--accent)] shadow-sm"
      }`}
    >
      <div>
        {/* Cover Photo with Meta Overlay */}
        <div
          className="relative h-44 w-full bg-[var(--bg)] overflow-hidden cursor-pointer border-b-2 border-[var(--border-dim)] group-hover:border-[var(--accent)] transition-colors"
          onClick={() => onOpenArticle(article)}
        >
          <img
            src={coverImage}
            alt={article.title}
            className="h-full w-full object-cover grayscale contrast-125 group-hover:grayscale-0 transition-all duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/20" />

          {/* Source badge */}
          <span className="absolute top-3 left-3 bg-[var(--bg)] text-[var(--ink)] border border-[var(--ink)] font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 shadow-sm">
            {article.source}
          </span>

          {/* Bookmark Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleBookmark(article.id);
            }}
            className={`absolute top-3 right-3 w-8 h-8 flex items-center justify-center border font-mono transition-colors cursor-pointer shadow-sm ${
              article.isBookmarked
                ? "bg-[var(--accent)] text-[#111113] border-[var(--accent)]"
                : "bg-[var(--bg)] text-[var(--ink)] border-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--bg)]"
            }`}
            title={article.isBookmarked ? "Remove Bookmark" : "Save for Later"}
          >
            <Bookmark className={`w-3.5 h-3.5 ${article.isBookmarked ? "fill-current" : ""}`} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 cursor-pointer" onClick={() => onOpenArticle(article)}>
          {/* Category & Status */}
          <div className="flex items-center justify-between gap-2 mb-2 font-mono">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
              {article.categoryLabel}
            </span>
            {article.isRead && (
              <span className="text-[9px] uppercase tracking-widest text-[var(--ink-muted)] flex items-center gap-1 font-bold">
                <CheckCircle2 className="w-3 h-3 text-[var(--accent)]" /> READ
              </span>
            )}
          </div>

          {/* Title in Syne */}
          <h4 className="font-display text-lg sm:text-xl font-bold leading-tight text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors line-clamp-2">
            {article.title}
          </h4>

          {/* Excerpt in Space Mono */}
          <p className="font-mono text-xs text-[var(--ink-muted)] mt-3 leading-relaxed line-clamp-3">
            {article.summary}
          </p>

          {/* Metadata Row */}
          <div className="mt-4 pt-3 border-t border-[var(--border-dim)] flex items-center justify-between font-mono text-[10px] text-[var(--ink-muted)] uppercase tracking-widest">
            <span>{article.readTimeMinutes} MIN READ</span>
            <span>•</span>
            <span>{formattedDate}</span>
            <span>•</span>
            <span className="text-[var(--accent)] font-bold">{article.difficulty}</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="px-5 sm:px-6 py-3.5 border-t-2 border-[var(--border-dim)] flex items-center justify-between font-mono text-xs bg-[var(--bg-surface)]">
        <button
          type="button"
          onClick={() => onOpenArticle(article)}
          className="font-bold text-[var(--ink)] hover:text-[var(--accent)] flex items-center gap-1 transition-colors uppercase tracking-wider cursor-pointer"
        >
          <span>READ SUMMARY</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-[var(--accent)]" />
        </button>

        <div className="flex items-center gap-2">
          {onTakeQuiz && (
            <button
              type="button"
              onClick={() => onTakeQuiz(article)}
              className="border border-[var(--ink)]/40 hover:border-[var(--accent)] hover:text-[var(--accent)] px-2.5 py-1 text-[10px] font-bold uppercase transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Award className="w-3 h-3 text-[var(--accent)]" />
              <span>QUIZ</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onToggleRead(article.id)}
            className={`w-7 h-7 border flex items-center justify-center transition-colors cursor-pointer ${
              article.isRead
                ? "bg-[var(--accent)] text-[#111113] border-[var(--accent)]"
                : "border-[var(--ink)]/40 text-[var(--ink-muted)] hover:border-[var(--ink)] hover:text-[var(--ink)]"
            }`}
            title={article.isRead ? "Mark as unread" : "Mark as read"}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
};
