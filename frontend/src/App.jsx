import React, { useState, useEffect } from "react";
import { ArticleFeed } from "./components/ArticleFeed";
import { AuthPage } from "./components/AuthPage";
import { Header } from "./components/Header";
import { ProfileSection } from "./components/ProfileSection";
import { ComingSoonView } from "./components/ComingSoonView";
import { CategoryOnboardingModal } from "./components/CategoryOnboardingModal";
import { ArticleFormModal } from "./components/ArticleFormModal";
import { ArticleModal } from "./components/ArticleModal";
import { AdminPanel } from "./components/AdminPanel";
import { AnalyticsBoard } from "./components/AnalyticsBoard";
import { INITIAL_ARTICLES, INITIAL_USER_PROFILE } from "./data/mockDatabase";
import { X } from "lucide-react";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState("feed");
  const [articles, setArticles] = useState(INITIAL_ARTICLES);
  const [isLoadingArticles, setIsLoadingArticles] = useState(true);
  const [userProfile, setUserProfile] = useState(INITIAL_USER_PROFILE);
  const [notification, setNotification] = useState(null);

  // Category onboarding state (triggered after signup)
  const [showCategoryOnboarding, setShowCategoryOnboarding] = useState(false);

  // Modals for CRUD & Details
  const [isArticleFormOpen, setIsArticleFormOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [activeDetailArticle, setActiveDetailArticle] = useState(null);

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("devlens.theme");
    return saved === "light" ? "light" : "dark";
  });

  const [palette, setPalette] = useState(() => {
    const saved = localStorage.getItem("devlens.palette");
    return saved === "classic" ? "classic" : "new";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("devlens.theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-palette", palette);
    localStorage.setItem("devlens.palette", palette);
  }, [palette]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const togglePalette = () => {
    setPalette((prev) => (prev === "new" ? "classic" : "new"));
  };

  // Fetch initial articles & profile from server on mount
  useEffect(() => {
    async function loadInitialData() {
      setIsLoadingArticles(true);
      try {
        const token = localStorage.getItem("devlens.auth_token");
        const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

        const [articlesRes, profileRes] = await Promise.all([
          fetch("/api/articles?limit=150", { headers: authHeaders }),
          token ? fetch("/api/auth/me", { headers: authHeaders }) : Promise.resolve({ ok: false }),
        ]);

        if (articlesRes.ok) {
          const data = await articlesRes.json();
          const items = data.articles || data.items || (Array.isArray(data) ? data : []);
          if (Array.isArray(items) && items.length > 0) {
            setArticles(items);
          }
        }

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          const user = profileData.user || profileData;
          if (user && user.email) {
            setUserProfile((prev) => ({
              ...prev,
              ...user,
              selectedCategories: user.selectedCategories || user.selected_categories || prev.selectedCategories,
            }));
            setIsAuthenticated(true);
            // Restore admin panel on page refresh for admin users
            if (user.role === "admin") {
              setActiveTab("admin");
            }
          }
        }
      } catch (err) {
        console.warn("Initial API load using fallback data:", err);
      } finally {
        setIsLoadingArticles(false);
      }
    }
    loadInitialData();
  }, []);

  const triggerNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Helper to reload personalized feed with current token
  const refreshArticlesFeed = async (sortMode = "for-you") => {
    try {
      const token = localStorage.getItem("devlens.auth_token");
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`/api/articles?limit=150&sort=${encodeURIComponent(sortMode)}`, {
        headers: authHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        const items = data.articles || data.items || (Array.isArray(data) ? data : []);
        if (Array.isArray(items) && items.length > 0) {
          setArticles(items);
        }
      }
    } catch {
      // Keep current articles on transient network failure
    }
  };

  // Toggle Read (persisted to Supabase ReadEvent table)
  const handleToggleRead = async (articleId) => {
    setArticles((prev) =>
      prev.map((a) => (a.id === articleId ? { ...a, isRead: !a.isRead } : a))
    );
    if (activeDetailArticle && activeDetailArticle.id === articleId) {
      setActiveDetailArticle((prev) => ({ ...prev, isRead: !prev.isRead }));
    }
    try {
      const token = localStorage.getItem("devlens.auth_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`/api/articles/${articleId}/toggle-read`, {
        method: "POST",
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        setArticles((prev) =>
          prev.map((a) =>
            a.id === articleId
              ? { ...a, isRead: data.isRead, isBookmarked: data.isBookmarked }
              : a
          )
        );
        if (activeDetailArticle && activeDetailArticle.id === articleId) {
          setActiveDetailArticle((prev) => ({
            ...prev,
            isRead: data.isRead,
            isBookmarked: data.isBookmarked,
          }));
        }
        if (typeof data.readCount === "number") {
          setUserProfile((prev) => ({ ...prev, read_count: data.readCount, readCount: data.readCount }));
        }
      }
    } catch {
      // Optimistic state retained
    }
  };

  // Toggle Bookmark (persisted to Supabase ReadEvent table)
  const handleToggleBookmark = async (articleId) => {
    setArticles((prev) =>
      prev.map((a) => (a.id === articleId ? { ...a, isBookmarked: !a.isBookmarked } : a))
    );
    if (activeDetailArticle && activeDetailArticle.id === articleId) {
      setActiveDetailArticle((prev) => ({ ...prev, isBookmarked: !prev.isBookmarked }));
    }
    try {
      const token = localStorage.getItem("devlens.auth_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`/api/articles/${articleId}/toggle-bookmark`, {
        method: "POST",
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        setArticles((prev) =>
          prev.map((a) =>
            a.id === articleId
              ? { ...a, isRead: data.isRead, isBookmarked: data.isBookmarked }
              : a
          )
        );
        if (activeDetailArticle && activeDetailArticle.id === articleId) {
          setActiveDetailArticle((prev) => ({
            ...prev,
            isRead: data.isRead,
            isBookmarked: data.isBookmarked,
          }));
        }
      }
    } catch {
      // Optimistic state retained
    }
  };

  // Toggle Upvote (1 upvote per user, persisted in ReadEvent + Article)
  const handleUpvote = async (articleId) => {
    const toggleArticleUpvote = (a) => {
      const nextUpvoted = !a.isUpvoted;
      const nextUpvotes = Math.max(0, (a.upvotes || 0) + (nextUpvoted ? 1 : -1));
      return { ...a, isUpvoted: nextUpvoted, upvotes: nextUpvotes };
    };

    setArticles((prev) =>
      prev.map((a) => (a.id === articleId ? toggleArticleUpvote(a) : a))
    );
    if (activeDetailArticle && activeDetailArticle.id === articleId) {
      setActiveDetailArticle((prev) => toggleArticleUpvote(prev));
    }
    try {
      const token = localStorage.getItem("devlens.auth_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`/api/articles/${articleId}/upvote`, {
        method: "POST",
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        setArticles((prev) =>
          prev.map((a) =>
            a.id === articleId
              ? { ...a, upvotes: data.upvotes, isUpvoted: data.isUpvoted }
              : a
          )
        );
        if (activeDetailArticle && activeDetailArticle.id === articleId) {
          setActiveDetailArticle((prev) => ({
            ...prev,
            upvotes: data.upvotes,
            isUpvoted: data.isUpvoted,
          }));
        }
      }
    } catch {
      // Optimistic update retained
    }
  };

  // CRUD: CREATE ARTICLE
  const handleCreateArticle = async (data) => {
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
  const handleUpdateArticle = async (id, data) => {
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
  const handleDeleteArticle = async (id) => {
    const res = await fetch(`/api/articles/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to delete article");
    }
    setArticles((prev) => prev.filter((a) => a.id !== id));
    triggerNotification(`Article removed from repository.`);
  };

  // Profile Update
  const handleUpdateProfile = async (updated) => {
    const token = localStorage.getItem("devlens.auth_token");
    const res = await fetch("/api/auth/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
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
  const handleUpdateCategories = async (categories) => {
    const token = localStorage.getItem("devlens.auth_token");
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const res = await fetch("/api/auth/categories", {
        method: "PUT",
        headers,
        body: JSON.stringify({ selectedCategories: categories, categories }),
      });
      if (res.ok) {
        setUserProfile((prev) => ({ ...prev, selectedCategories: categories }));
        await refreshArticlesFeed();
        triggerNotification(`Updated focus categories (${categories.length} subscribed).`);
      } else {
        setUserProfile((prev) => ({ ...prev, selectedCategories: categories }));
      }
    } catch {
      setUserProfile((prev) => ({ ...prev, selectedCategories: categories }));
    }
  };

  // Auth flow: Handle login or signup
  const handleLoginSuccess = (userData, isNewSignup = false) => {
    setUserProfile((prev) => ({
      ...prev,
      ...userData,
    }));
    setIsAuthenticated(true);
    refreshArticlesFeed();

    // Admin users go straight to the admin panel
    if (userData.role === "admin") {
      setActiveTab("admin");
      return;
    }

    setActiveTab("feed");

    if (isNewSignup) {
      // Prompt user to select categories after creating account
      setShowCategoryOnboarding(true);
    } else {
      triggerNotification(`Welcome back, ${userData.name || "Developer"}!`);
    }
  };

  const handleOnboardingComplete = async (selected) => {
    await handleUpdateCategories(selected);
    setShowCategoryOnboarding(false);
    triggerNotification(`Categories saved! DevLens editorial feed is now customized.`);
  };

  const handleLogout = () => {
    localStorage.removeItem("devlens.auth_token");
    setIsAuthenticated(false);
    triggerNotification("Signed out successfully.");
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col font-mono selection:bg-[var(--accent)] selection:text-[#111113] transition-colors duration-200">
      {/* Floating Notification Toast */}
      {notification && (
        <div
          id="system-notification-toast"
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:bottom-6 sm:right-6 z-50 border-2 border-[var(--ink)] bg-[var(--bg-surface)] text-[var(--ink)] shadow-2xl px-4 py-3 text-xs flex items-center gap-3 animate-fade-in-up font-mono"
        >
          <span className="w-2.5 h-2.5 bg-[var(--accent)] animate-pulse shrink-0" />
          <span className="font-bold uppercase tracking-wider text-[11px] text-[var(--accent)] shrink-0">[SYSTEM]:</span>
          <span className="flex-1 min-w-0 break-words">{notification}</span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-[var(--ink-muted)] hover:text-[var(--ink)] ml-2 cursor-pointer shrink-0"
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
          totalArticlesCount={articles.length}
          onLogout={handleLogout}
          theme={theme}
          onToggleTheme={toggleTheme}
          palette={palette}
          onTogglePalette={togglePalette}
        />
      )}

      {/* Main Content View */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
        {!isAuthenticated ? (
          <AuthPage
            onLoginSuccess={handleLoginSuccess}
            theme={theme}
            onToggleTheme={toggleTheme}
            palette={palette}
            onTogglePalette={togglePalette}
          />
        ) : activeTab === "admin" ? (
          <AdminPanel
            userProfile={userProfile}
            onLogout={handleLogout}
          />
        ) : activeTab === "feed" ? (
          <ArticleFeed
            articles={articles}
            isLoading={isLoadingArticles}
            userProfile={userProfile}
            onOpenArticle={setActiveDetailArticle}
            onToggleRead={handleToggleRead}
            onToggleBookmark={handleToggleBookmark}
            onUpvote={handleUpvote}
            onTakeQuiz={() => setActiveTab("quiz")}
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
            onLogout={handleLogout}
          />
        ) : activeTab === "analytics" ? (
          <AnalyticsBoard
            username={userProfile?.name || userProfile?.username}
            articles={articles}
            userProfile={userProfile}
            onOpenArticle={setActiveDetailArticle}
          />
        ) : activeTab === "quiz" ? (
          <ComingSoonView
            title="Technical Verification Quizzes"
            subtitle="Phase 2 Feature"
            onReturnToFeed={() => setActiveTab("feed")}
          />
        ) : null}
      </main>

      {/* Category Selection Onboarding Modal (Shown after user creates account) */}
      {showCategoryOnboarding && (
        <CategoryOnboardingModal
          initialCategories={userProfile.selectedCategories || ["artificial-intelligence", "web-development", "cloud-computing"]}
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
        onUpvote={handleUpvote}
        onSelectArticle={setActiveDetailArticle}
        onTakeQuiz={() => setActiveTab("quiz")}
      />
    </div>
  );
}
