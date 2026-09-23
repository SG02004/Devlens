import React, { useState } from "react";
import { Eye, EyeOff, Loader2, Sun, Moon } from "lucide-react";

// Standard email syntax validator (requires @ and valid domain extension)
const EMAIL_REGEX = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;

export const AuthPage = ({
  onLoginSuccess,
  theme = "dark",
  onToggleTheme,
}) => {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    const targetEmail = email.trim();
    if (!targetEmail) {
      setErrorMessage("Please enter your email address.");
      return;
    }
    if (!EMAIL_REGEX.test(targetEmail)) {
      setErrorMessage("Please enter a valid email address (e.g. name@gmail.com).");
      return;
    }
    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, password }),
      });

      if (res.ok) {
        const data = await res.json();
        const token = data.token || data.access_token;
        if (token) {
          localStorage.setItem("devlens.auth_token", token);
        }
        onLoginSuccess({
          name: data.user?.name || "Developer",
          email: targetEmail,
          selectedCategories: data.user?.selectedCategories || data.user?.selected_categories || [],
        });
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMessage(err.detail || "Invalid login credentials.");
      }
    } catch {
      setErrorMessage("Unable to connect to authentication server. Please ensure the backend is running.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    const targetName = name.trim();
    const targetEmail = email.trim();

    if (!targetName) {
      setErrorMessage("Please enter your full name.");
      return;
    }
    if (!targetEmail || !EMAIL_REGEX.test(targetEmail)) {
      setErrorMessage("Please enter a valid email address (e.g. name@gmail.com).");
      return;
    }
    if (!password || password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: targetName,
          email: targetEmail,
          password,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const token = data.token || data.access_token;
        if (token) {
          localStorage.setItem("devlens.auth_token", token);
        }
        onLoginSuccess({
          name: data.user?.name || targetName,
          email: data.user?.email || targetEmail,
          selectedCategories: data.user?.selectedCategories || data.user?.selected_categories || [],
        }, true);
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMessage(err.detail || "Registration failed. Please try a different email.");
      }
    } catch {
      setErrorMessage("Unable to connect to authentication server. Please ensure the backend is running.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-5rem)] flex items-center justify-center py-10 px-4">
      {/* Top Floating Controls: Dark / Light Mode Switch */}
      {onToggleTheme && (
        <div className="absolute top-2 right-4 sm:right-6 z-20">
          <button
            id="btn-theme-toggle-auth"
            type="button"
            onClick={onToggleTheme}
            className="border-2 border-[var(--ink)] bg-[var(--bg-surface)] text-[var(--ink)] hover:bg-[var(--accent)] hover:border-[var(--accent)] hover:text-[#111113] px-3.5 py-1.5 text-xs font-mono font-bold tracking-wider uppercase transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
          >
            {theme === "dark" ? (
              <>
                <Sun className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>LIGHT MODE</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-[var(--ink)]" />
                <span>DARK MODE</span>
              </>
            )}
          </button>
        </div>
      )}

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-12 lg:gap-16 items-center">
        {/* Left Section: Display typography */}
        <section className="space-y-6 text-left">
          <div className="meta-tag">Daily Tech Reads & Guides</div>

          <h1 className="font-display text-5xl sm:text-7xl lg:text-8xl leading-[0.9] tracking-[-0.04em] text-[var(--ink)] m-0">
            Daily technical stories curated.
          </h1>

          <p className="font-mono text-sm sm:text-base text-[var(--ink-muted)] leading-relaxed max-w-xl">
            Curated articles, practical guides, topics tailored to your interests, and key takeaways to help you learn every day.
          </p>

          <div className="flex flex-wrap gap-2 pt-4">
            <span className="meta-tag-accent">Beginner Friendly</span>
            <span className="meta-tag">Choose Your Topics</span>
            <span className="meta-tag">Daily Updates</span>
          </div>
        </section>

        {/* Right Section: Minimalist Card */}
        <section className="card p-8 sm:p-10 text-left relative shadow-xl">
          {/* Header Switcher without 01 / 02 */}
          <div className="flex justify-between items-center mb-8 font-mono text-xs uppercase tracking-wider border-b border-[var(--border-dim)] pb-3">
            <button
              id="btn-mode-signin"
              type="button"
              onClick={() => {
                setMode("login");
                setErrorMessage(null);
              }}
              className={`pb-1 transition-all cursor-pointer ${
                mode === "login"
                  ? "font-bold text-[var(--accent)] border-b-2 border-[var(--accent)]"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }`}
            >
              SIGN IN
            </button>

            <button
              id="btn-mode-signup"
              type="button"
              onClick={() => {
                setMode("signup");
                setErrorMessage(null);
              }}
              className={`pb-1 transition-all cursor-pointer ${
                mode === "signup"
                  ? "font-bold text-[var(--accent)] border-b-2 border-[var(--accent)]"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }`}
            >
              SIGN UP
            </button>
          </div>

          {errorMessage && (
            <div className="mb-6 p-3 border border-rose-500 bg-rose-500/10 text-rose-500 font-mono text-xs">
              {errorMessage}
            </div>
          )}

          <form onSubmit={mode === "login" ? handleLogin : handleSignup} className="space-y-6">
            {mode === "signup" && (
              <div className="input-group">
                <label className="block text-[0.65rem] tracking-[0.2em] uppercase mb-2 text-[var(--ink-muted)] font-mono font-bold">
                  Full Name
                </label>
                <input
                  id="input-name"
                  type="text"
                  required
                  placeholder="your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-underlined"
                />
              </div>
            )}

            <div className="input-group">
              <label className="block text-[0.65rem] tracking-[0.2em] uppercase mb-2 text-[var(--ink-muted)] font-mono font-bold">
                Email Address
              </label>
              <input
                id="input-email"
                type={mode === "signup" ? "email" : "text"}
                required
                placeholder={mode === "signup" ? "your gmail" : "name@gmail.com or username"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-underlined"
              />
            </div>

            <div className="input-group relative">
              <label className="block text-[0.65rem] tracking-[0.2em] uppercase mb-2 text-[var(--ink-muted)] font-mono font-bold">
                Password
              </label>
              <input
                id="input-password"
                type={showPassword ? "text" : "password"}
                required
                placeholder="•••••••• (min 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-underlined pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 bottom-2 text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button
              id="btn-auth-submit"
              type="submit"
              disabled={isLoading}
              className="btn-primary"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AUTHENTICATING...</span>
                </>
              ) : (
                <span>{mode === "login" ? "CONTINUE" : "CREATE ACCOUNT"}</span>
              )}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};
