import React from "react";
import {
  BarChart3,
  BookOpen,
  Users,
  TrendingUp,
  LogOut,
  Sun,
  Moon,
  ShieldAlert,
} from "lucide-react";

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "curation", label: "Curation", icon: BookOpen },
  { id: "users", label: "Users", icon: Users },
  { id: "analytics", label: "Analytics", icon: TrendingUp },
];

export function AdminLayout({
  activeSection,
  onSectionChange,
  userProfile,
  onLogout,
  theme,
  onToggleTheme,
  children,
}) {
  const cleanName = (userProfile?.name || userProfile?.username || "Admin")
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-row font-mono antialiased">
      {/* Admin Sidebar */}
      <aside className="w-16 sm:w-60 shrink-0 border-r-2 border-[var(--ink)] bg-[var(--bg-surface)] flex flex-col justify-between h-screen sticky top-0 select-none z-20">
        {/* Top: Branding & Title */}
        <div>
          <div className="p-3 sm:p-5 border-b border-[var(--border-dim)] flex items-center gap-3">
            <div className="w-9 h-9 border-2 border-[var(--ink)] bg-[var(--accent)] text-[#111113] flex items-center justify-center font-display text-sm font-extrabold shrink-0 shadow-sm">
              D
            </div>
            <div className="hidden sm:block min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-display text-base font-bold tracking-tight text-[var(--ink)] truncate">
                  DevLens
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse shrink-0" />
              </div>
              <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--accent)] font-bold">
                Admin Console
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-2 sm:p-3 space-y-1 mt-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  id={`admin-nav-${item.id}`}
                  type="button"
                  onClick={() => onSectionChange(item.id)}
                  title={item.label}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs uppercase tracking-wider transition-all cursor-pointer ${
                    isActive
                      ? "bg-[var(--accent)]/15 text-[var(--accent)] border-l-2 border-[var(--accent)] font-bold shadow-sm"
                      : "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--bg)]/60 border-l-2 border-transparent"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline text-[11px] truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom: Profile, Theme & Sign Out */}
        <div className="p-2 sm:p-4 border-t border-[var(--border-dim)] space-y-3 bg-[var(--bg-surface)]">
          {/* Theme Toggle */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
              className="w-full flex items-center justify-center sm:justify-start gap-2.5 px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-[var(--ink-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg)]/50 border border-[var(--border-dim)] transition-colors cursor-pointer"
            >
              {theme === "dark" ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span className="hidden sm:inline">Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-[var(--ink)]" />
                  <span className="hidden sm:inline">Dark Mode</span>
                </>
              )}
            </button>
          )}

          {/* User Info */}
          <div className="flex items-center gap-2.5 px-1 py-1 min-w-0">
            <div className="w-7 h-7 bg-[var(--accent)] text-[#111113] flex items-center justify-center font-bold text-xs shrink-0 border border-[var(--ink)]">
              {cleanName.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block min-w-0 flex-1">
              <p className="text-[11px] font-bold text-[var(--ink)] truncate leading-tight">
                {cleanName}
              </p>
              <span className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest text-[var(--accent)]">
                <ShieldAlert className="w-2.5 h-2.5" />
                Root Admin
              </span>
            </div>
          </div>

          {/* Sign Out */}
          <button
            id="btn-admin-logout"
            type="button"
            onClick={onLogout}
            title="Sign Out"
            className="w-full flex items-center justify-center sm:justify-start gap-2.5 px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top Bar Banner */}
        <header className="border-b-2 border-[var(--ink)] bg-[var(--bg-surface)] px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-[var(--accent)] animate-pulse shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
              System Admin
            </span>
            <span className="text-[var(--border-dim)] font-bold">/</span>
            <span className="text-[10px] text-[var(--ink)] font-bold uppercase tracking-widest">
              {activeSection}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--ink-muted)] hidden md:inline">
              Role: <strong className="text-[var(--accent)]">Administrator</strong>
            </span>
          </div>
        </header>

        {/* Content Pane */}
        <main className="p-4 sm:p-8 max-w-6xl w-full mx-auto flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
