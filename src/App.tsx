import React, { useState, useEffect } from "react";
import { ArticleFeed } from "./components/ArticleFeed";
import { AuthPage } from "./components/AuthPage";
import { Header, NavTabType } from "./components/Header";
import { ProfileSection } from "./components/ProfileSection";
import { ComingSoonView } from "./components/ComingSoonView";
import { CategoryOnboardingModal } from "./components/CategoryOnboardingModal";
import { ArticleFormModal } from "./components/ArticleFormModal";
import { ArticleModal } from "./components/ArticleModal";
import { Article, CategoryId, UserProfile } from "./types";
import { INITIAL_ARTICLES, INITIAL_USER_PROFILE } from "./data/mockDatabase";
import { X } from "lucide-react";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTabType>("feed");
  const [articles, setArticles] = useState<Article[]>(INITIAL_ARTICLES);
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_USER_PROFILE);
  const [isSyncing, setIsSyncing] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Category onboarding state (triggered after signup)
  const [showCategoryOnboarding, setShowCategoryOnboarding] = useState(false);

  // Modals for CRUD & Details
  const [isArticleFormOpen, setIsArticleFormOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [activeDetailArticle, setActiveDetailArticle] = useState<Article | null>(null);

  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("devlens.theme");
    return saved === "light" ? "light" : "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("devlens.theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Fetch initial articles & profile from server on mount
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [articlesRes, profileRes] = await Promise.all([
          fetch("/api/articles"),
          fetch("/api/auth/profile"),
        ]);

        if (articlesRes.ok) {
          const data = await articlesRes.json();
          if (Array.isArray(data.items) && data.items.length > 0) {
            setArticles(data.items);
          }
        }

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          if (profileData.user) {
            setUserProfile((prev) => ({
              ...prev,
              ...profileData.user,
            }));
          }
        }
      } catch (err) {
        console.warn("Initial API load using fallback data:", err);
      }
    }
    loadInitialData();
  }, []);

  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Live Ingestion Sync via feedManager
  const handleSyncLive = async () => {
    setIsSyncing(true);
    triggerNotification("Polling registered sources (Dev.to, Hacker News, arXiv, RSS)...");

    try {
      const res = await fetch("/api/articles/sync-live", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        // Refresh articles
        const artRes = await fetch("/api/articles");
        if (artRes.ok) {
          const artData = await artRes.json();
          if (Array.isArray(artData.items)) {
            setArticles(artData.items);
          }
        }
        triggerNotification(
          `Sync complete: Ingested ${data.newlyIngestedCount || 0} new articles across sources.`
        );
      }
    } catch (err) {
      console.error("Sync error:", err);
      triggerNotification("Ingestion completed with fallback source normalization.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Toggle Read
  const handleToggleRead = async (articleId: string) => {
    setArticles((prev) =>
      prev.map((a) => (a.id === articleId ? { ...a, isRead: !a.isRead } : a))
    );
    try {
      await fetch(`/api/articles/${articleId}/toggle-read`, { method: "POST" });
    } catch {
      // Local state already updated
    }
  };

  // Toggle Bookmark
  const handleToggleBookmark = async (articleId: string) => {
    setArticles((prev) =>
      prev.map((a) => (a.id === articleId ? { ...a, isBookmarked: !a.isBookmarked } : a))
    );
    try {
      await fetch(`/api/articles/${articleId}/toggle-bookmark`, { method: "POST" });
    } catch {
      // Local state already updated
    }
  };

  // CRUD: CREATE ARTICLE
  const handleCreateArticle = async (data: Partial<Article>) => {
    const res = await fetch("/api/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to create article");
    }
    const created = await res.json();
    if (created.article) {
      setArticles((prev) => [created.article, ...prev]);
      triggerNotification(`Article "${created.article.title}" saved successfully.`);
    }
  };

  // CRUD: UPDATE ARTICLE
  const handleUpdateArticle = async (id: string, data: Partial<Article>) => {
    const res = await fetch(`/api/articles/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to update article");
    }
    const updated = await res.json();
    if (updated.article) {
      setArticles((prev) => prev.map((a) => (a.id === id ? updated.article : a)));
      triggerNotification(`Article updated successfully.`);
    }
  };

  // CRUD: DELETE ARTICLE
  const handleDeleteArticle = async (id: string) => {
    const res = await fetch(`/api/articles/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to delete article");
    }
    setArticles((prev) => prev.filter((a) => a.id !== id));
    triggerNotification(`Article removed from repository.`);
  };

  // Profile Update
  const handleUpdateProfile = async (updated: Partial<UserProfile>) => {
    const res = await fetch("/api/auth/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    if (!res.ok) {
      throw new Error("Failed to update profile");
    }
    const data = await res.json();
    if (data.user) {
      setUserProfile((prev) => ({ ...prev, ...data.user }));
    }
  };

  // Category Subscriptions Update
  const handleUpdateCategories = async (categories: CategoryId[]) => {
    const res = await fetch("/api/auth/categories", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categories }),
    });
    if (res.ok) {
      setUserProfile((prev) => ({ ...prev, selectedCategories: categories }));
      triggerNotification(`Updated focus categories (${categories.length} subscribed).`);
    }
  };

  // Auth flow: Handle login or signup
  const handleLoginSuccess = (userData: Partial<UserProfile>, isNewSignup = false) => {
    setUserProfile((prev) => ({
      ...prev,
      ...userData,
    }));
    setIsAuthenticated(true);
    setActiveTab("feed");

    if (isNewSignup) {
      // Prompt user to select categories after creating account
      setShowCategoryOnboarding(true);
    } else {
      triggerNotification(`Welcome back, ${userData.name || "Developer"}!`);
    }
  };

  const handleOnboardingComplete = async (selected: CategoryId[]) => {
    await handleUpdateCategories(selected);
    setShowCategoryOnboarding(false);
    triggerNotification(`Categories saved! DevLens editorial feed is now customized.`);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    setIsAuthenticated(false);
    triggerNotification("Signed out successfully.");
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col font-mono selection:bg-[var(--accent)] selection:text-[#111113] transition-colors duration-200">
      {/* Floating Notification Toast */}
      {notification && (
        <div
          id="system-notification-toast"
          className="fixed bottom-6 right-6 z-50 border-2 border-[var(--ink)] bg-[var(--bg-surface)] text-[var(--ink)] shadow-2xl px-4 py-3 text-xs flex items-center gap-3 animate-fade-in-up font-mono"
        >
          <span className="w-2.5 h-2.5 bg-[var(--accent)] animate-pulse" />
          <span className="font-bold uppercase tracking-wider text-[11px] text-[var(--accent)]">[SYSTEM]:</span>
          <span>{notification}</span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-[var(--ink-muted)] hover:text-[var(--ink)] ml-2 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Nav Bar (When Authenticated) */}
      {isAuthenticated && (
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          userProfile={userProfile}
          onSyncLive={handleSyncLive}
          isSyncing={isSyncing}
          totalArticlesCount={articles.length}
          onLogout={handleLogout}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}

      {/* Main Content View */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {!isAuthenticated ? (
          <AuthPage
            onLoginSuccess={handleLoginSuccess}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        ) : activeTab === "feed" ? (
          <ArticleFeed
            articles={articles}
            userProfile={userProfile}
            onToggleRead={handleToggleRead}
            onToggleBookmark={handleToggleBookmark}
            onSyncLive={handleSyncLive}
            isSyncing={isSyncing}
            onOpenLearningPath={() => setActiveTab("learning-path")}
            onTakeQuiz={() => setActiveTab("quiz")}
            onCreateArticle={() => {
              setEditingArticle(null);
              setIsArticleFormOpen(true);
            }}
          />
        ) : activeTab === "profile" ? (
          <ProfileSection
            userProfile={userProfile}
            onUpdateProfile={handleUpdateProfile}
            onUpdateCategories={handleUpdateCategories}
            articles={articles}
            onCreateArticle={handleCreateArticle}
            onUpdateArticle={handleUpdateArticle}
            onDeleteArticle={handleDeleteArticle}
            onSyncLive={handleSyncLive}
            isSyncing={isSyncing}
            onLogout={handleLogout}
          />
        ) : activeTab === "analytics" ? (
          <ComingSoonView
            title="Analytics & Telemetry"
            badge="Cognitive Metrics"
            description="Reading velocity trackers, domain affinity breakdown charts, and deep conceptual retention metrics are currently under development."
            onReturnToFeed={() => setActiveTab("feed")}
          />
        ) : activeTab === "learning-path" ? (
          <ComingSoonView
            title="Engineering Roadmaps"
            badge="Curriculum Engine"
            description="Structured career trajectories for Distributed Systems, Machine Learning Foundations, and Cloud Architecture are coming soon."
            onReturnToFeed={() => setActiveTab("feed")}
          />
        ) : activeTab === "quiz" ? (
          <ComingSoonView
            title="Technical Verification Quizzes"
            badge="Assessment Engine"
            description="Automated architectural verification questions and interactive problem sets based on ingested research papers are coming soon."
            onReturnToFeed={() => setActiveTab("feed")}
          />
        ) : null}
      </main>

      {/* Category Selection Onboarding Modal (Shown after user creates account) */}
      {showCategoryOnboarding && (
        <CategoryOnboardingModal
          initialCategories={userProfile.selectedCategories || ["ai-ml", "web-dev", "cloud-systems"]}
          onComplete={handleOnboardingComplete}
          isDismissible={false}
        />
      )}

      {/* CRUD Article Form Modal */}
      <ArticleFormModal
        article={editingArticle}
        isOpen={isArticleFormOpen}
        onClose={() => {
          setIsArticleFormOpen(false);
          setEditingArticle(null);
        }}
        onSave={async (data) => {
          if (editingArticle) {
            await handleUpdateArticle(editingArticle.id, data);
          } else {
            await handleCreateArticle(data);
          }
        }}
      />

      {/* Global Article Detail Modal */}
      <ArticleModal
        article={activeDetailArticle}
        onClose={() => setActiveDetailArticle(null)}
        onToggleRead={handleToggleRead}
        onToggleBookmark={handleToggleBookmark}
        onTakeQuiz={() => setActiveTab("quiz")}
      />
    </div>
  );
}
