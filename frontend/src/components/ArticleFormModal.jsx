import React, { useState, useEffect } from "react";
import { X, Plus, Edit2, Loader2, Save } from "lucide-react";
import { CATEGORIES_CONFIG } from "../data/mockDatabase";

export const ArticleFormModal = ({
  article,
  isOpen,
  onClose,
  onSave,
}) => {
  const isEditing = Boolean(article);

  const [title, setTitle] = useState("");
  const [source, setSource] = useState("Custom");
  const [sourceUrl, setSourceUrl] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState("web-development");
  const [readTimeMinutes, setReadTimeMinutes] = useState(5);
  const [difficulty, setDifficulty] = useState("Intermediate");
  const [summary, setSummary] = useState("");
  const [whyItMatters, setWhyItMatters] = useState("");
  const [keyTakeawaysText, setKeyTakeawaysText] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (article) {
      setTitle(article.title || "");
      setSource(article.source || "Custom");
      setSourceUrl(article.sourceUrl || "");
      setAuthor(article.author || "");
      setCategory(article.category || "web-development");
      setReadTimeMinutes(article.readTimeMinutes || 5);
      setDifficulty(article.difficulty || "Intermediate");
      setSummary(article.summary || "");
      setWhyItMatters(article.whyItMatters || "");
      setKeyTakeawaysText((article.keyTakeaways || []).join("\n"));
      setSkillsText((article.skillsExtracted || []).join(", "));
    } else {
      setTitle("");
      setSource("Custom");
      setSourceUrl("");
      setAuthor("Staff Curator");
      setCategory("web-development");
      setReadTimeMinutes(5);
      setDifficulty("Intermediate");
      setSummary("");
      setWhyItMatters("");
      setKeyTakeawaysText("");
      setSkillsText("");
    }
    setError(null);
  }, [article, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Article title is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const takeaways = keyTakeawaysText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const skills = skillsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const categoryConfig = CATEGORIES_CONFIG.find((c) => c.id === category);

    try {
      await onSave({
        title: title.trim(),
        source: source,
        sourceUrl: sourceUrl.trim() || `https://devlens.local/papers/${Date.now()}`,
        author: author.trim() || "Staff Engineer",
        category,
        categoryLabel: categoryConfig ? categoryConfig.label.toUpperCase() : "ENGINEERING",
        readTimeMinutes: Number(readTimeMinutes) || 5,
        difficulty,
        summary: summary.trim() || "Executive engineering summary and architectural breakdown.",
        whyItMatters: whyItMatters.trim() || "Fundamental principles impacting distributed architecture design.",
        keyTakeaways: takeaways.length > 0 ? takeaways : ["High-throughput design patterns.", "Reliability tradeoffs."],
        skillsExtracted: skills.length > 0 ? skills : ["Architecture", "System Design"],
      });
      onClose();
    } catch (err) {
      setError(err?.message || "Failed to save article.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="article-form-modal-backdrop"
      className="modal-backdrop animate-fade-in-up"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        id="article-form-modal-card"
        className="modal-card max-w-2xl p-6 sm:p-10 border-2 border-[var(--ink)] bg-[var(--bg-surface)] text-left shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 border border-[var(--ink)] bg-[var(--bg-surface)] hover:bg-[var(--accent)] hover:border-[var(--accent)] hover:text-[#111113] text-[var(--ink)] flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="meta-tag mb-3">
          {isEditing ? "Modify Document" : "New Editorial Entry"}
        </div>

        <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[var(--ink)] tracking-tight">
          {isEditing ? "Edit Article" : "Create Technical Article"}
        </h2>
        <p className="font-mono text-xs text-[var(--ink-muted)] mt-1 mb-6">
          {isEditing
            ? "Update fields and metadata in your DevLens library."
            : "Add a paper, RFC, post-mortem, or custom engineering note to the database."}
        </p>

        {error && (
          <div className="mb-4 p-3 border border-rose-500 bg-rose-500/10 text-rose-500 font-mono text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
          {/* Title */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--ink-muted)] mb-1">
              ARTICLE TITLE *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Designing Resilient Consensus in Distributed Raft Clusters"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[var(--bg)] border border-[var(--ink)] px-3 py-2 text-xs text-[var(--ink)] focus:border-[var(--accent)] outline-none"
            />
          </div>

          {/* Grid: Source & URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--ink-muted)] mb-1">
                SOURCE PUBLISHER
              </label>
              <input
                type="text"
                placeholder="e.g. Dev.to, Hacker News, arXiv, Uber Blog"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full bg-[var(--bg)] border border-[var(--ink)] px-3 py-2 text-xs text-[var(--ink)] focus:border-[var(--accent)] outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--ink-muted)] mb-1">
                AUTHOR / RESEARCH GROUP
              </label>
              <input
                type="text"
                placeholder="e.g. Leslie Lamport, Cloudflare Eng"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full bg-[var(--bg)] border border-[var(--ink)] px-3 py-2 text-xs text-[var(--ink)] focus:border-[var(--accent)] outline-none"
              />
            </div>
          </div>

          {/* Source URL */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--ink-muted)] mb-1">
              SOURCE URL (CANONICAL LINK)
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              className="w-full bg-[var(--bg)] border border-[var(--ink)] px-3 py-2 text-xs text-[var(--ink)] focus:border-[var(--accent)] outline-none"
            />
          </div>

          {/* Grid: Category, Difficulty, Read Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--ink-muted)] mb-1">
                CATEGORY
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[var(--bg)] border border-[var(--ink)] px-3 py-2 text-xs text-[var(--ink)] focus:border-[var(--accent)] outline-none"
              >
                {CATEGORIES_CONFIG.filter((c) => c.id !== "all").map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--ink-muted)] mb-1">
                DIFFICULTY
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full bg-[var(--bg)] border border-[var(--ink)] px-3 py-2 text-xs text-[var(--ink)] focus:border-[var(--accent)] outline-none"
              >
                <option value="Beginner">BEGINNER</option>
                <option value="Intermediate">INTERMEDIATE</option>
                <option value="Advanced">ADVANCED</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--ink-muted)] mb-1">
                READ TIME (MINS)
              </label>
              <input
                type="number"
                min={1}
                max={120}
                value={readTimeMinutes}
                onChange={(e) => setReadTimeMinutes(Math.max(1, Number(e.target.value) || 5))}
                className="w-full bg-[var(--bg)] border border-[var(--ink)] px-3 py-2 text-xs text-[var(--ink)] focus:border-[var(--accent)] outline-none"
              />
            </div>
          </div>

          {/* Executive Summary */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--ink-muted)] mb-1">
              EXECUTIVE SUMMARY / ABSTRACT
            </label>
            <textarea
              rows={3}
              placeholder="High-level engineering breakdown of core findings and implementation mechanisms..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full bg-[var(--bg)] border border-[var(--ink)] p-3 text-xs text-[var(--ink)] focus:border-[var(--accent)] outline-none resize-none"
            />
          </div>

          {/* Why It Matters */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--ink-muted)] mb-1">
              WHY IT MATTERS TO ARCHITECTS
            </label>
            <textarea
              rows={2}
              placeholder="Tradeoffs, operational implications, and design rationale..."
              value={whyItMatters}
              onChange={(e) => setWhyItMatters(e.target.value)}
              className="w-full bg-[var(--bg)] border border-[var(--ink)] p-3 text-xs text-[var(--ink)] focus:border-[var(--accent)] outline-none resize-none"
            />
          </div>

          {/* Key Takeaways */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--ink-muted)] mb-1">
              KEY TAKEAWAYS (ONE PER LINE)
            </label>
            <textarea
              rows={3}
              placeholder="Zero-copy serialization reduces p99 tail latency.&#10;Consensus heartbeat tuning prevents split-brain elections."
              value={keyTakeawaysText}
              onChange={(e) => setKeyTakeawaysText(e.target.value)}
              className="w-full bg-[var(--bg)] border border-[var(--ink)] p-3 text-xs text-[var(--ink)] focus:border-[var(--accent)] outline-none resize-none"
            />
          </div>

          {/* Skills Covered */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--ink-muted)] mb-1">
              SKILLS / TAGS (COMMA SEPARATED)
            </label>
            <input
              type="text"
              placeholder="Distributed Systems, Raft, Golang, Concurrency"
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              className="w-full bg-[var(--bg)] border border-[var(--ink)] px-3 py-2 text-xs text-[var(--ink)] focus:border-[var(--accent)] outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-[var(--border-dim)] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="border border-[var(--ink)] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--bg)] transition-colors cursor-pointer"
            >
              CANCEL
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary py-2 px-6 text-xs inline-flex items-center gap-2 cursor-pointer w-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>SAVING...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{isEditing ? "UPDATE ARTICLE" : "SAVE TO DATABASE"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
