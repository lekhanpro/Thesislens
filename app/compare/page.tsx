"use client";

import { useState } from "react";
import {
  GitCompareArrows, Loader2, AlertCircle, FileText, CheckCircle2, ArrowRight,
} from "lucide-react";
import { usePapers, useComparePapers } from "@/hooks/hooks";
import type { CompareResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function ComparePage() {
  const { data: papers = [], isLoading } = usePapers();
  const compareMut = useComparePapers();
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [result, setResult] = useState<CompareResponse | null>(null);

  const run = () => {
    if (!p1 || !p2 || p1 === p2) return;
    compareMut.mutate({ paperId1: p1, paperId2: p2 }, { onSuccess: setResult });
  };

  return (
    <div className="min-h-screen px-8 py-9 max-w-5xl mx-auto">

      {/* ── Header ── */}
      <div className="mb-10 animate-fade-up">
        <h1 className="font-serif text-4xl font-bold text-white tracking-tight mb-2">
          Compare Papers
        </h1>
        <p style={{ color: "#64748b" }} className="text-base">
          AI-driven side-by-side analysis across 7 research dimensions
        </p>
        <div className="mt-5 h-px" style={{ background: "linear-gradient(90deg, rgba(201,162,39,0.4), transparent 70%)" }} />
      </div>

      {/* ── Selection ── */}
      <div className="grid md:grid-cols-2 gap-5 mb-7 animate-fade-up" style={{ animationDelay: "60ms" }}>
        {[
          { val: p1, set: setP1, other: p2, label: "Paper A", id: "p1", accent: "#c9a227" },
          { val: p2, set: setP2, other: p1, label: "Paper B", id: "p2", accent: "#2dd4bf" },
        ].map(({ val, set, other, label, id, accent }) => (
          <div
            key={id}
            className="card p-5"
            style={{ borderLeft: `3px solid ${accent}40` }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: accent }}>
              {label}
            </p>
            {isLoading ? (
              <div className="shimmer h-11 rounded-xl" />
            ) : (
              <select
                value={val}
                onChange={(e) => set(e.target.value)}
                className="input text-sm"
                id={`select-${id}`}
              >
                <option value="">Select a paper…</option>
                {papers.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.id === other}>
                    {p.title.length > 60 ? p.title.slice(0, 58) + "…" : p.title}
                  </option>
                ))}
              </select>
            )}
            {val && (
              <div className="mt-2.5 flex items-center gap-1.5 text-xs" style={{ color: "#10b981" }}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Paper selected
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Compare Button ── */}
      <div className="flex justify-center mb-9 animate-fade-up" style={{ animationDelay: "120ms" }}>
        <button
          onClick={run}
          disabled={!p1 || !p2 || p1 === p2 || compareMut.isPending}
          className="btn-primary px-10 py-3 text-base"
          id="compare-btn"
        >
          {compareMut.isPending
            ? <><Loader2 className="w-5 h-5 animate-spin" />Comparing with Groq…</>
            : <><GitCompareArrows className="w-5 h-5" />Compare Papers</>
          }
        </button>
      </div>

      {/* ── Error ──  */}
      {compareMut.isError && (
        <div
          className="flex items-start gap-3 p-4 rounded-xl mb-8 animate-fade-up"
          style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)" }}
        >
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "#fb7185" }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "#fda4af" }}>Comparison failed</p>
            <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>{compareMut.error.message}</p>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {result && (
        <div className="space-y-6 animate-fade-up">
          {/* titles */}
          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#c9a227" }}>Paper A</p>
                <p className="text-sm font-semibold text-white line-clamp-2">{result.paper_1_title}</p>
              </div>
              <ArrowRight className="w-5 h-5 flex-shrink-0" style={{ color: "#334155" }} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#2dd4bf" }}>Paper B</p>
                <p className="text-sm font-semibold text-white line-clamp-2">{result.paper_2_title}</p>
              </div>
            </div>
          </div>

          {/* Comparison table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#475569", width: "20%" }}>Dimension</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#c9a227", width: "40%" }}>Paper A</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#2dd4bf", width: "40%" }}>Paper B</th>
                  </tr>
                </thead>
                <tbody>
                  {result.dimensions.map((d, i) => (
                    <tr
                      key={i}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                      }}
                    >
                      <td className="px-5 py-4">
                        <span className="text-xs font-semibold text-white">{d.dimension}</span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-xs leading-relaxed" style={{ color: "#94a3b8" }}>{d.paper_1}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-xs leading-relaxed" style={{ color: "#94a3b8" }}>{d.paper_2}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Verdict */}
          {result.verdict && (
            <div className="card-gold card p-5">
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#c9a227" }}>⚖️ Overall Verdict</p>
              <p className="text-sm leading-relaxed" style={{ color: "#94a3b8" }}>{result.verdict}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Empty state ── */}
      {!result && !compareMut.isPending && papers.length < 2 && (
        <div className="card p-12 text-center animate-fade-up">
          <FileText className="w-12 h-12 mx-auto mb-4" style={{ color: "#334155" }} />
          <h3 className="font-semibold text-white mb-2">Upload at least 2 papers</h3>
          <p className="text-sm" style={{ color: "#475569" }}>You need two papers to run a comparison.</p>
        </div>
      )}
    </div>
  );
}
