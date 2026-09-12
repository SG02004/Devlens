import React, { useState } from "react";
import {
  TrendingUp,
  GraduationCap,
  RefreshCw,
  LogOut,
  ChevronDown,
  Sun,
  Moon,
  User,
} from "lucide-react";
import { UserProfile } from "../types";

export type NavTabType = "feed" | "profile" | "analytics" | "learning-path" | "quiz";

interface HeaderProps {
  activeTab: NavTabType;
  setActiveTab: (tab: NavTabType) => void;
  userProfile: UserProfile;
  onSyncLive: () => void;
  isSyncing: boolean;
  totalArticlesCount: number;
  onLogout: () => void;
  theme?: "dark" | "light";
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  userProfile,
  onSyncLive,
  isSyncing,
  totalArticlesCount,
  onLogout,
  theme = "dark",
  onToggleTheme,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header id="top-navigation" className="top-nav">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 py-3.5">
        {/* Brand & Tabs */}
        <div className="flex items-center gap-6 sm:gap-10">
          {/* Logo */}
          <div
            className="flex items-center gap-3 cursor-pointer select-none group"
            onClick={() => setActiveTab("feed")}
          >
            <div className="w-8 h-8 border-2 border-[var(--ink)] bg-[var(--accent)] text-[#111113] flex items-center justify-center font-display text-sm font-extrabold shadow-sm">
              D
            </div>
            <div className="hidden sm:block text-left leading-tight">
              <span className="font-display text-lg tracking-tight text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors">
                DevLens
              </span>
              <span className="block font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--ink-muted)] font-bold">
                Engineering Intelligence
              </span>
            </div>
          </div>

          {/* Navigation Tabs (Clean and modern) */}
          <nav className="flex items-center gap-1.5">
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
              id="tab-nav-learning-path"
              type="button"
              onClick={() => setActiveTab("learning-path")}
              className={`nav-tab hidden md:inline-flex ${activeTab === "learning-path" ? "nav-tab-active" : ""}`}
            >
              ROADMAP
            </button>

            <button
              id="tab-nav-quiz"
              type="button"
              onClick={() => setActiveTab("quiz")}
              className={`nav-tab hidden md:inline-flex ${activeTab === "quiz" ? "nav-tab-active" : ""}`}
            >
              QUIZ
            </button>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3">
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

          {/* Live Ingest Sync */}
          <button
            id="btn-sync-articles"
            type="button"
            onClick={onSyncLive}
            disabled={isSyncing}
            className="border border-[var(--ink)]/40 hover:border-[var(--accent)] bg-[var(--bg-surface)] text-[var(--ink)] hover:text-[var(--accent)] px-3 py-1.5 text-xs font-mono font-bold tracking-wider uppercase transition-all flex items-center gap-2 disabled:opacity-40 cursor-pointer shadow-sm"
            title="Crawl Dev.to, Hacker News, and arXiv"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[var(--accent)] ${isSyncing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{isSyncing ? "SYNCING..." : "LIVE SYNC"}</span>
          </button>

          {/* User Menu */}
          <div className="relative">
            <button
              id="btn-user-profile-menu"
              type="button"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 px-2.5 py-1.5 border border-[var(--ink)]/40 hover:border-[var(--ink)] bg-[var(--bg-surface)] text-[var(--ink)] font-mono text-xs transition-colors cursor-pointer shadow-sm"
            >
              <span className="w-2 h-2 bg-[var(--accent)]" />
              <span className="font-bold max-w-[110px] truncate">{userProfile.name}</span>
              <ChevronDown className="w-3 h-3 text-[var(--ink-muted)]" />
            </button>

            {showProfileMenu && (
              <div
                id="user-profile-dropdown"
                className="absolute right-0 mt-2 w-64 border-2 border-[var(--ink)] bg-[var(--bg-surface)] p-4 z-50 text-left font-mono text-xs shadow-2xl animate-fade-in-up"
              >
                <div className="pb-3 border-b border-[var(--border-dim)] space-y-1">
                  <span className="text-[10px] text-[var(--ink-muted)] uppercase tracking-widest block">AUTHENTICATED AS</span>
                  <p className="font-bold text-[var(--ink)] truncate">{userProfile.name}</p>
                  <p className="text-[11px] text-[var(--ink-muted)] truncate">{userProfile.email}</p>
                </div>

                <div className="py-2.5 text-[var(--ink)] flex justify-between">
                  <span>Indexed Papers:</span>
                  <span className="font-bold text-[var(--accent)]">{totalArticlesCount}</span>
                </div>

                <div className="pt-2 border-t border-[var(--border-dim)] space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      setActiveTab("profile");
                    }}
                    className="w-full text-left p-2 hover:bg-[var(--bg-elevated)] text-[var(--ink)] transition-colors flex items-center gap-2 cursor-pointer font-bold"
                  >
                    <User className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>My Profile & Focus Topics</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      setActiveTab("analytics");
                    }}
                    className="w-full text-left p-2 hover:bg-[var(--bg-elevated)] text-[var(--ink)] transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>Personal Insights</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      setActiveTab("learning-path");
                    }}
                    className="w-full text-left p-2 hover:bg-[var(--bg-elevated)] text-[var(--ink)] transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>Learning Roadmap</span>
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
    </header>
  );
};
