"use client";

import { useState } from "react";
import {
  Search, ExternalLink, Loader2, AlertCircle, BookOpen,
  Globe, Microscope, Database, Filter, Tag,
} from "lucide-react";
import type { SearchResponse } from "@/app/api/search-references/route";

const SEARCH_TYPES = [
  { id: "paper",    label: "Paper / Topic",  icon: BookOpen,    desc: "Search by paper title or research topic" },
  { id: "author",   label: "Author",          icon: Microscope,  desc: "Find works by a specific researcher" },
  { id: "citation", label: "Citation Lookup", icon: Database,    desc: "Find a known paper or citation" },
  { id: "topic",    label: "Survey / Review", icon: Filter,      desc: "Broad survey of a research area" },
];

const QUICK_QUERIES = [
  "Transformer attention mechanism",
  "Federated learning privacy",
  "Large language models",
  "Retrieval augmented generation",
  "Graph neural networks",
  "Contrastive learning",
];

const ACADEMIC_DOMAINS: Record<string, { label: string; color: string }> = {
  "arxiv.org":            { label: "arXiv",            color: "#c9a227" },
  "semanticscholar.org":  { label: "Semantic Scholar",  color: "#2dd4bf" },
  "pubmed.ncbi.nlm.nih.gov": { label: "PubMed",        color: "#a78bfa" },
  "scholar.google.com":   { label: "Google Scholar",    color: "#60a5fa" },
  "researchgate.net":     { label: "ResearchGate",      color: "#34d399" },
  "dl.acm.org":           { label: "ACM Digital Library",color: "#fb923c"},
  "ieee.org":             { label: "IEEE Xplore",       color: "#818cf8" },
  "nature.com":           { label: "Nature",            color: "#f472b6" },
  "science.org":          { label: "Science",           color: "#facc15" },
  "springer.com":         { label: "Springer",          color: "#f87171" },
};

function getDomainBadge(source: string) {
  for (const [domain, meta] of Object.entries(ACADEMIC_DOMAINS)) {
    if (source.includes(domain.replace("www.", ""))) return meta;
  }
  return { label: source, color: "#64748b" };
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("paper");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = async (q = query, t = type) => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch("/api/search-references", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, searchType: t }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data: SearchResponse = await res.json();
      setResults(data);
    } catch (e: any) {
      setError(e.message || "Search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-8 py-9 max-w-4xl mx-auto">

      {/* ── Header ── */}
      <div className="mb-10 animate-fade-up">
        <h1 className="font-serif text-4xl font-bold text-white tracking-tight mb-2">
          Reference Search
        </h1>
        <p style={{ color: "#64748b" }} className="text-base">
          Search across arXiv, Semantic Scholar, PubMed, IEEE, ACM and 15+ academic databases
        </p>
        <div className="mt-5 h-px" style={{ background: "linear-gradient(90deg, rgba(201,162,39,0.4), transparent 70%)" }} />
      </div>

      {/* ── Search Type ── */}
      <div className="mb-6 animate-fade-up" style={{ animationDelay: "60ms" }}>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {SEARCH_TYPES.map((st) => (
            <button
              key={st.id}
              onClick={() => setType(st.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border whitespace-nowrap transition-all ${
                type === st.id
                  ? "text-gold-300 border-gold-500/30 bg-gold-500/10"
                  : "text-slate-400 border-white/8 bg-white/3 hover:text-slate-300 hover:bg-white/5"
              }`}
              style={{
                color:            type === st.id ? "#f0cc6b" : undefined,
                background:       type === st.id ? "rgba(201,162,39,0.1)"  : undefined,
                borderColor:      type === st.id ? "rgba(201,162,39,0.25)" : "rgba(255,255,255,0.06)",
              }}
            >
              <st.icon className="w-4 h-4" />
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Search Bar ── */}
      <div className="mb-6 animate-fade-up" style={{ animationDelay: "100ms" }}>
        <div className="relative flex gap-3">
          <div className="relative flex-1">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5"
              style={{ color: "#475569" }}
            />
            <input
              id="search-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder={
                type === "author" ? "e.g. Geoffrey Hinton, Yoshua Bengio…"
                : type === "citation" ? "e.g. Attention is all you need, 2017…"
                : type === "topic" ? "e.g. Transfer learning in NLP…"
                : "e.g. BERT language model, federated learning…"
              }
              className="input pl-11 py-3.5 text-[15px]"
            />
          </div>
          <button
            id="search-btn"
            onClick={() => runSearch()}
            disabled={!query.trim() || loading}
            className="btn-primary px-6"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </button>
        </div>
      </div>

      {/* ── Quick Queries ── */}
      {!results && !loading && (
        <div className="mb-8 animate-fade-up" style={{ animationDelay: "140ms" }}>
          <p className="text-xs font-medium mb-3 flex items-center gap-1.5" style={{ color: "#475569" }}>
            <Tag className="w-3.5 h-3.5" />
            Quick searches
          </p>
          <div className="flex flex-wrap gap-2">
            {QUICK_QUERIES.map((q) => (
              <button
                key={q}
                onClick={() => { setQuery(q); runSearch(q, type); }}
                className="text-xs px-3 py-1.5 rounded-lg border transition-all hover:-translate-y-0.5"
                style={{
                  color: "#94a3b8",
                  background: "rgba(255,255,255,0.03)",
                  borderColor: "rgba(255,255,255,0.07)",
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Academic Databases Banner ── */}
      {!results && !loading && (
        <div className="card p-5 mb-8 animate-fade-up" style={{ animationDelay: "180ms" }}>
          <p className="text-xs font-semibold mb-3 flex items-center gap-2" style={{ color: "#475569" }}>
            <Globe className="w-3.5 h-3.5" />
            Searches across
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.values(ACADEMIC_DOMAINS).map((d) => (
              <span
                key={d.label}
                className="text-[11px] px-2.5 py-1 rounded-lg font-medium"
                style={{ background: `${d.color}12`, color: d.color, border: `1px solid ${d.color}22` }}
              >
                {d.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="card p-12 text-center animate-fade-up">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(201,162,39,0.08)", border: "1px solid rgba(201,162,39,0.15)" }}
          >
            <Search className="w-8 h-8 animate-pulse" style={{ color: "#c9a227" }} />
          </div>
          <p className="font-semibold text-white mb-1">Searching academic databases…</p>
          <p className="text-sm" style={{ color: "#475569" }}>
            Querying arXiv, Semantic Scholar, PubMed, and more
          </p>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div
          className="flex items-start gap-3 p-4 rounded-xl mb-6 animate-fade-up"
          style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)" }}
        >
          <AlertCircle className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-rose-300">Search failed</p>
            <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>{error}</p>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {results && !loading && (
        <div className="animate-fade-up">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-white">
              {results.totalResults} result{results.totalResults !== 1 ? "s" : ""} for{" "}
              <span style={{ color: "#c9a227" }}>&ldquo;{results.query}&rdquo;</span>
            </h2>
            <button
              onClick={() => { setResults(null); setQuery(""); }}
              className="btn-ghost text-xs"
            >
              Clear
            </button>
          </div>

          <div className="space-y-4">
            {results.results.map((r, i) => {
              const badge = getDomainBadge(r.source);
              return (
                <div
                  key={i}
                  className="card card-interactive p-5 animate-fade-up"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-white hover:text-gold-300 transition-colors flex items-start gap-1.5 group"
                    >
                      {r.title}
                      <ExternalLink className="w-3.5 h-3.5 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" style={{ color: "#c9a227" }} />
                    </a>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className="text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wide"
                        style={{ background: `${badge.color}15`, color: badge.color, border: `1px solid ${badge.color}25` }}
                      >
                        {badge.label}
                      </span>
                      {r.relevanceScore > 0.8 && (
                        <span className="badge badge-teal">High relevance</span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed mb-3" style={{ color: "#64748b" }}>
                    {r.snippet}
                  </p>
                  <div className="flex items-center gap-4 text-[11px]" style={{ color: "#334155" }}>
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {r.source}
                    </span>
                    {r.publishedDate && (
                      <span>{new Date(r.publishedDate).toLocaleDateString("en-GB", { year: "numeric", month: "short" })}</span>
                    )}
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto flex items-center gap-1 hover:text-gold-300 transition-colors"
                      style={{ color: "#c9a227" }}
                    >
                      View Paper <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
