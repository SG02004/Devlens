import React, { useState } from "react";
import {
  TrendingUp,
  LogOut,
  ChevronDown,
  Sun,
  Moon,
  User,
} from "lucide-react";

export const Header = ({
  activeTab,
  setActiveTab,
  userProfile,
  totalArticlesCount,
  onLogout,
  theme = "dark",
  onToggleTheme,
  palette = "new",
  onTogglePalette,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const cleanName = (userProfile?.name || "Developer")
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

  return (
    <header id="top-navigation" className="top-nav">
      <div className="mx-auto w-full max-w-7xl px-3 sm:px-6 py-2.5 sm:py-3.5">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand & Desktop Tabs */}
          <div className="flex items-center gap-4 sm:gap-10 min-w-0">
            {/* Logo */}
            <div
              className="flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none group shrink-0"
              onClick={() => setActiveTab("feed")}
            >
              <div className="w-8 h-8 border-2 border-[var(--ink)] bg-[var(--accent)] text-[#111113] flex items-center justify-center font-display text-sm font-extrabold shadow-sm">
                D
              </div>
              <div className="text-left leading-tight">
                <span className="font-display text-base sm:text-lg tracking-tight text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors">
                  DevLens
                </span>
                <span className="hidden md:block font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--ink-muted)] font-bold">
                  Engineering Intelligence
                </span>
              </div>
            </div>

            {/* Desktop Navigation Tabs */}
            <nav className="hidden sm:flex items-center gap-1.5">
              {userProfile?.role === "admin" && (
                <button
                  id="tab-nav-admin"
                  type="button"
                  onClick={() => setActiveTab("admin")}
                  className={`nav-tab ${activeTab === "admin" ? "nav-tab-active" : ""}`}
                >
                  ADMIN
                </button>
              )}

              <button
                id="tab-nav-feed"
                type="button"
                onClick={() => setActiveTab("feed")}
                className={`nav-tab ${activeTab === "feed" ? "nav-tab-active" : ""}`}
              >
                FEED
              </button>

              <button
                id="tab-nav-profile"
                type="button"
                onClick={() => setActiveTab("profile")}
                className={`nav-tab ${activeTab === "profile" ? "nav-tab-active" : ""}`}
              >
                PROFILE
              </button>

              <button
                id="tab-nav-analytics"
                type="button"
                onClick={() => setActiveTab("analytics")}
                className={`nav-tab ${activeTab === "analytics" ? "nav-tab-active" : ""}`}
              >
                ANALYTICS
              </button>

              <button
                id="tab-nav-quiz"
                type="button"
                onClick={() => setActiveTab("quiz")}
                className={`nav-tab ${activeTab === "quiz" ? "nav-tab-active" : ""}`}
              >
                QUIZ
              </button>
            </nav>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Palette Fallback Toggle (New vs Classic) */}
            {onTogglePalette && (
              <button
                id="btn-palette-toggle-header"
                type="button"
                onClick={onTogglePalette}
                className="border border-[var(--ink)]/40 hover:border-[var(--accent)] bg-[var(--bg-surface)] text-[var(--ink)] hover:text-[var(--accent)] px-2 sm:px-2.5 py-1.5 text-[10px] sm:text-xs font-mono font-bold tracking-wider uppercase transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                title={palette === "new" ? "Fallback to Classic Scheme" : "Switch to New Scheme"}
              >
                <span>{palette === "new" ? "CLASSIC" : "NEW"}</span>
              </button>
            )}

            {/* Dark / Light Theme Toggle */}
            {onToggleTheme && (
              <button
                id="btn-theme-toggle-header"
                type="button"
                onClick={onToggleTheme}
                className="border border-[var(--ink)]/40 hover:border-[var(--accent)] bg-[var(--bg-surface)] text-[var(--ink)] hover:text-[var(--accent)] px-2.5 sm:px-3 py-1.5 text-xs font-mono font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
              >
                {theme === "dark" ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span className="hidden sm:inline">LIGHT</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-[var(--ink)]" />
                    <span className="hidden sm:inline">DARK</span>
                  </>
                )}
              </button>
            )}

            {/* User Menu */}
            <div className="relative">
              <button
                id="btn-user-profile-menu"
                type="button"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-1.5 sm:gap-2 border border-[var(--border-dim)] bg-[var(--bg-surface)] hover:border-[var(--ink)]/50 px-2 sm:px-3 py-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <div className="w-5 h-5 bg-[var(--accent)] text-[#111113] flex items-center justify-center font-bold text-[10px] shrink-0">
                  {cleanName.charAt(0).toUpperCase()}
                </div>
                <span className="font-mono text-xs font-semibold text-[var(--ink)] max-w-[100px] sm:max-w-[220px] truncate">
                  {cleanName}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[var(--ink-muted)] shrink-0" />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-1.5rem)] bg-[var(--bg-surface)] border border-[var(--border-dim)] shadow-xl z-50 py-1 text-xs font-mono">
                  <div className="px-3 py-2 border-b border-[var(--border-dim)]">
                    <p className="text-[10px] text-[var(--ink-muted)] uppercase tracking-wider">Signed in as</p>
                    <p className="font-semibold text-[var(--ink)] truncate">
                      {cleanName}
                    </p>
                    <p className="text-[11px] text-[var(--ink-muted)] truncate">{userProfile?.email}</p>
                  </div>

                  <div className="p-1">
                    <button
                      id="btn-profile-action"
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        setActiveTab("profile");
                      }}
                      className="w-full text-left p-2 hover:bg-[var(--accent)]/10 text-[var(--ink)] transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
                      <span>Topic Preferences</span>
                    </button>

                    <button
                      id="btn-analytics-action"
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        setActiveTab("analytics");
                      }}
                      className="w-full text-left p-2 hover:bg-[var(--accent)]/10 text-[var(--ink)] transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <TrendingUp className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
                      <span>Personal Insights</span>
                    </button>

                    <button
                      id="btn-logout-action"
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        onLogout();
                      }}
                      className="w-full text-left p-2 text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center gap-2 mt-1 border-t border-[var(--border-dim)] cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Tabs Row */}
        <nav className="flex sm:hidden items-center gap-1 mt-2.5 pt-2 border-t border-[var(--border-dim)] overflow-x-auto no-scrollbar">
          {userProfile?.role === "admin" && (
            <button
              id="tab-nav-admin-mobile"
              type="button"
              onClick={() => setActiveTab("admin")}
              className={`nav-tab flex-1 text-center ${activeTab === "admin" ? "nav-tab-active" : ""}`}
            >
              ADMIN
            </button>
          )}

          <button
            id="tab-nav-feed-mobile"
            type="button"
            onClick={() => setActiveTab("feed")}
            className={`nav-tab flex-1 text-center ${activeTab === "feed" ? "nav-tab-active" : ""}`}
          >
            FEED
          </button>

          <button
            id="tab-nav-profile-mobile"
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`nav-tab flex-1 text-center ${activeTab === "profile" ? "nav-tab-active" : ""}`}
          >
            PROFILE
          </button>

          <button
            id="tab-nav-analytics-mobile"
            type="button"
            onClick={() => setActiveTab("analytics")}
            className={`nav-tab flex-1 text-center ${activeTab === "analytics" ? "nav-tab-active" : ""}`}
          >
            ANALYTICS
          </button>

          <button
            id="tab-nav-quiz-mobile"
            type="button"
            onClick={() => setActiveTab("quiz")}
            className={`nav-tab flex-1 text-center ${activeTab === "quiz" ? "nav-tab-active" : ""}`}
          >
            QUIZ
          </button>
        </nav>
      </div>
    </header>
  );
};
