# DevLens Phase 1 — Zero-Assumptions Backend & Python Roadmap
**Author:** Senior Developer Guide (Ponytail Mode)  
**Target:** Saurabh Goswami (Vibe Coding → True Backend Understanding & MCA Viva Mastery)  
**Project:** DevLens (MCA Minor Project I)  
**Tone:** Plain English, zero unexplained jargon, practical, and grounded.

---

## 🧭 Why This Roadmap Exists

> **Honest Truth:** "Vibe coding" with AI tools (ChatGPT, Cursor, v0, Bolt) is great for generating UI fast. But when:
> 1. An API returns a red `Network Error` or `500 Internal Server Error`
> 2. The database doesn't save your data
> 3. Your supervisor (Mr. Meetender) or external examiner asks: *"What happens under the hood when a user clicks Login?"*
> 
> You get stuck if you don't have the mental picture.  
> **This roadmap gives you that mental picture in 5 simple stages, with zero prior backend knowledge assumed.**

---

## 🍽️ The Master Mental Model: The Restaurant

Every website in the world (including DevLens, Instagram, YouTube) works like a restaurant:

| Role in Restaurant | Tech Term | In DevLens | What It Actually Does |
|---|---|---|---|
| **The Customer & Dining Table** | **Frontend (Client)** | React 19 in your browser (`http://localhost:3000`) | The visual buttons, cards, and forms you click. |
| **The Menu & Ordering Slip** | **HTTP Request & JSON** | `{ "category": "web-development" }` | Structured text sent over the network. |
| **The Waiter & Kitchen Manager** | **Backend (API Server)** | FastAPI running on Python 3.13 (`http://127.0.0.1:8000`) | Listens for requests, checks security, executes logic. |
| **The Pantry / Refrigerator** | **Database** | SQLite (`devlens.db` file) | Where information lives permanently so it isn't lost on restart. |
| **The Chef / Specialist** | **AI Service** | Google Gemini 1.5 Flash | Called only when you need heavy thinking (summaries, quizzes). |

---

## 📖 The 1-Sentence Jargon Buster

Before looking at any code, here is what these intimidating buzzwords actually mean:

1. **Backend / Server:** Just a normal Python script running on a computer that stays open 24/7 waiting for someone to visit a URL.
2. **Endpoint / Route:** A specific URL path tied to a Python function. When someone visits `/api/health`, Python runs `def health_check(): return {"status": "ok"}`.
3. **JSON:** Plain text formatted with curly braces `{}` and quotes `""`. It is the universal language that React (JavaScript) and FastAPI (Python) use to talk to each other.
4. **Database (SQLite):** Literally just a single file named `devlens.db` on your hard drive. Inside, data is organized into tables (like spreadsheets with rows and columns).
5. **ORM (SQLAlchemy):** A Python tool that lets you write Python objects (`article.title = "Hello"`) instead of raw database commands (`INSERT INTO articles...`).
6. **Pydantic (Schema / View):** A bodyguard. When React sends data to your backend, Pydantic checks: *"Is email really an email? Is password at least 8 characters?"* If not, it rejects it before it can break your code.
7. **Password Hash (bcrypt):** One-way scramble. If user password is `apple123`, the database stores `$2b$12$e8U7m...`. Even if a hacker steals the database, they cannot read the password.
8. **JWT (JSON Web Token):** A digital concert wristband. When a user logs in, the backend gives React a stamped token. Every time React makes a request, it shows this token so the backend knows who is asking.

---

## 🗺️ The 5-Stage Phase 1 Roadmap

---

### 🟢 STAGE 1: The Server Starts & Says Hello
**Goal:** Understand how Python runs a web server, and discover FastAPI's secret weapon: Swagger UI.

#### 1. What You Need to Know (The Concepts)
- **Virtual Environment (`.venv`):** Python's private playground. It keeps DevLens libraries isolated from other Python things on your PC.
- **Uvicorn:** The engine that runs your FastAPI code and keeps port `8000` open to listen for visitors.
- **Swagger UI (`/docs`):** FastAPI automatically creates a free web page where you can test all your backend functions with a graphical user interface — no frontend or Postman required!

#### 2. The DevLens Files to Look At
- [`backend/main.py`](file:///c:/Users/Saurabh/Desktop/Web%20Dev/devlens/devlens-demo/backend/main.py) — The heart of the backend. Look at line 24 (`app = FastAPI(...)`) and line 52 (`@app.get("/")`).
- [`backend/app/controllers/health_controller.py`](file:///c:/Users/Saurabh/Desktop/Web%20Dev/devlens/devlens-demo/backend/app/controllers/health_controller.py) — The simplest endpoint in the whole app.

#### 3. Hands-On Action
Open your terminal in `devlens-demo`:
```powershell
py -3.13 -m uvicorn backend.main:app --reload --port 8000
```
Open your browser and visit:
1. `http://127.0.0.1:8000/` → You see `{"message": "Welcome to DevLens API"}`
2. `http://127.0.0.1:8000/docs` → You see the interactive Swagger UI documentation. Click **GET /api/health** → **Try it out** → **Execute**.

#### 4. Viva Answer to Remember
> *"Why did you choose FastAPI over Flask or Django?"*  
> **Answer:** "FastAPI is modern, natively supports asynchronous code (`async`/`await`), has built-in data validation with Pydantic, and automatically generates interactive Swagger documentation without third-party plugins."

---

### 🟢 STAGE 2: The Pantry (Database Without Tears)
**Goal:** Understand how SQLite saves data and why we don't need a heavy database server running.

#### 1. What You Need to Know (The Concepts)
- Most tutorials make you install MySQL, PostgreSQL, or MongoDB daemon servers that run in the background and consume RAM.
- **SQLite is completely different:** It is just a file on disk (`devlens.db`). When your backend turns on, Python creates the file if it doesn't exist.
- **Tables:** We have an `articles` table and a `users` table. Each row in `articles` is one article (title, URL, summary, score).
- **Why SQLAlchemy?** Instead of writing raw SQL strings, SQLAlchemy lets you treat rows as Python classes (`class Article(Base): ...`).

#### 2. The DevLens Files to Look At
- [`backend/app/models/database.py`](file:///c:/Users/Saurabh/Desktop/Web%20Dev/devlens/devlens-demo/backend/app/models/database.py) — Where the database connection (`DATABASE_URL = "sqlite+aiosqlite:///./devlens.db"`) is made.
- [`backend/app/models/article.py`](file:///c:/Users/Saurabh/Desktop/Web%20Dev/devlens/devlens-demo/backend/app/models/article.py) — Look at the columns: `title`, `url`, `category`, `relevance_score`.
- [`backend/app/models/user.py`](file:///c:/Users/Saurabh/Desktop/Web%20Dev/devlens/devlens-demo/backend/app/models/user.py) — Look at the columns: `username`, `email`, `hashed_password`.

#### 3. Hands-On Action
Notice that `backend/devlens.db` exists. When the backend boots (`main.py`), line 17 runs `await init_db()`, which creates all the tables automatically!

#### 4. Viva Answer to Remember
> *"Why use SQLite in development instead of MongoDB or PostgreSQL?"*  
> **Answer:** "SQLite requires zero setup, is serverless, and stores everything in a single portable file. And because we use SQLAlchemy async ORM, shifting to PostgreSQL for production only requires changing one line in the `.env` file."

---

### 🟢 STAGE 3: The Guard at the Door (Registration, Login & JWT)
**Goal:** Understand how users create accounts and how the backend remembers who they are.

#### 1. What You Need to Know (The Concepts)
- **Step 1: Registration (`POST /api/auth/register`)**
  1. React sends: `{ "username": "saurabh", "password": "mypassword123", "email": "..." }`
  2. Pydantic validates the input (`auth_views.py`).
  3. Security utility scrambles the password with `bcrypt` (`security.py`).
  4. SQLAlchemy inserts the new user into `devlens.db`.
- **Step 2: Login (`POST /api/auth/login`)**
  1. User enters username and password.
  2. Backend compares the entered password against the scrambled hash.
  3. If correct, backend generates a **JWT (token)** — a long encrypted string containing the user's ID.
  4. Backend hands the token back to React.
- **Step 3: Accessing Protected Data (`GET /api/auth/me`)**
  1. React sends the token in the request header (`Authorization: Bearer eyJhbGci...`).
  2. Backend unlocks the token, finds the user ID, and returns the user's profile.

#### 2. The DevLens Files to Look At
- [`backend/app/utils/security.py`](file:///c:/Users/Saurabh/Desktop/Web%20Dev/devlens/devlens-demo/backend/app/utils/security.py) — Contains `get_password_hash()` and `create_access_token()`.
- [`backend/app/views/auth_views.py`](file:///c:/Users/Saurabh/Desktop/Web%20Dev/devlens/devlens-demo/backend/app/views/auth_views.py) — Defines what inputs are required.
- [`backend/app/controllers/auth_controller.py`](file:///c:/Users/Saurabh/Desktop/Web%20Dev/devlens/devlens-demo/backend/app/controllers/auth_controller.py) — The endpoints for register, login, and me.

#### 3. Hands-On Action
Go to `http://127.0.0.1:8000/docs`:
1. Find `POST /api/auth/register` → Click **Try it out** → Register a test user.
2. Find `POST /api/auth/login` → Log in with that user → Copy the `access_token` from the response.
3. Scroll to the top of `/docs`, click the green **Authorize** button, paste the token.
4. Run `GET /api/auth/me` → See your user details returned!

#### 4. Viva Answer to Remember
> *"How do you store passwords and protect user sessions?"*  
> **Answer:** "Passwords are never stored in plaintext; they are salted and hashed using standard bcrypt. User sessions are stateless using JSON Web Tokens (JWT) signed with HS256 algorithm and a secret key."

---

### 🟢 STAGE 4: Serving the Menu (The Article Endpoints)
**Goal:** Build the endpoint that takes articles from the database and gives them to the frontend.

#### 1. What You Need to Know (The Concepts)
- The frontend needs to ask: *"Give me 20 articles in the 'web-development' category, sorted by highest score."*
- In SQL terms, this is:
  ```sql
  SELECT * FROM articles WHERE category = 'web-development' ORDER BY relevance_score DESC LIMIT 20;
  ```
- In FastAPI, we write a controller that accepts query parameters: `category`, `limit`, `skip`.
- We also write a small seeding script (`seed_articles.py`) to insert 15-20 great sample articles into SQLite so our database isn't empty.

#### 2. What We Build Next
- `backend/app/views/article_views.py` — The output format for an article.
- `backend/app/controllers/article_controller.py` — The `GET /api/articles/feed` route.
- `backend/seed_articles.py` — Puts initial sample articles into `devlens.db`.

---

### 🟢 STAGE 5: Connecting the Wire (React Talks to FastAPI)
**Goal:** Make your React frontend display data fetched from your Python backend.

#### 1. What You Need to Know (The Concepts)
- **The Port Difference:**
  - React runs on `http://localhost:3000`
  - FastAPI runs on `http://127.0.0.1:8000`
- **What is CORS?**
  - Browsers block website A (port 3000) from talking to website B (port 8000) for security reasons.
  - In `backend/main.py`, we already added `CORSMiddleware` to tell the browser: *"It's okay, allow port 3000 to talk to me!"*
- **What is the Vite Proxy?**
  - In `frontend/vite.config.js`, we told Vite: *"Any request that starts with `/api` should automatically be forwarded behind the scenes to `http://127.0.0.1:8000`."*
  - This means React just calls `fetch('/api/articles/feed')` and it works seamlessly!

---

## 🛠️ The Vibe Coder's Debugging Cheat Sheet
When something doesn't work, don't panic or blindly ask AI to rewrite everything. Follow this 3-step check:

| Symptom | Where the Bug Is | What to Check |
|---|---|---|
| **Frontend says `Network Error` / Red in Console** | Backend is either not running or CORS is blocking | Check terminal: is `uvicorn` running? Check port: is it `8000`? |
| **Status `422 Unprocessable Entity`** | Pydantic validation failed | Look at the error message in the network tab. It literally tells you: `"field 'password' is missing"` or `"invalid email"`. |
| **Status `500 Internal Server Error`** | A Python exception happened in the backend code | Look at the terminal running `uvicorn`. The Python traceback shows the exact file and line number that crashed. |
| **Status `401 Unauthorized`** | JWT token is missing or expired | The user needs to log in again to get a fresh token. |

---

## 📋 Your Next Action Plan

You don't have to learn everything at once. We will do this together in bite-sized chunks:

1. **Step 1 (Today):** We start the backend server with `uvicorn` and test it in `/docs`. You will see with your own eyes how the endpoints work.
2. **Step 2 (Next):** We create `article_views.py` and `article_controller.py` and seed sample articles.
3. **Step 3:** We turn on both frontend and backend and watch the React feed load articles directly from your Python database!
