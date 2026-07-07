# SqlAI

**Chat with your data. Instant insights. No cloud warehouse required.**

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## What is SqlAI?

SqlAI is an analytics platform that lets you **upload CSV files and ask questions in plain English** — getting instant answers without writing SQL or paying for expensive cloud data warehouses.

Think of it as having a data analyst sitting next to you, ready to answer any question about your data in seconds.

---

## ✨ Why SqlAI?

### 🚀 **Instant Analytics**
Upload a CSV, ask a question, get an answer. No waiting for queries to run, no complex setup.

### 🧠 **Natural Language Queries**
"Show me total sales by region for Q1" — and you get your answer immediately. No SQL required.

### 📊 **Project Workspace**
Group related datasets together. Upload sales data, customer lists, product catalogs — then ask questions that span all of them.

### 💨 **Blazing Fast**
Everything runs in-memory. We use Rust-accelerated engines (Polars + DuckDB) so your queries execute in milliseconds, not minutes.

### 💰 **Zero Cloud Costs**
No Snowflake. No BigQuery. No expensive warehouse bills. Just your data, processed right in the application.

### 🔒 **Your Data, Your Control**
Your files stay in your cloud storage. You own everything. Multi-tenant isolation means no one else can see your data.

---

## 🎬 Quick Demo

```bash
# Upload a CSV file
Upload: sales_2026.csv

# Ask a question in plain English
Prompt: "Show me top 5 products by revenue"

# Get your answer instantly
Result: [Product A: $45,230], [Product B: $38,100], ...
```

**Try it yourself:**

1. Create a project ("Sales Q1 2026")
2. Upload your CSV files
3. Start asking questions

---

## 💡 What Can You Build With SqlAI?

### Sales Dashboards
Upload sales data, product catalogs, regional maps — ask about revenue trends, top performers, regional breakdowns.

### HR Analytics
Employee lists, department structures, salary data — find departments with high turnover, salary distributions, team compositions.

### Financial Reporting
Budget files, actuals, forecasts — compare numbers across years, calculate variances, spot trends.

### Customer Insights
Customer records, order histories, support tickets — identify your best customers, track churn, analyze satisfaction.

### Personal Data Projects
Track your spending, analyze your fitness data, explore any CSV you have lying around.

---

## 🏗️ How It Works

### 1. **Upload** → Your CSV files become queryable datasets
- Drag & drop your files into a project
- We handle the heavy lifting: parsing, normalizing, optimizing for fast queries

### 2. **Ask** → Natural language → SQL
- Type your question like you'd ask a colleague
- Behind the scenes, we generate SQL and validate it for safety
- You never have to write a line of SQL

### 3. **Explore** → Interactive data grid
- Results appear in a snappy, virtualized table
- Click any historical answer to rehydrate results instantly
- Share insights with your team

---

## 🛠️ Tech Stack (The TL;DR)

| What | Why |
|------|-----|
| **FastAPI + Python** | Lightweight, fast backend |
| **React + TypeScript** | Modern, type-safe UI |
| **Polars** | Rust-powered data processing (it's fast) |
| **DuckDB** | In-process analytical queries (no servers) |
| **Clerk** | Authentication (Google/GitHub login) |
| **Neon Postgres** | Metadata + semantic cache (`pgvector`) |
| **Upstash Redis** | Query result caching |
| **Cloudflare R2** | File storage (cheap, fast) |

---

## 🎯 Who Is This For?

### 📊 **Analysts & Data Scientists**
Skip the SQL boilerplate. Focus on insights, not syntax.

### 🏢 **Small Teams**
No budget for Snowflake? SqlAI gives you enterprise-like analytics for free.

### 👨‍💻 **Developers**
Build data apps without wiring up complex data pipelines. Just upload and query.

### 🎓 **Students & Researchers**
Explore datasets without learning SQL first. Ask questions naturally.

---

## 🌟 Key Differentiators

| Feature | SqlAI | Traditional BI | Cloud Warehouses |
|---------|-------|----------------|------------------|
| **Natural Language Queries** | ✅ | ❌ (SQL required) | ✅ (with add-ons) |
| **Multi-Table Joins** | ✅ | ✅ | ✅ |
| **Instant Setup** | ✅ | ❌ (weeks of configuration) | ❌ (months of implementation) |
| **Zero Ongoing Costs** | ✅ | ❌ (per-seat licensing) | ❌ (pay-per-query) |
| **Your Data Stays Yours** | ✅ | ❌ (vendor lock-in) | ❌ (data in their cloud) |
| **Open Source** | ✅ | ❌ | ❌ |
| **Self-Hostable** | ✅ | ❌ | ❌ |

---

## 🏆 Built With

- [FastAPI](https://fastapi.tiangolo.com/) — Modern, fast web framework
- [Polars](https://pola.rs/) — Blazing fast DataFrame library
- [DuckDB](https://duckdb.org/) — In-process analytical database
- [Clerk](https://clerk.com/) — Authentication made simple
- [Neon](https://neon.tech/) — Serverless PostgreSQL with `pgvector`
- [Upstash](https://upstash.com/) — Serverless Redis
- [Cloudflare R2](https://developers.cloudflare.com/r2/) — S3-compatible object storage
- [React](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/) — Modern frontend
- [Zustand](https://zustand-demo.pmnd.rs/) — Simple state management
- [TanStack Table](https://tanstack.com/table) + [React Virtual](https://tanstack.com/virtual) — Fast data grids

---

## 📄 License

MIT License — use it anywhere, modify it freely, build on top of it.

---

## 🙋 FAQ

**How is this different from ChatGPT + a CSV plugin?**
SqlAI is purpose-built for analytics. It understands table structures, can join multiple datasets, and renders results in an interactive grid. It's also self-hostable and keeps your data private.

**Do I need to know SQL?**
Nope! Just type your question in plain English.

**How many rows can I upload?**
Up to ~100,000 rows per file (20MB limit). More than enough for most analytical use cases.

**Can I query across multiple files?**
Absolutely! Upload related datasets into a project and ask questions that reference all of them.

---


## ❤️ Support the Project

If you find SqlAI useful:
- ⭐ Star the repository
- 🐦 Share it on social media
- 💬 Tell your colleagues about it
- 🍴 Fork it and build something cool

---

**Stop wrestling with data. Start asking questions.**

Made with ❤️ for data enthusiasts everywhere.