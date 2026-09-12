import React from "react";
import { ArrowLeft, Clock, Sparkles } from "lucide-react";

interface ComingSoonViewProps {
  title: string;
  badge: string;
  description: string;
  onReturnToFeed: () => void;
}

export const ComingSoonView: React.FC<ComingSoonViewProps> = ({
  title,
  badge,
  description,
  onReturnToFeed,
}) => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center py-12 px-4 animate-fade-in-up text-left">
      <div className="card max-w-xl w-full p-8 sm:p-12 border-2 border-[var(--ink)] bg-[var(--bg-surface)] shadow-xl relative">
        <div className="flex items-center justify-between gap-3 mb-6">
          <span className="meta-tag">{badge}</span>
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--accent)] bg-[var(--accent-muted)] border border-[var(--accent)] px-2.5 py-1">
            <Clock className="w-3 h-3 text-[var(--accent)]" />
            COMING SOON
          </span>
        </div>

        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[var(--ink)] leading-[1.05] tracking-tight">
          {title}
        </h2>

        <p className="font-mono text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed mt-4">
          {description}
        </p>

        <div className="mt-8 pt-6 border-t border-[var(--border-dim)] flex flex-wrap items-center justify-between gap-4 font-mono">
          <span className="text-[11px] text-[var(--ink-muted)]">
            Module currently in active development.
          </span>

          <button
            type="button"
            onClick={onReturnToFeed}
            className="btn-primary py-2.5 px-5 text-xs inline-flex items-center gap-2 cursor-pointer w-auto"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>RETURN TO FEED</span>
          </button>
        </div>
      </div>
    </div>
  );
};
