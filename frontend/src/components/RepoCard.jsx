import React from "react";
import {
  Star,
  GitFork,
  ExternalLink,
  TrendingUp,
  Sparkles,
  Terminal,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

const LANGUAGE_COLORS = {
  Python: "#3572A5",
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Rust: "#dea584",
  Go: "#00ADD8",
  "C++": "#f34b7d",
  C: "#555555",
  Java: "#b07219",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Shell: "#89e051",
};

export const RepoCard = ({ repo }) => {
  const langColor = LANGUAGE_COLORS[repo.primaryLanguage] || "var(--accent)";

  const formatNumber = (num) => {
    if (!num) return "0";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toLocaleString();
  };

  return (
    <div
      id={`repo-card-${repo.id}`}
      className="border-2 border-[var(--ink)] bg-[var(--bg-surface)] hover:border-[var(--accent)] transition-all duration-200 flex flex-col justify-between text-left group shadow-sm p-5 sm:p-6"
    >
      <div>
        {/* Top Badges Row */}
        <div className="flex items-center justify-between gap-2 mb-3.5 font-mono text-[11px]">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Primary Language */}
            {repo.primaryLanguage && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 border border-[var(--border-dim)] bg-[var(--bg)] font-bold text-[10px] tracking-wider uppercase text-[var(--ink)]">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: langColor }}
                />
                {repo.primaryLanguage}
              </span>
            )}

            {/* Category */}
            <span className="px-2 py-0.5 border border-[var(--border-dim)] bg-[var(--bg)] font-bold text-[10px] tracking-[0.15em] uppercase text-[var(--accent)]">
              {(repo.category || "open-source").replace("-", " ")}
            </span>
          </div>

          {/* Stars & Velocity */}
          <div className="flex items-center gap-2 shrink-0">
            {repo.starsGained > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-[var(--accent)]/15 border border-[var(--accent)] text-[var(--accent)] font-bold text-[10px] tracking-wider">
                <TrendingUp className="w-3 h-3" />
                +{formatNumber(repo.starsGained)}
              </span>
            )}
            <span className="flex items-center gap-1 text-[var(--ink)] font-bold">
              <Star className="w-3.5 h-3.5 fill-[var(--accent)] text-[var(--accent)]" />
              {formatNumber(repo.stars)}
            </span>
          </div>
        </div>

        {/* Repo Title & GitHub Link */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <a
            href={repo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-display text-lg sm:text-xl font-bold leading-tight text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors hover:underline flex items-center gap-1.5 break-all"
          >
            <span>{repo.fullName}</span>
            <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-[var(--accent)]" />
          </a>
        </div>

        {/* AI Structured Summary */}
        <p className="font-mono text-xs text-[var(--ink)] leading-relaxed mb-4">
          {repo.summary || repo.description || "Trending developer repository on GitHub."}
        </p>

        {/* Why It's Trending Callout */}
        {repo.whyTrending && (
          <div className="border border-[var(--border-dim)] bg-[var(--bg)] p-3 mb-4 font-mono text-[11px]">
            <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[var(--accent)] mb-1">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>Why It's Trending</span>
            </div>
            <p className="text-[var(--ink-muted)] leading-relaxed">
              {repo.whyTrending}
            </p>
          </div>
        )}

        {/* Key Features Bullet List */}
        {repo.keyFeatures && repo.keyFeatures.length > 0 && (
          <div className="mb-4">
            <span className="font-mono text-[10px] uppercase font-bold tracking-widest text-[var(--ink-muted)] block mb-1.5">
              Architectural Highlights:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {repo.keyFeatures.map((feat, idx) => (
                <span
                  key={idx}
                  className="font-mono text-[10px] px-2 py-0.5 border border-[var(--border-dim)] bg-[var(--bg)] text-[var(--ink)] flex items-center gap-1"
                >
                  <CheckCircle2 className="w-2.5 h-2.5 text-[var(--accent)] shrink-0" />
                  <span>{feat}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Target Persona / Good For */}
        {repo.goodFor && (
          <div className="font-mono text-[10px] text-[var(--ink-muted)] mb-4 flex items-start gap-1.5">
            <Terminal className="w-3 h-3 text-[var(--accent)] shrink-0 mt-0.5" />
            <span>
              <strong className="text-[var(--ink)] uppercase tracking-wider">Good for:</strong> {repo.goodFor}
            </span>
          </div>
        )}

        {/* Topics Pills */}
        {repo.topics && repo.topics.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {repo.topics.slice(0, 5).map((topic, idx) => (
              <span
                key={idx}
                className="font-mono text-[9px] px-1.5 py-0.5 bg-[var(--border-dim)]/40 text-[var(--ink-muted)] tracking-wider"
              >
                #{topic}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer Meta Row */}
      <div className="pt-3.5 border-t border-[var(--border-dim)] flex items-center justify-between font-mono text-[11px] text-[var(--ink-muted)]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1" title="GitHub Forks">
            <GitFork className="w-3.5 h-3.5" />
            {formatNumber(repo.forks)}
          </span>
          {repo.license && (
            <span className="flex items-center gap-1" title="License">
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent)]" />
              {repo.license}
            </span>
          )}
        </div>

        <a
          href={repo.url}
          target="_blank"
          rel="noopener noreferrer"
          className="border border-[var(--ink)] hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[#111113] text-[var(--ink)] px-2.5 py-1 font-bold text-[10px] tracking-wider uppercase transition-colors flex items-center gap-1 cursor-pointer"
        >
          <span>View Repo</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};
