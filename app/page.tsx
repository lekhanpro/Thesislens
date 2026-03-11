"use client";

import Link from "next/link";
import {
  Upload, BookOpen, Clock, Layers, ArrowUpRight, TrendingUp,
  FileText, Search, Sparkles, ChevronRight,
} from "lucide-react";
import { usePapers, useDeletePaper } from "@/hooks/hooks";
import { formatDate, truncate } from "@/lib/utils";
import type { Paper } from "@/lib/types";

export default function DashboardPage() {
  const { data: papers = [], isLoading, error } = usePapers();
  const deleteMutation = useDeletePaper();

  const totalPages   = papers.reduce((s, p) => s + p.totalPages, 0);
  const totalSections = papers.reduce((s, p) => s + p.totalSections, 0);

  return (
    <div className="min-h-screen px-8 py-9 max-w-5xl mx-auto">

      {/* ── Page Header ── */}
      <div className="mb-10 animate-fade-up">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-serif text-4xl font-bold text-white tracking-tight mb-2">
              Research Dashboard
            </h1>
            <p style={{ color: "#64748b" }} className="text-base">
              Your AI-powered academic workspace · {papers.length} paper{papers.length !== 1 ? "s" : ""} analysed
            </p>
          </div>
          <Link href="/upload" className="btn-primary">
            <Upload className="w-4 h-4" />
            Upload Paper
          </Link>
        </div>

        {/* Gold divider */}
        <div className="mt-6 h-px" style={{ background: "linear-gradient(90deg, rgba(201,162,39,0.4), rgba(201,162,39,0.05) 60%, transparent)" }} />
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-4 mb-10" style={{ animationDelay: "80ms" }}>
        {[
          {
            icon: FileText, value: papers.length, label: "Papers Uploaded",
            color: "#c9a227", bg: "rgba(201,162,39,0.08)", border: "rgba(201,162,39,0.15)",
          },
          {
            icon: Layers, value: totalSections, label: "Sections Parsed",
            color: "#2dd4bf", bg: "rgba(20,184,166,0.08)", border: "rgba(20,184,166,0.15)",
          },
          {
            icon: TrendingUp, value: totalPages, label: "Pages Analysed",
            color: "#a78bfa", bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.15)",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="card p-5 flex items-center gap-4 animate-fade-up"
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: s.bg, border: `1px solid ${s.border}` }}
            >
              <s.icon className="w-5 h-5" style={{ color: s.color }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs" style={{ color: "#475569" }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Papers Grid ── */}
      {isLoading ? (
        <SkeletonGrid />
      ) : error ? (
        <ErrorState />
      ) : papers.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-white">Your Papers</h2>
            <span className="text-sm" style={{ color: "#475569" }}>{papers.length} total</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {papers.map((p, i) => (
              <PaperCard
                key={p.id}
                paper={p}
                delay={i * 60}
                onDelete={() => {
                  if (confirm("Permanently delete this paper and all its data?")) {
                    deleteMutation.mutate(p.id);
                  }
                }}
                isDeleting={deleteMutation.isPending}
              />
            ))}
          </div>
        </div>
      ) : (
        <EmptyState />
      )}

      {/* ── Quick Links section ── */}
      <div className="mt-10 grid grid-cols-2 gap-4">
        {[
          {
            href: "/search",
            Icon: Search,
            title: "Search References",
            desc: "Find related papers across arXiv, PubMed, Semantic Scholar & more",
            color: "#c9a227",
          },
          {
            href: "/compare",
            Icon: Sparkles,
            title: "Compare Papers",
            desc: "Side-by-side AI comparison across methodology, results & impact",
            color: "#2dd4bf",
          },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="card card-interactive p-5 flex items-start gap-4 no-underline group">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: `${item.color}14`, border: `1px solid ${item.color}26` }}
            >
              <item.Icon className="w-5 h-5" style={{ color: item.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm mb-1 group-hover:text-gold-300 transition-colors">{item.title}</p>
              <p className="text-xs leading-relaxed" style={{ color: "#475569" }}>{item.desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 flex-shrink-0 mt-3" style={{ color: "#334155" }} />
          </Link>
        ))}
      </div>
    </div>
  );
}

function PaperCard({
  paper, delay, onDelete, isDeleting,
}: {
  paper: Paper; delay: number; onDelete: () => void; isDeleting: boolean;
}) {
  return (
    <div
      className="card card-interactive animate-fade-up flex flex-col h-full"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="p-5 flex-1">
        {/* Top row */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(201,162,39,0.1)", border: "1px solid rgba(201,162,39,0.15)" }}
          >
            <BookOpen className="w-4.5 h-4.5" style={{ color: "#c9a227" }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white leading-tight line-clamp-2 hover:text-gold-300 transition-colors">
              {paper.title}
            </h3>
            <p className="text-[11px] mt-0.5 truncate" style={{ color: "#475569" }}>{truncate(paper.authors, 72)}</p>
          </div>
          <span className="badge badge-teal flex-shrink-0">{paper.status}</span>
        </div>

        {/* Abstract */}
        <p className="text-xs leading-relaxed mb-3 line-clamp-3" style={{ color: "#64748b" }}>
          {paper.abstract || "No abstract available for this paper."}
        </p>

        {/* Meta */}
        <div className="flex items-center gap-3 text-[11px]" style={{ color: "#334155" }}>
          <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{paper.totalPages}p</span>
          <span className="flex items-center gap-1"><Layers className="w-3 h-3" />{paper.totalSections}s</span>
          <span className="flex items-center gap-1 ml-auto"><Clock className="w-3 h-3" />{formatDate(paper.uploadedAt)}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 pb-4 flex gap-2 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <Link
          href={`/paper/${paper.id}`}
          className="btn-primary text-xs py-2 px-4 flex-1 justify-center"
        >
          Explore Paper
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="btn-danger text-xs py-2 px-3"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card p-14 text-center animate-fade-up">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
        style={{ background: "rgba(201,162,39,0.08)", border: "1px solid rgba(201,162,39,0.15)" }}
      >
        <Upload className="w-8 h-8" style={{ color: "#c9a227" }} />
      </div>
      <h2 className="font-serif text-2xl font-bold text-white mb-2">No papers yet</h2>
      <p className="text-sm max-w-sm mx-auto mb-7 leading-relaxed" style={{ color: "#475569" }}>
        Upload your first research paper to unlock AI-powered summaries, citation-aware chat, viva prep, and more.
      </p>
      <Link href="/upload" className="btn-primary">
        <Upload className="w-4 h-4" />
        Upload Your First Paper
      </Link>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="card p-8 text-center">
      <p className="font-semibold text-red-400 mb-1">Failed to load papers</p>
      <p className="text-sm" style={{ color: "#475569" }}>Check your connection and try refreshing.</p>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="card p-5 space-y-3">
          <div className="flex gap-3">
            <div className="shimmer w-9 h-9 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="shimmer h-4 w-4/5 rounded" />
              <div className="shimmer h-3 w-2/3 rounded" />
            </div>
          </div>
          <div className="shimmer h-3 w-full rounded" />
          <div className="shimmer h-3 w-5/6 rounded" />
          <div className="shimmer h-3 w-3/4 rounded" />
        </div>
      ))}
    </div>
  );
}
