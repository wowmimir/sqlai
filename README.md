# SqlAI

**A high-performance, serverless Semantic Data Lakehouse engine for conversational analytics**

SqlAI is an open-source, multi-tenant analytical platform that enables natural language querying of tabular data. Built with Python/FastAPI, Polars, and DuckDB, it processes data entirely in-memory within application threads, eliminating the need for expensive cloud warehouses.

---

## ✨ Key Features

- **Natural Language to SQL** – Ask questions about your data in plain English; SqlAI generates and executes SQL queries against your datasets.
- **Project-Aware Workspace** – Organize datasets into projects. Query across multiple tables within a project using joins, unions, and subqueries.
- **Dual-Layer Caching** – Semantic prompt caching (pgvector) + result matrix caching (Redis) dramatically reduce latency and LLM costs.
- **Zero-Infrastructure Cost** – Deploy entirely on free tiers (Render, Neon, Upstash, Cloudflare R2, Clerk) with predictable $0/month fixed cost.
- **Synchronous Inline Processing** – No async queues, no background workers. The entire pipeline (ingestion, normalization, query compilation, execution) runs within the request-response loop.
- **AST Security Guardrails** – SQL injection and data mutation attacks are blocked via `sqlglot` AST parsing before execution.
- **Memory-Safe Execution** – Automatic `LIMIT 250` injection, 20MB upload cap, and 512MB RAM footprint guarantees.
- **Virtualized Tabular UI** – 60fps rendering of large datasets using TanStack Table + React Virtual.

---

## 🧠 How It Works

### The Write Path (Ingestion)

1. User uploads a `.csv` file to a project.
2. Polars normalizes the data (lowercases columns, strips whitespace, fills nulls, casts dates).
3. The normalized DataFrame is serialized to **Parquet** and stored in **Cloudflare R2**.
4. Schema metadata is registered in **Neon Postgres** (`datasets` table).

### The Read Path (Query Execution)

1. User submits a natural language prompt for a project.
2. **Semantic Cache Check** – Embedding similarity search (`≤ 0.04` cosine distance) returns cached SQL if available.
3. **LLM Fallback** – On cache miss, the prompt (with project schemas) is sent to an LLM to generate SQL.
4. **AST Guardrails** – The generated SQL is parsed; mutations (`DROP`, `DELETE`, `INSERT`) are rejected. A `LIMIT 250` is injected if absent.
5. **Path Substitution** – Table names are replaced with DuckDB `read_parquet('s3://...')` calls pointing to R2.
6. **Result Cache Check** – Final SQL is hashed; Redis returns cached JSON results if available.
7. **DuckDB Execution** – On cache miss, DuckDB reads Parquet files from R2, executes the query in-memory, and returns JSON.
8. **Dual Cache Write** – Results go to Redis; prompt → SQL mapping goes to the semantic cache (Postgres).
9. **Chat History** – The interaction (with `redis_cache_key` pointer) is logged to `chat_messages`.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                               Frontend (React + Vite)                       │
│  ┌──────────────┐  ┌──────────────────────┐  ┌───────────────────────────┐ │
│  │ Project       │  │ Conversational       │  │ Virtualized Data Grid    │ │
│  │ Sidebar       │  │ Chat Panel           │  │ (TanStack + React Virtual)│ │
│  └──────────────┘  └──────────────────────┘  └───────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Backend (FastAPI + Polars + DuckDB)               │
│                                                                             │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────────────────┐ │
│  │ Upload Pipeline │  │ Query Pipeline   │  │ AST Guardrails            │ │
│  │ • Multipart CSV │  │ • Semantic Cache │  │ • sqlglot parsing         │ │
│  │ • Polars norm.  │  │ • LLM generation │  │ • Mutation blocking       │ │
│  │ • Parquet → R2  │  │ • Path subst.    │  │ • LIMIT 250 injection     │ │
│  └─────────────────┘  └──────────────────┘  └───────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────────┐
              ▼                       ▼                           ▼
┌─────────────────┐      ┌─────────────────────┐      ┌─────────────────────┐
│  Cloudflare R2  │      │  Neon Postgres      │      │  Upstash Redis      │
│  (Parquet data) │      │  • Projects         │      │  (Result matrix     │
│                 │      │  • Datasets (schema)│      │   cache)            │
│                 │      │  • Semantic cache   │      │                     │
│                 │      │  • Chat history     │      │                     │
└─────────────────┘      └─────────────────────┘      └─────────────────────┘
```

---

## 🧩 Core Implementation Concepts

| Concept | Implementation | Why It Matters |
| :--- | :--- | :--- |
| **Synchronous Ingestion** | `def` endpoints + FastAPI thread pool | No async/await complexity; Polars/CPU work offloaded to thread pool, keeping event loop free |
| **Multi-Table Query Support** | Project-scoped schemas + LLM prompt with all table definitions | Enables cross-table joins, unions, and subqueries within a project |
| **Static S3 Paths** | `read_parquet('s3://projects/{project_id}/datasets/{table}.parquet')` | Deterministic SQL → stable Redis cache keys (unlike time-limited pre-signed URLs) |
| **Case-Insensitive String Matching** | Prompt instructs LLM to use `LOWER(column) = LOWER('value')` | DuckDB is case-sensitive; data ingestion preserves original casing |
| **Numeric-Leading Column Names** | Prompt instructs LLM to use `"2017_budgets"` (double quotes) | DuckDB requires quoting for identifiers starting with digits |
| **Semantic Cache Schema Validation** | `schema_snapshot` column stores column names at cache time | Invalidates cache on schema changes (columns renamed/added/deleted) |
| **JWT Verification Caching** | `TTLCache` with 5-minute TTL for Clerk JWKS results | Reduces network verification overhead by ~95% |
| **Latest Dataset Resolution** | SQL subquery with `MAX(created_at)` | Picks the most recent upload when multiple versions share the same name |

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Backend Framework** | FastAPI | RESTful API endpoints, CORS, middleware |
| **Data Processing** | Polars | In-memory DataFrame normalization & transformation |
| **Analytical Engine** | DuckDB | In-process SQL execution on Parquet files |
| **SQL Security** | sqlglot | AST parsing & path substitution |
| **Metastore** | Neon Postgres + pgvector | Projects, datasets, semantic cache (embeddings), chat history |
| **Result Cache** | Upstash Redis | Cached query results (JSON matrix) |
| **Object Storage** | Cloudflare R2 | Parquet file storage (zero egress fees) |
| **Authentication** | Clerk | OAuth (Google/GitHub), JWT verification |
| **Frontend** | React + TypeScript + Vite | UI application |
| **UI Components** | Shadcn UI + Tailwind CSS | Styling and primitives |
| **State Management** | Zustand | Global client state |
| **Table Virtualization** | TanStack Table + React Virtual | High-performance data grid rendering |
| **Deployment** | Render / Fly.io, Vercel, Neon, Upstash, Clerk | Zero-cost serverless infrastructure |

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Accounts on: [Clerk](https://clerk.com), [Neon](https://neon.tech), [Upstash](https://upstash.com), [Cloudflare R2](https://developers.cloudflare.com/r2/)

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment variables
cp .env.example .env
# Edit .env with your credentials

# Run migrations (create tables in Neon)
python scripts/init_db.py

# Start the server
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your Clerk publishable key

# Start development server
npm run dev
```

### Environment Variables

**Backend (`backend/.env`):**

```env
# Server
ENV=development
ALLOWED_ORIGINS=http://localhost:5173

# Authentication
CLERK_SECRET_KEY=sk_live_***
CLERK_JWKS_URL=https://api.clerk.com/v1/jwks

# Database
DATABASE_URL=postgresql://user:pass@ephemeral-neon-host.neon.tech/main?sslmode=require

# Redis
REDIS_URL=rediss://default:password@upstash-instance.upstash.io:6379

# Cloudflare R2
R2_BUCKET_NAME=your-bucket-name
AWS_ACCESS_KEY_ID=your-r2-access-key
AWS_SECRET_ACCESS_KEY=your-r2-secret-key
AWS_ENDPOINT_URL=https://your-account-id.r2.cloudflarestorage.com
AWS_REGION=auto
```

**Frontend (`frontend/.env.local`):**

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_CLERK_PUBLISHABLE_KEY=pk_live_***
```

---

## 📁 Project Structure

```
sqlai/
├── backend/
│   ├── app/
│   │   ├── api/v1/            # Route controllers
│   │   │   ├── projects.py    # Project CRUD
│   │   │   ├── datasets.py    # Upload + list
│   │   │   ├── chat.py        # Chat history
│   │   │   └── query.py       # Query execution
│   │   ├── core/              # Shared config & security
│   │   │   ├── config.py
│   │   │   ├── security.py    # Clerk JWT verification
│   │   │   └── middleware.py
│   │   ├── database/          # DB connections & models
│   │   │   ├── session.py
│   │   │   └── models.py      # SQLAlchemy models
│   │   ├── services/          # Core processing logic
│   │   │   ├── storage.py     # Cloudflare R2
│   │   │   ├── dataframe.py   # Polars normalization
│   │   │   ├── query.py       # Compiler + pipeline
│   │   │   ├── duckdb.py      # DuckDB execution
│   │   │   ├── embedding.py   # Text embedding
│   │   │   ├── cache.py       # Semantic + Redis
│   │   │   └── redis.py       # Upstash client
│   │   └── main.py            # FastAPI entry point
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── chat/          # Chat panel + message bubbles
│   │   │   ├── data-stage/    # Virtualized data grid
│   │   │   ├── sidebar/       # Project sidebar (complete)
│   │   │   └── ui/            # Shadcn primitives
│   │   ├── layouts/
│   │   │   ├── AppShell.tsx   # Layout + routing sync
│   │   │   └── TopNav.tsx
│   │   ├── lib/
│   │   │   ├── api.ts         # Axios + token interceptor
│   │   │   ├── endpoints.ts   # Backend URL constants
│   │   │   ├── store.ts       # Zustand global store
│   │   │   ├── types.ts       # TypeScript interfaces
│   │   │   └── utils.ts
│   │   ├── App.tsx            # Routing + Clerk
│   │   └── main.tsx
│   └── package.json
└── progress.md                 # Engineering progress tracker
```

---

## 🔒 Security Model

- **Authentication:** Clerk JWT verification on every endpoint (cached with 5-minute TTL).
- **Multi-Tenancy:** All database queries are filtered by `clerk_user_id`; all storage paths include `project_id`.
- **SQL Injection:** `sqlglot` AST parsing rejects any non-`SELECT` root expression.
- **Resource Protection:** 20MB upload cap, automatic `LIMIT 250` injection, 512MB RAM target.
- **No Async Queues:** All processing is synchronous and in-process, eliminating exposure of job queues.

---

## 🗺️ Roadmap

- **Phase 1 (Complete):** Storage foundation, synchronous ingestion, project-scoped storage.
- **Phase 2 (Complete):** Read path execution, AST guardrails, multi-table queries, DuckDB integration.
- **Phase 3 (Complete):** Dual-layer caching, semantic cache, result cache, chat history.
- **Phase 4 (In Progress):** UI workspace shell, virtualized grid, project-level context switching.
- **Phase 5 (Pending):** Productionization, Docker containerization, cold-start mitigation.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

Please read `progress.md` for the current engineering status and architectural decisions.

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- [Polars](https://pola.rs/) – Blazingly fast DataFrame library
- [DuckDB](https://duckdb.org/) – In-process analytical database
- [FastAPI](https://fastapi.tiangolo.com/) – Modern Python web framework
- [Clerk](https://clerk.com) – Authentication & user management
- [Neon](https://neon.tech) – Serverless Postgres with pgvector
- [Upstash](https://upstash.com) – Serverless Redis
- [Cloudflare R2](https://developers.cloudflare.com/r2/) – Object storage with zero egress

---

## 📬 Contact

For questions or feedback, please open an issue on GitHub.