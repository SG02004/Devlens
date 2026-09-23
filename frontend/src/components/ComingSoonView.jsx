import React from "react";
import { ArrowLeft } from "lucide-react";

export const ComingSoonView = ({
  title,
  subtitle = "In Development",
  onReturnToFeed,
}) => {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center py-16 px-4 text-center font-mono animate-fade-in-up">
      <div className="max-w-md w-full border-2 border-[var(--ink)] bg-[var(--bg-surface)] p-8 sm:p-12 shadow-md">
        <div className="text-[11px] font-bold text-[var(--accent)] tracking-[0.2em] uppercase mb-4">
          [ {subtitle} ]
        </div>
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[var(--ink)] tracking-tight mb-3">
          {title}
        </h2>
        <p className="text-xs text-[var(--ink-muted)] leading-relaxed mb-8">
          This feature is scheduled for Phase 2 implementation.
        </p>
        <button
          type="button"
          onClick={onReturnToFeed}
          className="btn-primary py-2.5 px-6 text-xs inline-flex items-center justify-center gap-2 cursor-pointer w-auto mx-auto"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>BACK TO FEED</span>
        </button>
      </div>
    </div>
  );
};
