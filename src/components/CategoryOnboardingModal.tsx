import React, { useState } from "react";
import { Check, Sparkles, Layers, ArrowRight } from "lucide-react";
import { CategoryId } from "../types";
import { CATEGORIES_CONFIG } from "../data/mockDatabase";

interface CategoryOnboardingModalProps {
  initialCategories?: CategoryId[];
  onComplete: (selectedCategories: CategoryId[]) => void;
  isDismissible?: boolean;
  onClose?: () => void;
}

export const CategoryOnboardingModal: React.FC<CategoryOnboardingModalProps> = ({
  initialCategories = ["ai-ml", "web-dev", "cloud-systems"],
  onComplete,
  isDismissible = false,
  onClose,
}) => {
  const [selected, setSelected] = useState<CategoryId[]>(
    initialCategories.filter((c) => c !== "all")
  );
  const [error, setError] = useState<string | null>(null);

  const availableCategories = CATEGORIES_CONFIG.filter((c) => c.id !== "all");

  const toggleCategory = (catId: CategoryId) => {
    setError(null);
    if (selected.includes(catId)) {
      if (selected.length === 1) {
        setError("Please maintain at least one active topic category.");
        return;
      }
      setSelected(selected.filter((id) => id !== catId));
    } else {
      setSelected([...selected, catId]);
    }
  };

  const handleSelectAll = () => {
    setSelected(availableCategories.map((c) => c.id as CategoryId));
    setError(null);
  };

  const handleConfirm = () => {
    if (selected.length === 0) {
      setError("Please select at least one technical category.");
      return;
    }
    onComplete(selected);
  };

  return (
    <div
      id="category-onboarding-backdrop"
      className="modal-backdrop animate-fade-in-up"
      role="dialog"
      aria-modal="true"
    >
      <div
        id="category-onboarding-card"
        className="card max-w-2xl w-full p-6 sm:p-10 border-2 border-[var(--ink)] bg-[var(--bg-surface)] text-left shadow-2xl relative"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="meta-tag">Initial Setup</div>
          <button
            type="button"
            onClick={handleSelectAll}
            className="font-mono text-[11px] font-bold text-[var(--accent)] hover:underline uppercase tracking-wider cursor-pointer"
          >
            SELECT ALL TOPICS
          </button>
        </div>

        <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-[var(--ink)] leading-[1] tracking-tight">
          Select Your Focus Categories
        </h2>

        <p className="font-mono text-xs sm:text-sm text-[var(--ink-muted)] mt-3 leading-relaxed">
          DevLens uses your selected technical domains to prioritize real-time papers, architecture RFCs, and engineering discussions.
        </p>

        {error && (
          <div className="mt-4 p-3 border border-rose-500 bg-rose-500/10 text-rose-500 font-mono text-xs">
            {error}
          </div>
        )}

        {/* Category Choice Cards */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
          {availableCategories.map((cat) => {
            const isSelected = selected.includes(cat.id as CategoryId);
            return (
              <div
                key={cat.id}
                onClick={() => toggleCategory(cat.id as CategoryId)}
                className={`p-4 border-2 transition-all cursor-pointer select-none flex items-start justify-between gap-3 ${
                  isSelected
                    ? "border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--ink)]"
                    : "border-[var(--border-dim)] bg-[var(--bg)] text-[var(--ink-muted)] hover:border-[var(--ink)] hover:text-[var(--ink)]"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider ${
                        isSelected ? "text-[var(--accent)]" : "text-[var(--ink)]"
                      }`}
                    >
                      {cat.label}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--ink-muted)] mt-1.5 leading-snug">
                    {cat.id === "ai-ml" && "LLMs, foundational models, neural architectures & ML research."}
                    {cat.id === "web-dev" && "Modern frontend frameworks, TypeScript, browsers & web engines."}
                    {cat.id === "cloud-systems" && "Distributed storage, consensus algorithms & cloud backends."}
                    {cat.id === "cybersecurity" && "Vulnerability assessments, cryptography & zero trust protocols."}
                    {cat.id === "devops" && "Kubernetes, CI/CD pipelines, container runtime & observability."}
                    {cat.id === "mobile" && "Native cross-platform tooling, device internals & embedded IoT."}
                  </p>
                </div>

                <div
                  className={`w-5 h-5 border shrink-0 flex items-center justify-center mt-0.5 transition-colors ${
                    isSelected
                      ? "bg-[var(--accent)] text-[#111113] border-[var(--accent)]"
                      : "border-[var(--ink)]/40 bg-[var(--bg-surface)] text-transparent"
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Button */}
        <div className="mt-8 pt-6 border-t border-[var(--border-dim)] flex flex-wrap items-center justify-between gap-4 font-mono">
          <span className="text-xs text-[var(--ink-muted)] font-bold">
            {selected.length} CATEGOR{selected.length === 1 ? "Y" : "IES"} SELECTED
          </span>

          <div className="flex items-center gap-3">
            {isDismissible && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="border border-[var(--ink)] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--bg)] transition-colors cursor-pointer"
              >
                CANCEL
              </button>
            )}

            <button
              id="btn-save-categories-onboarding"
              type="button"
              onClick={handleConfirm}
              className="btn-primary py-2.5 px-6 text-xs inline-flex items-center gap-2 cursor-pointer w-auto"
            >
              <span>LAUNCH FEED</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
