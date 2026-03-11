# 🔬 ThesisLens — AI Research Paper Explorer

<div align="center">

**One codebase. One deployment. Zero separate backend.**  
Upload academic PDFs, get AI-powered summaries, chat with citations, compare papers, and prep for your viva — all in a single Next.js app on Vercel.

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![Groq](https://img.shields.io/badge/Groq-LLM-FF6B35?style=for-the-badge)](https://groq.com)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com)

</div>

---

## ✨ Features

| Feature | How |
|---------|-----|
| 📄 **Smart PDF Parsing** | Extracts title, abstract, authors, sections, refs — using `pdf-parse` in Node.js |
| 🧠 **ELI-First-Year Summary** | Groq LLM simplifies any paper for a 1st-year student |
| 💬 **Citation-Aware Chat** | BM25 RAG retrieval → Groq answer with section citations |
| ⚖️ **Paper Comparison** | 7-dimension side-by-side using Groq |
| 📖 **Technical Glossary** | Auto-generated term definitions |
| 🎓 **Viva Preparation** | AI-generated Q&A with Easy/Medium/Hard difficulty |
| 🔗 **Related Work Notes** | Themes and gaps from the references section |

## 🏗 Architecture (Unified — no separate backend)

```
┌────────────────────────────────────────────────────────────┐
│             Single Next.js 14 App (Vercel)                 │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  Frontend (React)                    │  │
│  │  Dashboard · Upload · Paper[id] · Compare           │  │
│  │  React Query hooks → fetch() → Next.js API routes   │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                      │
│  ┌──────────────────▼───────────────────────────────────┐  │
│  │              API Routes (Node.js / Vercel Serverless) │  │
│  │  /api/upload → parse PDF → chunk → save to KV       │  │
│  │  /api/papers → list/get/delete from KV              │  │
│  │  /api/analysis/[id]/[type] → Groq LLM (cached KV)  │  │
│  │  /api/chat/[id] → BM25 search chunks → Groq         │  │
│  │  /api/compare → Groq comparison                     │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                      │
│  ┌──────────────────▼───────────────────────────────────┐  │
│  │                   Storage                             │  │
│  │  Vercel Blob → PDF files (persistent)                │  │
│  │  Vercel KV   → metadata, chunks, chat, analysis      │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

## 🚀 Deploy to Vercel (5 minutes)

### Step 1 — Get your Groq API key
Sign up at [console.groq.com](https://console.groq.com) → Create API Key.

### Step 2 — Set up Vercel Storage
In your Vercel project dashboard:
1. Go to **Storage** → Add **Blob** → copy `BLOB_READ_WRITE_TOKEN`
2. Go to **Storage** → Add **KV** → copy the 4 KV env vars

### Step 3 — Deploy
```bash
# 1. Fork / clone this repo and push to GitHub

# 2. Import to Vercel (vercel.com/new)
# Set root directory to: . (the repo root)
# Framework preset: Next.js

# 3. Add environment variables in Vercel dashboard:
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
KV_URL=redis://...
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...
KV_REST_API_READ_ONLY_TOKEN=...

# 4. Click Deploy ✅
```

That's it! **One deployment, one URL, zero separate servers.**

## 🛠 Local Development

```bash
git clone https://github.com/your-username/thesislens
cd thesislens

npm install

# Copy env template and fill in your values
cp .env.example .env.local
# At minimum, just GROQ_API_KEY is needed to start
# (Blob/KV will use in-memory fallback locally)

npm run dev
# → http://localhost:3000
```

> **Note:** Without Vercel Blob/KV configured, the app uses an **in-memory store** for local dev. Data won't persist across server restarts, but the app is fully functional for testing.

## 📂 Project Structure

```
thesislens/                    ← Single Next.js project
├── app/
│   ├── layout.tsx             ← Root layout with sidebar
│   ├── page.tsx               ← Dashboard
│   ├── upload/page.tsx        ← Upload page
│   ├── paper/[id]/page.tsx   ← Paper detail (5 tabs)
│   ├── compare/page.tsx       ← Comparison page
│   └── api/
│       ├── upload/route.ts    ← PDF upload & parsing
│       ├── papers/route.ts    ← List papers
│       ├── papers/[id]/route.ts  ← Get/delete paper
│       ├── analysis/[id]/[type]/route.ts  ← Summary/glossary/viva/related
│       ├── chat/[id]/route.ts    ← RAG chat
│       └── compare/route.ts      ← Paper comparison
├── lib/
│   ├── types.ts               ← All TypeScript types
│   ├── groq.ts                ← Groq API wrapper
│   ├── pdf-parser.ts          ← PDF text extraction
│   ├── rag.ts                 ← BM25 RAG engine
│   ├── store.ts               ← Vercel KV wrapper
│   ├── prompts.ts             ← All LLM system prompts
│   └── utils.ts               ← Utilities
├── hooks/hooks.ts             ← React Query hooks
├── components/sidebar.tsx     ← Navigation sidebar
├── .env.example               ← Environment template
└── package.json
```

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | ✅ Yes | Your Groq API key |
| `GROQ_MODEL` | Optional | Default: `llama-3.3-70b-versatile` |
| `BLOB_READ_WRITE_TOKEN` | For Vercel | Vercel Blob token |
| `KV_URL` | For Vercel | Vercel KV connection string |
| `KV_REST_API_URL` | For Vercel | Vercel KV REST URL |
| `KV_REST_API_TOKEN` | For Vercel | Vercel KV REST token |
| `KV_REST_API_READ_ONLY_TOKEN` | For Vercel | Vercel KV read-only token |

## 📝 License

MIT — build on it freely.
