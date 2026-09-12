import { Article, UserProfile, VivaCard } from "../types";

export const INITIAL_USER_PROFILE: UserProfile = {
  name: "Alex Dev",
  email: "alex.dev@example.com",
  institution: "Full-Stack & Systems Engineering",
  program: "Senior Developer",
  batch: "Active Member",
  supervisor: "",
  selectedCategories: ["ai-ml", "web-dev", "cloud-systems", "cybersecurity"],
  readCount: 14,
  quizzesTaken: 0,
  averageQuizScore: 0,
};

export const CATEGORIES_CONFIG = [
  { id: "all", label: "All Engineering" },
  { id: "ai-ml", label: "AI & Machine Learning" },
  { id: "web-dev", label: "Full-Stack & Web" },
  { id: "cloud-systems", label: "Distributed Systems & Cloud" },
  { id: "cybersecurity", label: "Security & Cryptography" },
  { id: "devops", label: "DevOps & Infrastructure" },
  { id: "mobile", label: "Mobile Engineering" },
] as const;

export const INITIAL_ARTICLES: Article[] = [
  {
    id: "art-1",
    title: "Understanding Speculative Decoding in Modern LLM Serving",
    source: "arXiv",
    sourceUrl: "https://arxiv.org/abs/2401.08417",
    author: "Z. Chen, H. Zhang, K. Wang (arXiv:2401.08417)",
    publishedAt: "2026-09-02T10:30:00Z",
    category: "ai-ml",
    categoryLabel: "AI & Machine Learning",
    readTimeMinutes: 7,
    difficulty: "Advanced",
    summary:
      "A deep dive into speculative execution for transformer inference, using a smaller draft model to hypothesize candidate token sequences validated in parallel by a target foundation model.",
    whyItMatters:
      "LLM latency is severely memory-bandwidth bound during autoregressive decoding. Speculative decoding achieves 2x-3x speedups without degrading target model output distribution or accuracy.",
    keyTakeaways: [
      "Autoregressive decoding generates tokens serially, leaving GPU compute underutilized.",
      "A compact draft model (e.g. 1B parameter) proposes K candidate tokens.",
      "The primary model verifies all K tokens in a single parallel forward pass.",
      "Verification is mathematically lossless: guaranteed sampling equivalence with original distribution.",
    ],
    skillsExtracted: ["Transformer Architecture", "GPU Memory Bandwidth", "KV Cache", "PyTorch", "vLLM", "Speculative Execution"],
    upvotes: 412,
    commentsCount: 68,
    isBookmarked: true,
  },
  {
    id: "art-2",
    title: "Building Resilient Event-Driven Architectures with Kafka and Outbox Pattern",
    source: "Dev.to",
    sourceUrl: "https://dev.to/engineering/event-driven-outbox-pattern-resilience",
    author: "Elena Rostova, Staff Engineer",
    publishedAt: "2026-09-03T14:15:00Z",
    category: "cloud-systems",
    categoryLabel: "Distributed Systems & Cloud",
    readTimeMinutes: 9,
    difficulty: "Intermediate",
    summary:
      "How to avoid dual-write race conditions when updating SQL databases while simultaneously dispatching asynchronous domain events to Apache Kafka or RabbitMQ clusters.",
    whyItMatters:
      "Dual-write bugs cause silent data drift between microservice databases and downstream consumers. The transactional outbox pattern guarantees at-least-once event delivery.",
    keyTakeaways: [
      "Dual writes without two-phase commit inevitably fail if the message broker drops or times out.",
      "Write both business entity and message record in a single ACID database transaction.",
      "A background CDC worker (Debezium / polling daemon) reads the outbox table and dispatches events.",
      "Downstream consumers must implement idempotency keys to handle at-least-once semantics.",
    ],
    skillsExtracted: ["Apache Kafka", "PostgreSQL", "Transactional Outbox", "Microservices", "Event-Driven", "Debezium"],
    upvotes: 284,
    commentsCount: 39,
  },
  {
    id: "art-3",
    title: "Async SQLAlchemy 2.0 and Connection Pool Lifecycle under High Concurrency",
    source: "Hacker News",
    sourceUrl: "https://news.ycombinator.com/item?id=38914022",
    author: "alex_systems (HN Algolia)",
    publishedAt: "2026-09-04T08:20:00Z",
    category: "web-dev",
    categoryLabel: "Full-Stack & Web",
    readTimeMinutes: 6,
    difficulty: "Intermediate",
    summary:
      "Exploration of asyncpg connection pooling, greenlet context switching, and avoiding connection starvation in Python ASGI web frameworks like FastAPI and Starlette.",
    whyItMatters:
      "Misconfigured connection pools trigger database connection timeouts under burst traffic, even when CPU and RAM utilization are low.",
    keyTakeaways: [
      "SQLAlchemy 2.0 makes type annotations and explicit AsyncSession usage standard.",
      "AsyncEngine maintains a pool of connections; failing to release sessions leaks pool slots.",
      "FastAPI's dependency injection `Depends(get_db)` automatically yields and cleans up sessions per request.",
      "Use `pool_pre_ping=True` to prune dead connections before handing them to active coroutines.",
    ],
    skillsExtracted: ["Python 3.13", "FastAPI", "SQLAlchemy 2.0 Async", "asyncpg", "Connection Pooling", "PostgreSQL"],
    upvotes: 567,
    commentsCount: 142,
    isBookmarked: false,
  },
  {
    id: "art-4",
    title: "Zero-Knowledge Rollups: Understanding Validity Proofs and Data Availability",
    source: "arXiv",
    sourceUrl: "https://arxiv.org/abs/2402.04911",
    author: "M. Klein, S. Gupta (arXiv:2402.04911)",
    publishedAt: "2026-09-01T17:00:00Z",
    category: "cybersecurity",
    categoryLabel: "Security & Cryptography",
    readTimeMinutes: 11,
    difficulty: "Advanced",
    summary:
      "A mathematical and structural review of STARK vs SNARK polynomial commitments, recursive zk-proof generation, and mitigating off-chain data withholding attacks.",
    whyItMatters:
      "ZK rollups provide cryptographic guarantees of layer-2 execution validity, eliminating the 7-day challenge period inherent in optimistic rollups.",
    keyTakeaways: [
      "Rollup operators execute off-chain transactions and bundle state transitions into compact mathematical proofs.",
      "ZK-STARKs do not require a trusted setup ceremony and offer quantum resistance.",
      "Data availability (DA) layers ensure state reconstruction is possible even if sequencer nodes go offline.",
      "Verifier smart contracts on Layer 1 confirm algebraic polynomial identity satisfaction in constant time.",
    ],
    skillsExtracted: ["Zero-Knowledge Proofs", "Cryptography", "Polynomial Commitments", "zk-SNARKs", "STARKs", "Data Availability"],
    upvotes: 319,
    commentsCount: 51,
  },
  {
    id: "art-5",
    title: "GitOps Continuous Delivery: Automating Kubernetes Rollouts with ArgoCD",
    source: "Dev.to",
    sourceUrl: "https://dev.to/cloudnative/gitops-argocd-production-playbook",
    author: "Marcus Chen, SRE Principal",
    publishedAt: "2026-09-03T19:45:00Z",
    category: "devops",
    categoryLabel: "DevOps & Infrastructure",
    readTimeMinutes: 8,
    difficulty: "Intermediate",
    summary:
      "Best practices for declarative cluster state management, canary deployments using Argo Rollouts, and secret management using Sealed Secrets.",
    whyItMatters:
      "Direct kubectl commands create configuration drift. GitOps ensures the Git repository is the single source of truth for all infrastructure and application workloads.",
    keyTakeaways: [
      "ArgoCD continuously reconciles desired Git state against actual live Kubernetes cluster state.",
      "Canary releases gradually shift 5% -> 20% -> 50% traffic while monitoring Prometheus error metrics.",
      "Avoid storing plaintext secrets in Git: use HashiCorp Vault, AWS KMS, or Bitnami Sealed Secrets.",
      "Multi-tenant cluster policies enforced via Kyverno or OPA Gatekeeper prevent privilege escalation.",
    ],
    skillsExtracted: ["Kubernetes", "ArgoCD", "GitOps", "Docker", "Prometheus", "CI/CD Pipelines", "Helm"],
    upvotes: 245,
    commentsCount: 31,
  },
  {
    id: "art-6",
    title: "Modern React 19 State Management: Server Actions, Suspense, and Signals",
    source: "Hacker News",
    sourceUrl: "https://news.ycombinator.com/item?id=39102834",
    author: "dan_frontend (HN Algolia)",
    publishedAt: "2026-09-04T11:00:00Z",
    category: "web-dev",
    categoryLabel: "Full-Stack & Web",
    readTimeMinutes: 7,
    difficulty: "Beginner",
    summary:
      "How React 19 simplifies client-side state by transitioning async request lifecycles into useActionState, useOptimistic, and native React Server Components.",
    whyItMatters:
      "Reduces client boilerplate code previously spent maintaining manual loading and error booleans across standard form submissions and UI mutations.",
    keyTakeaways: [
      "Server actions run server-side logic invoked directly from client or server component handlers.",
      "`useActionState` manages pending state, returned action results, and previous state seamlessly.",
      "`useOptimistic` lets the UI update instantly before the network roundtrip completes.",
      "Standard client state is streamlined without over-architecting Redux or heavy global stores.",
    ],
    skillsExtracted: ["React 19", "TypeScript", "Vite", "Server Actions", "Optimistic UI", "Web Performance"],
    upvotes: 689,
    commentsCount: 215,
  },
];

export const VIVA_DEFENSE_CARDS: VivaCard[] = [
  {
    id: "viva-1",
    topic: "Architecture & Framework Choice",
    question: "Why did you choose Python and FastAPI instead of Node.js and Express?",
    mentorIntent: "Checking if this was an arbitrary switch or guided by an educational, engineering objective.",
    studentAnswer:
      "Two key reasons: First, an explicit academic goal is expanding beyond my MERN stack background into Python for AI and data engineering. Second, FastAPI natively provides async/await coroutines matching ASGI standards, strict type validation via Pydantic schemas, and auto-generated interactive OpenAPI docs at /docs with zero boilerplate. In comparison, Node/Express requires manual Swagger configuration and external validators like Joi/Zod.",
    codeReference: "devlens/backend_fastapi/main.py & routers/auth.py",
    tags: ["FastAPI", "Python 3.13", "OpenAPI", "Pydantic"],
  },
  {
    id: "viva-2",
    topic: "Content Ingestion & Integrity",
    question: "Why self-source from Dev.to, HN, and arXiv instead of using NewsAPI or GNews?",
    mentorIntent: "Verifying whether the student created genuine algorithmic pipelines or just called a turnkey third-party commercial API.",
    studentAnswer:
      "NewsAPI and GNews free tiers strictly prohibit commercial or production deployment in their Terms of Service. Furthermore, calling a pre-packaged news API does not constitute an original AI agent. By self-sourcing directly from Dev.to API, Hacker News Algolia search API, and arXiv Atom XML feeds, DevLens implements an original multi-source ingestion, normalization, and deduplication layer with zero licensing restrictions.",
    codeReference: "devlens/backend_fastapi/routers/news.py (/sync-live)",
    tags: ["Self-Sourcing", "Dev.to", "Hacker News", "arXiv", "No ToS Restrictions"],
  },
  {
    id: "viva-3",
    topic: "AI Agent Formulation",
    question: "What makes this a 'Custom AI Agent' rather than just an LLM API wrapper?",
    mentorIntent: "Probing whether LLM prompts are the only logic or if there is original computational orchestration.",
    studentAnswer:
      "The Gemini LLM is treated as just one isolated tool in a 6-step agent workflow. The original code lies in the orchestration: (1) Fetch Tool pulls and normalizes multi-source payloads; (2) Classify Tool categorizes and scores difficulty; (3) Summarize Tool extracts takeaways; (4) Skill Extractor parses tech tags; (5) Rank Tool calculates a non-LLM score based on recency decay and user category alignment; (6) Store Tool performs URL hash deduplication and async DB upserts.",
    codeReference: "devlens/backend_fastapi/routers/ai.py & news.py",
    tags: ["6-Tool Agent", "Orchestration", "Ranking Algorithm", "Deduplication"],
  },
  {
    id: "viva-4",
    topic: "Real Machine Learning (NLP)",
    question: "Is the comprehension quiz generator real Machine Learning or just a prompt?",
    mentorIntent: "Testing whether the student understands classical NLP feature engineering vs generative AI.",
    studentAnswer:
      "It is anchored by classical NLP: before invoking Gemini, we run a TF-IDF (Term Frequency-Inverse Document Frequency) vectorizer from scikit-learn. TF-IDF computes the statistical importance of terms within the article relative to the corpus. The top statistical keywords are injected into Gemini's prompt with temperature=0.1 and strict responseSchema. The LLM is mathematically grounded in those exact extracted tokens, preventing hallucination.",
    codeReference: "devlens/backend_fastapi/routers/ai.py (/api/ai/quiz) & tfidf.ts",
    tags: ["TF-IDF", "scikit-learn", "Statistical NLP", "Grounded Verification"],
  },
  {
    id: "viva-5",
    topic: "Database & Dual-Environment Strategy",
    question: "Why use SQLite locally and PostgreSQL in production? Doesn't that cause drift?",
    mentorIntent: "Checking database architecture maturity and deployment readiness.",
    studentAnswer:
      "Because we use SQLAlchemy 2.0 Async ORM with Alembic migrations, database models and queries are completely decoupled from the underlying dialect. SQLite with aiosqlite requires zero installation locally—creating devlens.db instantly on startup without heavy memory overhead. For production deployment on Supabase or Neon, switching to PostgreSQL requires changing only the DATABASE_URL environment variable; no Python code changes.",
    codeReference: "devlens/backend_fastapi/database.py & models.py",
    tags: ["SQLAlchemy 2.0", "aiosqlite", "PostgreSQL", "Alembic Migrations"],
  },
  {
    id: "viva-6",
    topic: "Anti-Hallucination Triad",
    question: "How do you guarantee that Gemini summaries and quiz questions do not hallucinate facts?",
    mentorIntent: "Assessing awareness of LLM failure modes in production technical platforms.",
    studentAnswer:
      "DevLens enforces a non-negotiable 3-part anti-hallucination control on all LLM invocations: (1) Temperature locked at 0.1 for near-deterministic output; (2) Grounding system prompt strictly instructing the model to synthesize exclusively from the provided source text; (3) Native responseSchema JSON enforcement so the model cannot produce conversational filler or deviate from required question structures.",
    codeReference: "devlens/backend_fastapi/routers/ai.py (Gemini config)",
    tags: ["Temperature 0.1", "responseSchema", "Grounding Prompt", "Reliability"],
  },
  {
    id: "viva-7",
    topic: "Database Schema Design",
    question: "Explain the four tables created in Phase 1 and their relationships.",
    mentorIntent: "Checking relational database fundamentals and schema comprehension.",
    studentAnswer:
      "The four tables are: (1) 'users': stores hashed bcrypt passwords, email, and selected category preferences; (2) 'categories': lookup table for engineering disciplines; (3) 'articles': stores self-sourced technical articles with unique URL constraint, source type, summary, and skills; (4) 'read_events': tracks user engagement (which user read which article, timestamp, and quiz scores for personalization).",
    codeReference: "devlens/backend_fastapi/models.py",
    tags: ["ORM Models", "Foreign Keys", "Read Events", "Bcrypt"],
  },
];
