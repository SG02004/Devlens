import React, { useState, useMemo } from "react";
import {
  Edit2,
  Check,
  LogOut,
  Save,
} from "lucide-react";
import { CATEGORIES_CONFIG } from "../data/mockDatabase";

export const ProfileSection = ({
  userProfile,
  onUpdateProfile,
  onUpdateCategories,
  articles,
  onLogout,
}) => {
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editName, setEditName] = useState(userProfile.name);
  const [editEmail, setEditEmail] = useState(userProfile.email);
  const [editProgram, setEditProgram] = useState(userProfile.program || "Systems Engineering");
  const [editInstitution, setEditInstitution] = useState(
    userProfile.institution || "DevLens Architecture Labs"
  );
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState(null);

  // Calculate stats
  const readCount = useMemo(() => articles.filter((a) => a.isRead).length, [articles]);
  const bookmarkedCount = useMemo(() => articles.filter((a) => a.isBookmarked).length, [articles]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSuccessMsg(null);
    try {
      await onUpdateProfile({
        name: editName.trim(),
        email: editEmail.trim(),
        program: editProgram.trim(),
        institution: editInstitution.trim(),
      });
      setIsEditingInfo(false);
      setProfileSuccessMsg("Profile information updated successfully.");
      setTimeout(() => setProfileSuccessMsg(null), 3000);
    } catch {
      // Error handled
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleToggleCategory = async (catId) => {
    const current = userProfile.selectedCategories || [];
    let updated;
    if (current.includes(catId)) {
      if (current.length === 1) return; // Keep at least one
      updated = current.filter((id) => id !== catId);
    } else {
      updated = [...current, catId];
    }
    await onUpdateCategories(updated);
  };

  return (
    <div id="profile-section-view" className="w-full space-y-8 animate-fade-in-up text-left">
      {/* 1. Profile Header & Essential Info */}
      <section className="card p-6 sm:p-10 border-2 border-[var(--ink)] bg-[var(--bg-surface)] space-y-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Avatar Circle */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 border-2 border-[var(--ink)] bg-[var(--accent)] text-[#111113] flex items-center justify-center font-display text-2xl sm:text-3xl font-extrabold shadow-sm shrink-0">
              {(userProfile.name || "U")[0].toUpperCase()}
            </div>

            <div>
              <div className="meta-tag mb-1.5">Engineer Profile</div>
              <h1 className="font-display text-2xl sm:text-4xl font-extrabold text-[var(--ink)] tracking-tight m-0">
                {userProfile.name}
              </h1>
              <p className="font-mono text-xs sm:text-sm text-[var(--ink-muted)] mt-1 flex items-center gap-2">
                <span>{userProfile.email}</span>
                <span>•</span>
                <span className="text-[var(--accent)] font-bold">{userProfile.program || "Systems Engineering"}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              type="button"
              onClick={() => {
                setIsEditingInfo(!isEditingInfo);
                setEditName(userProfile.name);
                setEditEmail(userProfile.email);
              }}
              className="border border-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--ink)] px-4 py-2 font-bold uppercase tracking-wider transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{isEditingInfo ? "CANCEL" : "EDIT PROFILE"}</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="border border-rose-500 text-rose-500 hover:bg-rose-500/10 px-4 py-2 font-bold uppercase tracking-wider transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>SIGN OUT</span>
            </button>
          </div>
        </div>

        {profileSuccessMsg && (
          <div className="p-3 border border-emerald-500 bg-emerald-500/10 text-emerald-500 font-mono text-xs">
            {profileSuccessMsg}
          </div>
        )}

        {/* Inline Edit Form */}
        {isEditingInfo && (
          <form
            onSubmit={handleSaveProfile}
            className="pt-6 border-t border-[var(--border-dim)] space-y-4 font-mono text-xs"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--ink-muted)] mb-1">
                  FULL NAME
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[var(--bg)] border border-[var(--ink)] px-3 py-2 text-xs text-[var(--ink)] focus:border-[var(--accent)] outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--ink-muted)] mb-1">
                  EMAIL ADDRESS
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-[var(--bg)] border border-[var(--ink)] px-3 py-2 text-xs text-[var(--ink)] focus:border-[var(--accent)] outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--ink-muted)] mb-1">
                  SPECIALIZATION / ROLE
                </label>
                <input
                  type="text"
                  value={editProgram}
                  onChange={(e) => setEditProgram(e.target.value)}
                  placeholder="e.g. Distributed Systems Engineer"
                  className="w-full bg-[var(--bg)] border border-[var(--ink)] px-3 py-2 text-xs text-[var(--ink)] focus:border-[var(--accent)] outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--ink-muted)] mb-1">
                  LAB / ORGANIZATION
                </label>
                <input
                  type="text"
                  value={editInstitution}
                  onChange={(e) => setEditInstitution(e.target.value)}
                  placeholder="e.g. Cloud Architecture Group"
                  className="w-full bg-[var(--bg)] border border-[var(--ink)] px-3 py-2 text-xs text-[var(--ink)] focus:border-[var(--accent)] outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="btn-primary py-2 px-5 text-xs inline-flex items-center gap-2 cursor-pointer w-auto"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingProfile ? "SAVING..." : "SAVE CHANGES"}</span>
              </button>
            </div>
          </form>
        )}

        {/* Essential Activity Metric Blocks */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-[var(--border-dim)] font-mono">
          <div className="p-4 border border-[var(--border-dim)] bg-[var(--bg)]">
            <span className="text-[10px] text-[var(--ink-muted)] uppercase tracking-widest block">
              PAPERS READ
            </span>
            <p className="font-display text-2xl font-extrabold text-[var(--accent)] mt-1">
              {readCount}
            </p>
          </div>

          <div className="p-4 border border-[var(--border-dim)] bg-[var(--bg)]">
            <span className="text-[10px] text-[var(--ink-muted)] uppercase tracking-widest block">
              SAVED BOOKMARKS
            </span>
            <p className="font-display text-2xl font-extrabold text-[var(--ink)] mt-1">
              {bookmarkedCount}
            </p>
          </div>

          <div className="p-4 border border-[var(--border-dim)] bg-[var(--bg)]">
            <span className="text-[10px] text-[var(--ink-muted)] uppercase tracking-widest block">
              ACTIVE TOPICS
            </span>
            <p className="font-display text-2xl font-extrabold text-[var(--accent)] mt-1">
              {(userProfile.selectedCategories || []).length}
            </p>
          </div>
        </div>
      </section>

      {/* 2. Category Subscriptions Manager */}
      <section className="card p-6 sm:p-8 border-2 border-[var(--ink)] bg-[var(--bg-surface)] space-y-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 font-mono">
          <div>
            <div className="meta-tag-accent">Personalized Preferences</div>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[var(--ink)] tracking-tight mt-2">
              Subscribed Technical Categories
            </h2>
            <p className="text-xs text-[var(--ink-muted)] mt-1">
              Click any category below to toggle your subscription in the DevLens algorithmic curation stream.
            </p>
          </div>

          <span className="text-xs font-bold text-[var(--accent)]">
            [{(userProfile.selectedCategories || []).length} SUBSCRIBED]
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 font-mono">
          {CATEGORIES_CONFIG.filter((c) => c.id !== "all").map((cat) => {
            const isSubscribed = (userProfile.selectedCategories || []).includes(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleToggleCategory(cat.id)}
                className={`p-3.5 border-2 text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                  isSubscribed
                    ? "border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--ink)]"
                    : "border-[var(--border-dim)] bg-[var(--bg)] text-[var(--ink-muted)] hover:border-[var(--ink)] hover:text-[var(--ink)]"
                }`}
              >
                <div>
                  <span
                    className={`block text-xs font-bold uppercase tracking-wider ${
                      isSubscribed ? "text-[var(--accent)]" : "text-[var(--ink)]"
                    }`}
                  >
                    {cat.label}
                  </span>
                  <span className="text-[10px] text-[var(--ink-muted)] block mt-0.5">
                    {cat.id === "artificial-intelligence" && "LLMs & ML Research"}
                    {cat.id === "web-development" && "Frontend & Modern JS"}
                    {cat.id === "cloud-computing" && "Distributed Cloud"}
                    {cat.id === "cyber-security" && "Security & Protocols"}
                    {cat.id === "data-science" && "Analytics & Data Pipelines"}
                    {cat.id === "devops" && "K8s & CI/CD"}
                  </span>
                </div>

                <div
                  className={`w-4 h-4 border flex items-center justify-center shrink-0 ${
                    isSubscribed
                      ? "bg-[var(--accent)] text-[#111113] border-[var(--accent)]"
                      : "border-[var(--ink)]/40 bg-[var(--bg-surface)] text-transparent"
                  }`}
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
