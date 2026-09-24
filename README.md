# DevLens (devlens-demo)

DevLens is an AI-powered technical learning platform that curates high-signal engineering articles, system architecture blogs, and research papers—delivering structured insights, skill mappings, and context-grounded quizzes for developers and computer science students.


---

## 1. Project Overview & Architecture

DevLens implements a clean separation of concerns using the **Model-View-Controller (MVC)** architectural pattern with isolated folders:

```
devlens-demo/
├── frontend/                     # Pure React JavaScript SPA (Vite + Tailwind CSS)
│   ├── src/
│   │   ├── components/           # UI View Components (.jsx)
│   │   ├── controllers/          # API & Business Logic Orchestration (.js)
│   │   ├── data/                 # Local State & Fallback Datastores (.js)
│   │   ├── utils/                # Statistical NLP (TF-IDF) & Image Helpers (.js)
│   │   ├── views/                # Barrel Exports (.js)
│   │   ├── App.jsx               # Root Application Shell
│   │   ├── main.jsx              # DOM Entrypoint
│   │   └── index.css             # Tailwind Design Tokens
│   ├── vite.config.js            # Vite Server & Proxy Config
│   └── package.json
│
├── backend/                      # Python FastAPI Application (py -3.13)
│   └── app/
│       ├── controllers/          # Request handlers & routing
│       ├── models/               # SQLAlchemy 2.0 ORM & Pydantic schemas
│       ├── services/             # Content fetchers, AI pipeline & ranking
│       ├── utils/                # Tokenizers, helpers & security
│       └── views/                # API responses & formatting
│
└── docs/                         # Architecture guides & documentation
    ├── DevLens_Master_Project_Guide.md  # ⭐ Full project guide + mentor Q&A (read first)
    ├── Backend_Beginner_Guide.md # Step-by-step backend roadmap for beginners
    └── DevLens_Full_Project_Context.md
```

---

## 2. Technology Stack

- **Frontend:**
  - React 19 (Plain JavaScript / `.jsx`)
  - Vite 6
  - Tailwind CSS 4
  - Lucide React
  - Motion
  - *Strict Rule: No TypeScript anywhere in the frontend.*

- **Backend:**
  - Python 3.13 (`py -3.13`)
  - FastAPI + Starlette + Uvicorn
  - SQLAlchemy 2.0 Async (`aiosqlite` for local offline dev, `asyncpg` for PostgreSQL production)
  - Pydantic v2
  - Google Gemini API (`responseSchema`, `temperature: 0.1`, strict grounding prompt)

---

## 3. Subscribed Technical Categories

1. **Web Development** (`web-development`) — Modern frontend frameworks, JavaScript runtimes, browser engines & web APIs.
2. **Data Science** (`data-science`) — Data pipelines, statistical analysis, feature engineering & model evaluation.
3. **Artificial Intelligence** (`artificial-intelligence`) — LLMs, transformer architectures, GPU inference & neural models.
4. **Cyber Security** (`cyber-security`) — Protocol security, zero trust, cryptography & vulnerability analysis.
5. **Cloud Computing** (`cloud-computing`) — Distributed consensus, Raft, microservices & cloud infrastructure.
6. **DevOps** (`devops`) — Kubernetes, CI/CD pipelines, container runtimes & observability.

---

## 4. Running the Development Server

### Frontend
```bash
cd frontend
npm run dev
```
Available at: `http://localhost:3000/` (proxies `/api` requests to backend on port 8000).

### Backend (FastAPI)
```bash
cd backend
py -3.13 -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
Interactive API documentation available at: `http://127.0.0.1:8000/docs`.
## 🚀 Live Deployment

The application is deployed and running live:
* **Production URL:** [https://railway.app](https://railway.app)

---
