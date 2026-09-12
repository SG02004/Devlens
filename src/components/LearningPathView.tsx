import React, { useState } from "react";
import {
  GraduationCap,
  Sparkles,
  Calendar,
  CheckCircle2,
  FileCode,
  HelpCircle,
  BookOpen,
  ArrowRight,
  Layers,
  Loader2
} from "lucide-react";
import { LearningPath } from "../types";

export const LearningPathView: React.FC = () => {
  const [topic, setTopic] = useState("Distributed Systems & Cloud Architecture");
  const [targetRole, setTargetRole] = useState("Backend Engineer Placement Candidate");
  const [isLoading, setIsLoading] = useState(false);

  const [pathData, setPathData] = useState<LearningPath>({
    topic: "Distributed Systems & Cloud Architecture",
    targetRole: "Backend Engineer Placement Candidate",
    prerequisites: [
      "Data Structures & Algorithms (Trees, Graphs, Hash Maps)",
      "SQL Relational Schema Design & ACID Transactions",
      "Asynchronous I/O Event Loops (Node.js / Python / Go)",
    ],
    milestones: [
      {
        week: "Milestone 1 (Week 1–2)",
        title: "Asynchronous Concurrency & Connection Pooling",
        objectives: [
          "Master non-blocking I/O event loops and high-concurrency request lifecycles",
          "Implement connection pooling with PostgreSQL asyncpg/pg-pool",
          "Configure strict JSON schema validation and zero-downtime error boundaries",
        ],
        practicalProject: "High-throughput telemetry ingestion pipeline with dual-environment local caching.",
        interviewPrepTopics: [
          "Event loop mechanics and cooperative multitasking",
          "Deadlock vs starvation in connection pools under load spikes",
          "ACID vs BASE consistency models in distributed data stores",
        ],
      },
      {
        week: "Milestone 2 (Week 3–4)",
        title: "Resilient Ingestion & Distributed Crawler Architecture",
        objectives: [
          "Build asynchronous HTTP crawlers pulling from Dev.to, HN Algolia, and arXiv",
          "Implement URL hash deduplication and idempotent database upserts",
          "Handle network timeouts and upstream rate-limiting using exponential backoff with jitter",
        ],
        practicalProject: "Multi-stream self-sourcing crawler with rate limiting, error recovery, and automated normalization.",
        interviewPrepTopics: [
          "Idempotency keys and preventing duplicate state mutations",
          "Exponential backoff algorithms with jitter to prevent thundering herd",
          "API rate-limiting algorithms (Token Bucket vs Leaky Bucket)",
        ],
      },
      {
        week: "Milestone 3 (Week 5–6)",
        title: "Information Retrieval: TF-IDF, Vector Embeddings & Hybrid Search",
        objectives: [
          "Implement deterministic tokenization, stopword filtering, and inverse document frequency scoring",
          "Generate high-dimensional vector embeddings with text-embedding models",
          "Build hybrid ranking combining BM25 keyword matching with cosine vector similarity",
        ],
        practicalProject: "Hybrid search index ranking 10,000+ technical articles under 15ms latency.",
        interviewPrepTopics: [
          "TF-IDF mathematical formulation and handling sparsity",
          "Approximate Nearest Neighbor (ANN) index algorithms (HNSW vs IVF-PQ)",
          "Reciprocal Rank Fusion (RRF) for merging keyword and semantic search signals",
        ],
      },
      {
        week: "Milestone 4 (Week 7–8)",
        title: "Production Deployment, Latency Budgeting & Viva Defense",
        objectives: [
          "Containerize services using multi-stage Docker builds with non-root security",
          "Benchmark p95/p99 latency with Autocannon / k6 and instrument distributed tracing",
          "Prepare technical defense presentation for senior engineering review board",
        ],
        practicalProject: "Containerized deployment with CI/CD, synthetic load test suite, and architectural defense slide deck.",
        interviewPrepTopics: [
          "Tail latency amplification in fan-out distributed architectures",
          "Graceful degradation and circuit breakers (Netflix Hystrix pattern)",
          "Production root-cause analysis post-mortems and blameless retrospective culture",
        ],
      },
    ],
    proofOfWorkProject: {
      title: "DevLens: Full-Stack Real-Time Technical Intelligence Platform",
      deliverables: [
        "Async ingestion engine syncing 3 external developer APIs concurrently",
        "Deterministic TF-IDF tokenization engine with zero external NLP dependencies",
        "Dual-mode local/cloud database architecture with automated migration scripts",
        "Production viva defense documentation detailing latency SLAs and scaling tradeoffs",
      ],
      vivaPrepQuestions: [
        {
          question: "How did you prevent thundering herd when three external APIs sync simultaneously?",
          answer: "By wrapping each HTTP fetch client in an async semaphore pool (max concurrency = 4) and introducing randomized jitter (100–500ms) to exponential backoff delays.",
        },
        {
          question: "Why chose TF-IDF with manual tokenization over an external microservice?",
          answer: "For zero-dependency sub-millisecond execution directly in the application runtime, enabling zero-cost local cold-starts and complete reproducibility.",
        },
      ],
    },
  });

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/learning-path/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, targetRole }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.learningPath) {
          setPathData(data.learningPath);
        }
      }
    } catch {
      // Keep existing high-quality state
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="learning-path-view" className="w-full space-y-8 animate-fade-in-up text-left font-mono">
      {/* Header Banner */}
      <section className="card p-6 sm:p-10 border-2 border-[var(--ink)] bg-[var(--bg-surface)] shadow-sm">
        <div className="meta-tag">Sprint Curriculum & Competencies</div>
        <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl text-[var(--ink)] leading-[0.95] tracking-tight mt-4">
          Structured Learning Roadmap
        </h1>
        <p className="text-xs sm:text-sm text-[var(--ink-muted)] mt-3 leading-relaxed max-w-2xl">
          Architected for senior engineering readiness. Master distributed systems, asynchronous event loops, and interview defense topics through verified milestones.
        </p>

        {/* Custom Generator Form */}
        <form onSubmit={handleGenerate} className="mt-8 pt-6 border-t border-[var(--border-dim)] grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] items-end">
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-widest text-[var(--ink-muted)] mb-2">
              TARGET ENGINEERING DOMAIN
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Distributed Consensus & Raft"
              className="w-full bg-[var(--bg)] border border-[var(--ink)] px-3 py-2.5 text-xs text-[var(--ink)] focus:border-[var(--accent)] outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold tracking-widest text-[var(--ink-muted)] mb-2">
              CAREER TARGET
            </label>
            <input
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. Senior Backend Engineer"
              className="w-full bg-[var(--bg)] border border-[var(--ink)] px-3 py-2.5 text-xs text-[var(--ink)] focus:border-[var(--accent)] outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="border-2 border-[var(--accent)] bg-[var(--accent)] text-[#111113] hover:bg-transparent hover:text-[var(--accent)] px-5 py-2.5 text-xs font-display font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 disabled:opacity-50 h-[42px] cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>SYNTHESIZING...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>GENERATE ROADMAP</span>
              </>
            )}
          </button>
        </form>
      </section>

      {/* Prerequisites Bar */}
      {pathData.prerequisites && pathData.prerequisites.length > 0 && (
        <section className="card p-5 border-2 border-[var(--ink)] bg-[var(--bg-surface)] shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent)] flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>CORE PREREQUISITES:</span>
            </span>
            <div className="flex flex-wrap gap-2">
              {pathData.prerequisites.map((req, idx) => (
                <span
                  key={idx}
                  className="text-xs px-3 py-1 border border-[var(--border-dim)] text-[var(--ink)] bg-[var(--bg)]"
                >
                  {req}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Milestone Cards */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b-2 border-[var(--border-dim)] pb-3">
          <h2 className="font-display text-2xl sm:text-3xl text-[var(--ink)]">Curriculum Milestones</h2>
          <span className="text-xs font-bold text-[var(--accent)]">[{pathData.milestones.length} MILESTONES]</span>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {pathData.milestones.map((m, idx) => (
            <article
              key={idx}
              className="card p-6 sm:p-8 border-2 border-[var(--ink)] bg-[var(--bg-surface)] flex flex-col justify-between space-y-6 hover:border-[var(--accent)] transition-colors shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border-dim)]">
                  <span className="meta-tag-accent text-[9px]">{m.week}</span>
                  <span className="text-[10px] font-bold text-[var(--ink-muted)]">STAGE {idx + 1}</span>
                </div>

                <h3 className="font-display text-xl sm:text-2xl text-[var(--ink)] mt-4 leading-snug">
                  {m.title}
                </h3>

                {/* Objectives */}
                <div className="mt-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-muted)]">
                    LEARNING OBJECTIVES
                  </p>
                  <ul className="mt-2 space-y-2 text-xs text-[var(--ink)]">
                    {m.objectives.map((obj, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent)] shrink-0 mt-0.5" />
                        <span>{obj}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Practical Project */}
                <div className="mt-5 p-3.5 border border-[var(--border-dim)] bg-[var(--bg)]">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent)] flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5" />
                    <span>PROOF OF WORK DELIVERABLE</span>
                  </p>
                  <p className="text-xs text-[var(--ink)] mt-1 leading-relaxed">
                    {m.practicalProject}
                  </p>
                </div>
              </div>

              {/* Interview Prep */}
              <div className="pt-4 border-t border-[var(--border-dim)]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-muted)] mb-2">
                  SENIOR INTERVIEW FOCUS
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {m.interviewPrepTopics.map((top, i) => (
                    <span
                      key={i}
                      className="text-[11px] px-2 py-0.5 border border-[var(--border-dim)] text-[var(--ink-muted)]"
                    >
                      {top}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Proof of Work Project & Viva Defense */}
      {pathData.proofOfWorkProject && (
        <section className="card p-6 sm:p-10 border-2 border-[var(--accent)] bg-[var(--bg-surface)] space-y-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-[var(--accent)]/30">
            <div>
              <span className="meta-tag-accent text-[9px]">CAPSTONE ARCHITECTURE</span>
              <h2 className="font-display text-2xl sm:text-3xl text-[var(--ink)] mt-2">
                {pathData.proofOfWorkProject.title}
              </h2>
            </div>
            <GraduationCap className="w-8 h-8 text-[var(--accent)]" />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-muted)] mb-3">
                CORE DELIVERABLES
              </p>
              <ul className="space-y-2.5 text-xs text-[var(--ink)]">
                {pathData.proofOfWorkProject.deliverables.map((d, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 bg-[var(--accent)] mt-1.5 shrink-0" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-muted)] mb-3">
                VIVA DEFENSE QUESTIONS & ANSWERS
              </p>
              <div className="space-y-3 text-xs">
                {pathData.proofOfWorkProject.vivaPrepQuestions.map((q, i) => (
                  <div key={i} className="p-3 border border-[var(--border-dim)] bg-[var(--bg)]">
                    <p className="font-bold text-[var(--accent)]">Q: {q.question}</p>
                    <p className="text-[var(--ink-muted)] mt-1.5 leading-relaxed">A: {q.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
