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

export const ArchitectureVivaView: React.FC = () => {
  const [selectedVivaId, setSelectedVivaId] = useState<string>(VIVA_DEFENSE_CARDS[0].id);
  const [activeEndpoint, setActiveEndpoint] = useState<string>("/api/health");
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [isCallingApi, setIsCallingApi] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeVivaCard = VIVA_DEFENSE_CARDS.find(c => c.id === selectedVivaId) || VIVA_DEFENSE_CARDS[0];

  const handleTestEndpoint = async (route: string) => {
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

  const handleCopyCode = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="border-2 border-[#2D3139] bg-[#16191E] p-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2 border border-amber-500/40 bg-amber-500/10 text-amber-500">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-white">
              Architecture & Mentor Review Reference
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Defense dossier for <strong className="text-slate-200">Saurabh Goswami</strong> | Supervisor: <strong className="text-slate-200">Mr. Meetender</strong> (BCIIT, GGSIPU Delhi | MCA 2025–2027).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#2D3139] text-xs font-mono">
          <div className="bg-[#0F1115] p-3 border border-[#2D3139]">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold">Backend Engine</span>
            <span className="font-mono text-amber-400 font-bold">FastAPI (Python 3.13)</span>
          </div>
          <div className="bg-[#0F1115] p-3 border border-[#2D3139]">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold">Database ORM</span>
            <span className="font-mono text-amber-400 font-bold">SQLAlchemy 2.0 Async</span>
          </div>
          <div className="bg-[#0F1115] p-3 border border-[#2D3139]">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold">Dual Storage</span>
            <span className="font-mono text-amber-400 font-bold">SQLite ⇄ PostgreSQL</span>
          </div>
          <div className="bg-[#0F1115] p-3 border border-[#2D3139]">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold">Feature Tokenizer</span>
            <span className="font-mono text-amber-400 font-bold">scikit-learn TF-IDF</span>
          </div>
        </div>
      </div>

      {/* Part 1: Viva Defense Cards (Supervisor Questions & Answers) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-amber-500" />
            Mentor Review & Defense Knowledge Base
          </h3>
          <span className="text-xs font-mono text-slate-400">
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
                  className={`w-full text-left p-3 border-2 text-xs transition-all ${
                    isSelected
                      ? "bg-amber-500 text-black border-amber-400 font-bold"
                      : "bg-[#0F1115] border-[#2D3139] text-slate-400 hover:text-white hover:bg-[#1A1D23]"
                  }`}
                >
                  <span className={`text-[10px] uppercase tracking-widest block mb-1 font-bold ${
                    isSelected ? "text-black" : "text-amber-500"
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
            <div className="border-2 border-[#2D3139] bg-[#16191E] p-6 space-y-5">
              {/* Question Header */}
              <div className="space-y-2 border-b border-[#2D3139] pb-4">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/40 uppercase">
                  Topic: {activeVivaCard.topic}
                </span>
                <h4 className="text-base sm:text-lg font-bold text-white leading-snug">
                  &quot;{activeVivaCard.question}&quot;
                </h4>
              </div>

              {/* Mentor Intent Box */}
              <div className="p-3.5 bg-[#0F1115] border-2 border-amber-500/30 text-xs space-y-1 font-mono">
                <span className="text-amber-400 uppercase tracking-widest text-[10px] font-bold block flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  What Mentor is Evaluating:
                </span>
                <p className="text-slate-300 italic">{activeVivaCard.mentorIntent}</p>
              </div>

              {/* Verified Student Defense Answer */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
                  Recommended Technical Defense:
                </span>
                <div className="p-4 bg-[#0F1115] border-2 border-[#2D3139] text-xs sm:text-sm text-slate-200 leading-relaxed font-mono">
                  {activeVivaCard.studentAnswer}
                </div>
              </div>

              {/* Codebase & Repository Pointer */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#2D3139] text-xs font-mono text-slate-400">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-amber-500" />
                  <span>Code Pointer: <code className="text-amber-400 font-bold text-[11px]">{activeVivaCard.codeReference}</code></span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {activeVivaCard.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5 bg-[#0F1115] text-slate-300 border border-[#2D3139]"
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
          <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-500" />
            Database Schema & Relational Models (4 Tables)
          </h3>
          <span className="text-xs font-mono text-slate-400">
            Alembic: 0001_initial_tables.py
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Table 1: users */}
          <div className="border-2 border-[#2D3139] bg-[#16191E] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#2D3139] pb-2">
              <span className="font-mono font-bold text-amber-500 text-xs uppercase">Table: users</span>
              <span className="text-[10px] text-slate-500 font-mono">ORM</span>
            </div>
            <ul className="space-y-1.5 font-mono text-[11px] text-slate-300">
              <li><strong className="text-amber-400">id</strong>: UUID / Int (PK)</li>
              <li><strong className="text-slate-200">email</strong>: String (Unique)</li>
              <li><strong className="text-slate-200">hashed_password</strong>: Bcrypt</li>
              <li><strong className="text-slate-200">selected_categories</strong>: JSON</li>
              <li><strong className="text-slate-200">created_at</strong>: DateTime</li>
            </ul>
          </div>

          {/* Table 2: categories */}
          <div className="border-2 border-[#2D3139] bg-[#16191E] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#2D3139] pb-2">
              <span className="font-mono font-bold text-amber-500 text-xs uppercase">Table: categories</span>
              <span className="text-[10px] text-slate-500 font-mono">Lookup</span>
            </div>
            <ul className="space-y-1.5 font-mono text-[11px] text-slate-300">
              <li><strong className="text-amber-400">id</strong>: Slug (PK)</li>
              <li><strong className="text-slate-200">name</strong>: String</li>
              <li><strong className="text-slate-200">description</strong>: Text</li>
              <li><strong className="text-slate-200">icon_key</strong>: String</li>
            </ul>
          </div>

          {/* Table 3: articles */}
          <div className="border-2 border-[#2D3139] bg-[#16191E] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#2D3139] pb-2">
              <span className="font-mono font-bold text-amber-500 text-xs uppercase">Table: articles</span>
              <span className="text-[10px] text-slate-500 font-mono">Core Store</span>
            </div>
            <ul className="space-y-1.5 font-mono text-[11px] text-slate-300">
              <li><strong className="text-amber-400">id</strong>: String (PK)</li>
              <li><strong className="text-slate-200">title</strong>: String (Indexed)</li>
              <li><strong className="text-slate-200">source_url</strong>: String (Unique)</li>
              <li><strong className="text-slate-200">source_type</strong>: Enum</li>
              <li><strong className="text-slate-200">category_id</strong>: FK(categories)</li>
              <li><strong className="text-slate-200">summary</strong>: Text</li>
              <li><strong className="text-slate-200">skills_json</strong>: JSON</li>
            </ul>
          </div>

          {/* Table 4: read_events */}
          <div className="border-2 border-[#2D3139] bg-[#16191E] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#2D3139] pb-2">
              <span className="font-mono font-bold text-amber-500 text-xs uppercase">Table: read_events</span>
              <span className="text-[10px] text-slate-500 font-mono">Telemetry</span>
            </div>
            <ul className="space-y-1.5 font-mono text-[11px] text-slate-300">
              <li><strong className="text-amber-400">id</strong>: Integer (PK)</li>
              <li><strong className="text-slate-200">user_id</strong>: FK(users.id)</li>
              <li><strong className="text-slate-200">article_id</strong>: FK(articles.id)</li>
              <li><strong className="text-slate-200">quiz_score</strong>: Float (Nullable)</li>
              <li><strong className="text-slate-200">read_timestamp</strong>: DateTime</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Part 3: Live FastAPI Endpoints Testing Console */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2">
            <Terminal className="w-4 h-4 text-amber-500" />
            FastAPI Live Endpoints Explorer
          </h3>
          <span className="text-xs font-mono text-slate-400">
            Interactive Test Console
          </span>
        </div>

        <div className="border-2 border-[#2D3139] bg-[#16191E] p-5 space-y-4">
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
                className={`px-3 py-1.5 text-xs font-mono transition-all flex items-center gap-1.5 uppercase font-bold ${
                  activeEndpoint === ep.route
                    ? "bg-amber-500 text-black border border-amber-400"
                    : "bg-[#0F1115] text-slate-300 hover:bg-[#1A1D23] border border-[#2D3139]"
                }`}
              >
                <Play className="w-3 h-3" />
                {ep.label}
              </button>
            ))}
          </div>

          {/* Response Box */}
          <div className="bg-[#0F1115] border-2 border-[#2D3139] p-4 font-mono text-xs overflow-x-auto max-h-80">
            <div className="flex items-center justify-between text-slate-500 mb-2 border-b border-[#2D3139] pb-2 text-[11px]">
              <span className="text-amber-500 font-bold uppercase">HTTP 200 OK • Response JSON Payload:</span>
              <span className="uppercase text-[10px]">{isCallingApi ? "Executing..." : "Ready"}</span>
            </div>
            {isCallingApi ? (
              <p className="text-amber-400 animate-pulse">Dispatching request to {activeEndpoint}...</p>
            ) : apiResponse ? (
              <pre className="text-amber-400 whitespace-pre-wrap leading-relaxed">
                {JSON.stringify(apiResponse, null, 2)}
              </pre>
            ) : (
              <p className="text-slate-500">
                Click any endpoint button above to test live JSON payloads returned by the server.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
