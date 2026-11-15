import React, { useState } from "react";
import {
  Sparkles,
  Database,
  Terminal,
  ShieldCheck,
  CheckCircle2,
  Code2,
  Cpu,
  Layers,
  HelpCircle,
  Play,
  Copy,
  ChevronDown,
  ChevronUp,
  FileText
} from "lucide-react";
import { VIVA_DEFENSE_CARDS } from "../data/mockDatabase";

export const ArchitectureVivaView = () => {
  const [selectedVivaId, setSelectedVivaId] = useState(VIVA_DEFENSE_CARDS[0].id);
  const [activeEndpoint, setActiveEndpoint] = useState("/api/health");
  const [apiResponse, setApiResponse] = useState(null);
  const [isCallingApi, setIsCallingApi] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const activeVivaCard = VIVA_DEFENSE_CARDS.find(c => c.id === selectedVivaId) || VIVA_DEFENSE_CARDS[0];

  const handleTestEndpoint = async (route) => {
    setActiveEndpoint(route);
    setIsCallingApi(true);
    try {
      let res;
      if (route === "/api/health") {
        res = await fetch("/api/health");
      } else if (route === "/api/auth/me") {
        res = await fetch("/api/auth/me");
      } else if (route === "/api/articles") {
        res = await fetch("/api/articles?pageSize=3");
      } else if (route === "/api/ai/summary") {
        res = await fetch("/api/ai/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "Async SQLAlchemy 2.0 Connection Pools",
            text: "FastAPI with SQLAlchemy asyncpg connection pool life-cycle under burst traffic.",
          }),
        });
      }
      if (res) {
        const json = await res.json();
        setApiResponse(json);
      }
    } catch (err) {
      setApiResponse({ error: "API call failed", details: String(err) });
    } finally {
      setIsCallingApi(false);
    }
  };

  const handleCopyCode = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="border-2 border-[var(--border-dim)] bg-[var(--bg-surface)] p-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2 border border-[var(--accent)]/40 bg-[var(--accent-muted)] text-[var(--accent)]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-[var(--ink)]">
              Architecture & Mentor Review Reference
            </h2>
            <p className="text-xs text-[var(--ink-muted)] font-mono">
              Defense dossier for <strong className="text-[var(--ink)]">Saurabh Goswami</strong> | Supervisor: <strong className="text-[var(--ink)]">Mr. Meetender</strong> (BCIIT, GGSIPU Delhi | MCA 2025–2027).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[var(--border-dim)] text-xs font-mono">
          <div className="bg-[var(--bg)] p-3 border border-[var(--border-dim)]">
            <span className="text-[10px] text-[var(--ink-muted)] uppercase tracking-widest block font-bold">Backend Engine</span>
            <span className="font-mono text-[var(--accent)] font-bold">FastAPI (Python 3.13)</span>
          </div>
          <div className="bg-[var(--bg)] p-3 border border-[var(--border-dim)]">
            <span className="text-[10px] text-[var(--ink-muted)] uppercase tracking-widest block font-bold">Database ORM</span>
            <span className="font-mono text-[var(--accent)] font-bold">SQLAlchemy 2.0 Async</span>
          </div>
          <div className="bg-[var(--bg)] p-3 border border-[var(--border-dim)]">
            <span className="text-[10px] text-[var(--ink-muted)] uppercase tracking-widest block font-bold">Dual Storage</span>
            <span className="font-mono text-[var(--accent)] font-bold">SQLite ⇄ PostgreSQL</span>
          </div>
          <div className="bg-[var(--bg)] p-3 border border-[var(--border-dim)]">
            <span className="text-[10px] text-[var(--ink-muted)] uppercase tracking-widest block font-bold">Feature Tokenizer</span>
            <span className="font-mono text-[var(--accent)] font-bold">scikit-learn TF-IDF</span>
          </div>
        </div>
      </div>

      {/* Part 1: Viva Defense Cards (Supervisor Questions & Answers) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-bold text-[var(--ink)] uppercase tracking-widest flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-[var(--accent)]" />
            Mentor Review & Defense Knowledge Base
          </h3>
          <span className="text-xs font-mono text-[var(--ink-muted)]">
            7 Verified Engineering Defenses
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: List of Question Tabs */}
          <div className="space-y-2 font-mono">
            {VIVA_DEFENSE_CARDS.map(card => {
              const isSelected = selectedVivaId === card.id;
              return (
                <button
                  key={card.id}
                  onClick={() => setSelectedVivaId(card.id)}
                  className={`w-full text-left p-3 border-2 text-xs transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[var(--accent)] text-[#111113] border-[var(--accent)] font-bold"
                      : "bg-[var(--bg)] border-[var(--border-dim)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:border-[var(--ink)]"
                  }`}
                >
                  <span className={`text-[10px] uppercase tracking-widest block mb-1 font-bold ${
                    isSelected ? "text-[#111113]" : "text-[var(--accent)]"
                  }`}>
                    {card.topic}
                  </span>
                  <span className="font-medium line-clamp-2">{card.question}</span>
                </button>
              );
            })}
          </div>

          {/* Right Column: Active Card Expanded Defense Analysis */}
          <div className="lg:col-span-2 space-y-4">
            <div className="border-2 border-[var(--border-dim)] bg-[var(--bg-surface)] p-6 space-y-5">
              {/* Question Header */}
              <div className="space-y-2 border-b border-[var(--border-dim)] pb-4">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-[var(--accent-muted)] text-[var(--accent)] border border-[var(--accent)]/40 uppercase">
                  Topic: {activeVivaCard.topic}
                </span>
                <h4 className="text-base sm:text-lg font-bold text-[var(--ink)] leading-snug">
                  &quot;{activeVivaCard.question}&quot;
                </h4>
              </div>

              {/* Mentor Intent Box */}
              <div className="p-3.5 bg-[var(--bg)] border-2 border-[var(--accent)]/40 text-xs space-y-1 font-mono">
                <span className="text-[var(--accent)] uppercase tracking-widest text-[10px] font-bold block flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  What Mentor is Evaluating:
                </span>
                <p className="text-[var(--ink-muted)] italic font-sans">{activeVivaCard.mentorIntent}</p>
              </div>

              {/* Verified Student Defense Answer */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono font-bold text-[var(--ink-muted)] uppercase tracking-widest block">
                  Recommended Technical Defense:
                </span>
                <div className="p-4 bg-[var(--bg)] border-2 border-[var(--border-dim)] text-xs sm:text-sm text-[var(--ink)] leading-relaxed font-sans">
                  {activeVivaCard.studentAnswer}
                </div>
              </div>

              {/* Codebase & Repository Pointer */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--border-dim)] text-xs font-mono text-[var(--ink-muted)]">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-[var(--accent)]" />
                  <span>Code Pointer: <code className="text-[var(--accent)] font-bold text-[11px]">{activeVivaCard.codeReference}</code></span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {activeVivaCard.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5 bg-[var(--bg)] text-[var(--ink)] border border-[var(--border-dim)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Part 2: Database ORM Schema Architecture */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-bold text-[var(--ink)] uppercase tracking-widest flex items-center gap-2">
            <Database className="w-4 h-4 text-[var(--accent)]" />
            Database Schema & Relational Models (4 Tables)
          </h3>
          <span className="text-xs font-mono text-[var(--ink-muted)]">
            Alembic: 0001_initial_tables.py
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Table 1: users */}
          <div className="border-2 border-[var(--border-dim)] bg-[var(--bg-surface)] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--border-dim)] pb-2">
              <span className="font-mono font-bold text-[var(--accent)] text-xs uppercase">Table: users</span>
              <span className="text-[10px] text-[var(--ink-muted)] font-mono">ORM</span>
            </div>
            <ul className="space-y-1.5 font-mono text-[11px] text-[var(--ink)]">
              <li><strong className="text-[var(--accent)]">id</strong>: UUID / Int (PK)</li>
              <li><strong className="text-[var(--ink-muted)]">email</strong>: String (Unique)</li>
              <li><strong className="text-[var(--ink-muted)]">hashed_password</strong>: Bcrypt</li>
              <li><strong className="text-[var(--ink-muted)]">selected_categories</strong>: JSON</li>
              <li><strong className="text-[var(--ink-muted)]">created_at</strong>: DateTime</li>
            </ul>
          </div>

          {/* Table 2: categories */}
          <div className="border-2 border-[var(--border-dim)] bg-[var(--bg-surface)] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--border-dim)] pb-2">
              <span className="font-mono font-bold text-[var(--accent)] text-xs uppercase">Table: categories</span>
              <span className="text-[10px] text-[var(--ink-muted)] font-mono">Lookup</span>
            </div>
            <ul className="space-y-1.5 font-mono text-[11px] text-[var(--ink)]">
              <li><strong className="text-[var(--accent)]">id</strong>: Slug (PK)</li>
              <li><strong className="text-[var(--ink-muted)]">name</strong>: String</li>
              <li><strong className="text-[var(--ink-muted)]">description</strong>: Text</li>
              <li><strong className="text-[var(--ink-muted)]">icon_key</strong>: String</li>
            </ul>
          </div>

          {/* Table 3: articles */}
          <div className="border-2 border-[var(--border-dim)] bg-[var(--bg-surface)] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--border-dim)] pb-2">
              <span className="font-mono font-bold text-[var(--accent)] text-xs uppercase">Table: articles</span>
              <span className="text-[10px] text-[var(--ink-muted)] font-mono">Core Store</span>
            </div>
            <ul className="space-y-1.5 font-mono text-[11px] text-[var(--ink)]">
              <li><strong className="text-[var(--accent)]">id</strong>: String (PK)</li>
              <li><strong className="text-[var(--ink-muted)]">title</strong>: String (Indexed)</li>
              <li><strong className="text-[var(--ink-muted)]">source_url</strong>: String (Unique)</li>
              <li><strong className="text-[var(--ink-muted)]">source_type</strong>: Enum</li>
              <li><strong className="text-[var(--ink-muted)]">category_id</strong>: FK(categories)</li>
              <li><strong className="text-[var(--ink-muted)]">summary</strong>: Text</li>
              <li><strong className="text-[var(--ink-muted)]">skills_json</strong>: JSON</li>
            </ul>
          </div>

          {/* Table 4: read_events */}
          <div className="border-2 border-[var(--border-dim)] bg-[var(--bg-surface)] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--border-dim)] pb-2">
              <span className="font-mono font-bold text-[var(--accent)] text-xs uppercase">Table: read_events</span>
              <span className="text-[10px] text-[var(--ink-muted)] font-mono">Telemetry</span>
            </div>
            <ul className="space-y-1.5 font-mono text-[11px] text-[var(--ink)]">
              <li><strong className="text-[var(--accent)]">id</strong>: Integer (PK)</li>
              <li><strong className="text-[var(--ink-muted)]">user_id</strong>: FK(users.id)</li>
              <li><strong className="text-[var(--ink-muted)]">article_id</strong>: FK(articles.id)</li>
              <li><strong className="text-[var(--ink-muted)]">quiz_score</strong>: Float (Nullable)</li>
              <li><strong className="text-[var(--ink-muted)]">read_timestamp</strong>: DateTime</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Part 3: Live FastAPI Endpoints Testing Console */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-bold text-[var(--ink)] uppercase tracking-widest flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[var(--accent)]" />
            FastAPI Live Endpoints Explorer
          </h3>
          <span className="text-xs font-mono text-[var(--ink-muted)]">
            Interactive Test Console
          </span>
        </div>

        <div className="border-2 border-[var(--border-dim)] bg-[var(--bg-surface)] p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { label: "GET /api/health", route: "/api/health" },
              { label: "GET /api/auth/me", route: "/api/auth/me" },
              { label: "GET /api/articles", route: "/api/articles" },
              { label: "POST /api/ai/summary", route: "/api/ai/summary" },
            ].map(ep => (
              <button
                key={ep.route}
                onClick={() => handleTestEndpoint(ep.route)}
                disabled={isCallingApi}
                className={`px-3 py-1.5 text-xs font-mono transition-all flex items-center gap-1.5 uppercase font-bold cursor-pointer ${
                  activeEndpoint === ep.route
                    ? "bg-[var(--accent)] text-[#111113] border border-[var(--accent)]"
                    : "bg-[var(--bg)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--bg-elevated)] border border-[var(--border-dim)]"
                }`}
              >
                <Play className="w-3 h-3" />
                {ep.label}
              </button>
            ))}
          </div>

          {/* Response Box */}
          <div className="bg-[var(--bg)] border-2 border-[var(--border-dim)] p-4 font-mono text-xs overflow-x-auto max-h-80">
            <div className="flex items-center justify-between text-[var(--ink-muted)] mb-2 border-b border-[var(--border-dim)] pb-2 text-[11px]">
              <span className="text-[var(--accent)] font-bold uppercase">HTTP 200 OK • Response JSON Payload:</span>
              <span className="uppercase text-[10px]">{isCallingApi ? "Executing..." : "Ready"}</span>
            </div>
            {isCallingApi ? (
              <p className="text-[var(--accent)] animate-pulse">Dispatching request to {activeEndpoint}...</p>
            ) : apiResponse ? (
              <pre className="text-[var(--accent)] whitespace-pre-wrap leading-relaxed">
                {JSON.stringify(apiResponse, null, 2)}
              </pre>
            ) : (
              <p className="text-[var(--ink-muted)]">
                Click any endpoint button above to test live JSON payloads returned by the server.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
