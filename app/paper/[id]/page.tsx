"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FileText, MessageSquare, BookOpen, GraduationCap, Link2,
  Loader2, ChevronDown, ChevronUp, Send, Sparkles, AlertCircle,
  Clock, Layers, Quote, Search, ArrowLeft, ExternalLink,
} from "lucide-react";
import { cn, formatDate, truncate, getDifficultyColor } from "@/lib/utils";
import {
  usePaper, useSummary, useGlossary, useViva, useRelatedWork,
  useSendMessage,
} from "@/hooks/hooks";
import type {
  ChatMessage, Citation, SimplifiedSummary,
  GlossaryTerm, VivaQuestion, RelatedWorkNotes,
} from "@/lib/types";
import Link from "next/link";

type TabKey = "summary" | "chat" | "glossary" | "viva" | "related";
const TABS: { key: TabKey; label: string; Icon: React.ElementType }[] = [
  { key: "summary",  label: "Summary",      Icon: Sparkles },
  { key: "chat",     label: "Ask AI",        Icon: MessageSquare },
  { key: "glossary", label: "Glossary",      Icon: BookOpen },
  { key: "viva",     label: "Viva Prep",     Icon: GraduationCap },
  { key: "related",  label: "Related Work",  Icon: Link2 },
];

export default function PaperPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("summary");
  const { data: paper, isLoading, error } = usePaper(id);

  if (isLoading) return <Skeleton />;
  if (error || !paper) return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="card p-12 text-center">
        <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: "#fb7185" }} />
        <h2 className="font-serif text-xl font-bold text-white mb-2">Paper Not Found</h2>
        <p className="text-sm mb-6" style={{ color: "#475569" }}>This paper doesn&apos;t exist or couldn&tpos;t be loaded.</p>
        <Link href="/" className="btn-secondary inline-flex">← Back to Dashboard</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen px-8 py-9 max-w-4xl mx-auto animate-fade-up">

      {/* ── Breadcrumb ── */}
      <button onClick={() => router.back()} className="btn-ghost mb-6 -ml-2">
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      {/* ── Paper Header ── */}
      <div className="card p-6 mb-7" style={{ borderLeft: "4px solid rgba(201,162,39,0.4)" }}>
        <div className="flex items-start justify-between gap-4 mb-3">
          <span className="badge badge-gold">PDF Analysed</span>
          <div className="flex items-center gap-4 text-xs" style={{ color: "#334155" }}>
            <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" />{paper.totalPages} pages</span>
            <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" />{paper.totalSections} sections</span>
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{formatDate(paper.uploadedAt)}</span>
          </div>
        </div>
        <h1 className="font-serif text-2xl font-bold text-white mb-2 leading-tight">{paper.title}</h1>
        <p className="text-sm mb-4" style={{ color: "#64748b" }}>{paper.authors}</p>
        {paper.abstract && (
          <div className="citation-block">
            <p className="text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "#c9a227" }}>Abstract</p>
            <p className="text-xs leading-relaxed" style={{ color: "#94a3b8" }}>{paper.abstract}</p>
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="mb-6 overflow-x-auto">
        <div className="tab-list w-max">
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn("tab-btn", tab === key && "tab-btn-active")}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="animate-fade-in" key={tab}>
        {tab === "summary"  && <SummaryTab  paperId={id} />}
        {tab === "chat"     && <ChatTab     paperId={id} />}
        {tab === "glossary" && <GlossaryTab paperId={id} />}
        {tab === "viva"     && <VivaTab     paperId={id} />}
        {tab === "related"  && <RelatedTab  paperId={id} />}
      </div>
    </div>
  );
}

/* ─────────────── Summary ─────────────── */
function SummaryTab({ paperId }: { paperId: string }) {
  const { data, isLoading, error } = useSummary(paperId);
  if (isLoading) return <LoadingCard label="Generating simplified summary with Groq…" />;
  if (error)     return <ErrorCard msg="Failed to generate summary." />;
  const s = data?.data as SimplifiedSummary;
  return (
    <div className="space-y-5">
      <div className="card p-6">
        <h3 className="section-heading mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4" style={{ color: "#c9a227" }} />
          Overview
        </h3>
        <p className="text-sm leading-7" style={{ color: "#94a3b8" }}>{s.overview}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {[
          { emoji: "🔍", title: "Problem Statement",  text: s.problem_statement },
          { emoji: "⚙️", title: "Methodology",         text: s.methodology },
        ].map((item) => (
          <div key={item.title} className="card p-5">
            <h3 className="text-sm font-semibold text-white mb-3">{item.emoji} {item.title}</h3>
            <p className="text-xs leading-relaxed" style={{ color: "#94a3b8" }}>{item.text}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-3">🏆 Key Contributions</h3>
          <ul className="space-y-2">
            {s.key_contributions?.map((c, i) => (
              <li key={i} className="flex gap-2.5 text-xs" style={{ color: "#94a3b8" }}>
                <span style={{ color: "#c9a227", marginTop: 2 }}>▸</span>
                {c}
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-3">⚠️ Limitations</h3>
          <ul className="space-y-2">
            {s.limitations?.map((l, i) => (
              <li key={i} className="flex gap-2.5 text-xs" style={{ color: "#94a3b8" }}>
                <span style={{ color: "#f97316", marginTop: 2 }}>▸</span>
                {l}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {s.practical_implications && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-3">🌍 Practical Implications</h3>
          <p className="text-xs leading-relaxed" style={{ color: "#94a3b8" }}>{s.practical_implications}</p>
        </div>
      )}
    </div>
  );
}

/* ─────────────── Chat ─────────────── */
function ChatTab({ paperId }: { paperId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const sendMut = useSendMessage(paperId);

  const send = () => {
    if (!input.trim() || sendMut.isPending) return;
    const userMsg: ChatMessage = { role: "user", content: input };
    setMessages((p) => [...p, userMsg]);
    const q = input; setInput("");
    sendMut.mutate({ message: q, chatHistory: messages }, {
      onSuccess: (r) => setMessages((p) => [...p, { role: "assistant", content: r.answer, citations: r.citations }]),
      onError:   ()  => setMessages((p) => [...p, { role: "assistant", content: "An error occurred. Please try again." }]),
    });
  };

  const STARTERS = [
    "What is the main contribution of this paper?",
    "Explain the methodology in simple terms",
    "What are the key limitations?",
    "How does this compare to prior work?",
  ];

  return (
    <div className="card flex flex-col" style={{ height: 580 }}>
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-10">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(201,162,39,0.08)", border: "1px solid rgba(201,162,39,0.15)" }}
            >
              <MessageSquare className="w-7 h-7" style={{ color: "#c9a227" }} />
            </div>
            <h3 className="font-semibold text-white mb-1">Ask anything about this paper</h3>
            <p className="text-xs mb-5" style={{ color: "#475569" }}>Every answer includes section citations</p>
            <div className="flex flex-wrap justify-center gap-2">
              {STARTERS.map((q) => (
                <button key={q} onClick={() => setInput(q)} className="text-xs px-3 py-2 rounded-lg border transition-all hover:-translate-y-0.5"
                  style={{ color: "#94a3b8", background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn("max-w-[82%] rounded-2xl px-4 py-3", m.role === "user" ? "rounded-br-sm" : "rounded-bl-sm")}
              style={
                m.role === "user"
                  ? { background: "linear-gradient(135deg, #c9a227, #8a6a12)", color: "#fff" }
                  : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", color: "#cbd5e1" }
              }
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
              {m.citations && m.citations.length > 0 && (
                <div className="mt-3 pt-3 space-y-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                    <Quote className="w-3 h-3" />Sources
                  </p>
                  {m.citations.map((c: Citation, ci: number) => (
                    <div key={ci} className="citation-block text-[11px]">
                      <span className="font-semibold" style={{ color: "#f0cc6b" }}>[{c.section}]</span>{" "}
                      <span className="italic" style={{ color: "#64748b" }}>&ldquo;{truncate(c.excerpt, 120)}&rdquo;</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {sendMut.isPending && (
          <div className="flex">
            <div
              className="rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2 text-sm"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", color: "#64748b" }}
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Searching paper &amp; reasoning…
            </div>
          </div>
        )}
      </div>
      <div className="p-4 flex gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <input
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask a question about this paper…"
          className="input flex-1"
          disabled={sendMut.isPending}
        />
        <button
          id="chat-send"
          onClick={send}
          disabled={!input.trim() || sendMut.isPending}
          className="btn-primary px-4"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ─────────────── Glossary ─────────────── */
function GlossaryTab({ paperId }: { paperId: string }) {
  const { data, isLoading, error } = useGlossary(paperId);
  const [open, setOpen] = useState<number | null>(null);
  if (isLoading) return <LoadingCard label="Building technical glossary…" />;
  if (error)     return <ErrorCard msg="Failed to generate glossary." />;
  const terms = data?.data as GlossaryTerm[];
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="section-heading">Technical Glossary</h3>
        <span className="badge badge-gold">{terms?.length ?? 0} terms</span>
      </div>
      {terms?.map((t, i) => (
        <div key={i} className="card overflow-hidden">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full px-5 py-3.5 flex justify-between items-center text-left transition-colors"
            style={{ background: open === i ? "rgba(201,162,39,0.04)" : "transparent" }}
          >
            <span className="text-sm font-semibold text-white font-mono">{t.term}</span>
            {open === i
              ? <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: "#c9a227" }} />
              : <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: "#475569" }} />
            }
          </button>
          {open === i && (
            <div className="px-5 pb-4 animate-fade-in">
              <div className="citation-block">
                <p className="text-xs mb-1"><span className="font-semibold" style={{ color: "#c9a227" }}>Definition: </span><span style={{ color: "#94a3b8" }}>{t.definition}</span></p>
                {t.context && <p className="text-xs mt-2"><span className="font-semibold" style={{ color: "#2dd4bf" }}>In this paper: </span><span style={{ color: "#64748b" }}>{t.context}</span></p>}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─────────────── Viva ─────────────── */
function VivaTab({ paperId }: { paperId: string }) {
  const { data, isLoading, error } = useViva(paperId);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  if (isLoading) return <LoadingCard label="Generating viva Q&A…" />;
  if (error)     return <ErrorCard msg="Failed to generate viva questions." />;
  const qs = data?.data as VivaQuestion[];

  const toggle = (i: number) =>
    setRevealed((p) => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; });

  const DIFFICULTY_STYLES: Record<string, { bg: string; color: string; border: string }> = {
    easy:   { bg: "rgba(16,185,129,0.1)",  color: "#34d399", border: "rgba(16,185,129,0.2)" },
    medium: { bg: "rgba(251,146,36,0.1)",  color: "#fb923c", border: "rgba(251,146,36,0.2)" },
    hard:   { bg: "rgba(244,63,94,0.1)",   color: "#fb7185", border: "rgba(244,63,94,0.2)"  },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="section-heading">Viva Preparation</h3>
        <span className="badge badge-violet">{qs?.length ?? 0} questions</span>
      </div>
      {qs?.map((q, i) => {
        const diff = (q.difficulty ?? "medium").toLowerCase();
        const style = DIFFICULTY_STYLES[diff] ?? DIFFICULTY_STYLES.medium;
        return (
          <div key={i} className="card p-5">
            <div className="flex items-start gap-3 mb-3">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.05)", color: "#64748b" }}
              >
                {i + 1}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white leading-snug">{q.question}</p>
              </div>
              <span
                className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full flex-shrink-0"
                style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}` }}
              >
                {diff}
              </span>
            </div>
            <button
              onClick={() => toggle(i)}
              className="text-xs font-medium transition-colors"
              style={{ color: "#c9a227" }}
            >
              {revealed.has(i) ? "▲ Hide answer" : "▼ Show suggested answer"}
            </button>
            {revealed.has(i) && (
              <div
                className="mt-3 p-4 rounded-xl text-xs leading-relaxed animate-fade-in"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "#94a3b8" }}
              >
                {q.suggested_answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────── Related Work ─────────────── */
function RelatedTab({ paperId }: { paperId: string }) {
  const { data, isLoading, error } = useRelatedWork(paperId);
  if (isLoading) return <LoadingCard label="Analysing references and related work…" />;
  if (error)     return <ErrorCard msg="Failed to generate related work notes." />;
  const rw = data?.data as RelatedWorkNotes;
  return (
    <div className="space-y-5">
      <div className="card p-6">
        <h3 className="section-heading mb-3 flex items-center gap-2">
          <Link2 className="w-4 h-4" style={{ color: "#2dd4bf" }} />
          Related Work Overview
        </h3>
        <p className="text-sm leading-7" style={{ color: "#94a3b8" }}>{rw?.summary}</p>
      </div>

      <div className="flex gap-4">
        <Link
          href={`/search?q=${encodeURIComponent(rw?.summary?.slice(0, 80) ?? "")}`}
          className="btn-secondary text-sm"
        >
          <Search className="w-4 h-4" />
          Search Related Papers
          <ExternalLink className="w-3.5 h-3.5 ml-0.5 opacity-60" />
        </Link>
      </div>

      {rw?.themes?.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">🔗 Research Themes</h3>
          <div className="space-y-2">
            {rw.themes.map((t, i) => (
              <div key={i} className="flex gap-3 items-start text-xs" style={{ color: "#94a3b8" }}>
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                  style={{ background: "rgba(45,212,191,0.1)", color: "#2dd4bf", border: "1px solid rgba(45,212,191,0.2)" }}
                >
                  {i + 1}
                </span>
                {t}
              </div>
            ))}
          </div>
        </div>
      )}

      {rw?.key_references?.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">📚 Key References</h3>
          <div className="space-y-3">
            {rw.key_references.map((r, i) => (
              <div key={i} className="citation-block">
                <p className="text-xs font-semibold text-white mb-1">{r.reference}</p>
                <p className="text-[11px]"><span style={{ color: "#c9a227" }}>Relevance: </span>{r.relevance}</p>
                {r.relationship && <p className="text-[11px] mt-0.5"><span style={{ color: "#2dd4bf" }}>Relationship: </span>{r.relationship}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {rw?.gaps && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-3">🔬 Research Gaps</h3>
          <p className="text-xs leading-relaxed" style={{ color: "#94a3b8" }}>{rw.gaps}</p>
        </div>
      )}
    </div>
  );
}

/* ─────────────── Shared ─────────────── */
function LoadingCard({ label }: { label: string }) {
  return (
    <div className="card p-12 text-center">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ background: "rgba(201,162,39,0.08)", border: "1px solid rgba(201,162,39,0.15)" }}
      >
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: "#c9a227" }} />
      </div>
      <p className="font-semibold text-white mb-1">{label}</p>
      <p className="text-xs" style={{ color: "#475569" }}>First run may take ~30 seconds · Results are cached</p>
    </div>
  );
}

function ErrorCard({ msg }: { msg: string }) {
  return (
    <div className="card p-8 text-center">
      <AlertCircle className="w-8 h-8 mx-auto mb-3" style={{ color: "#fb7185" }} />
      <p className="font-semibold" style={{ color: "#fda4af" }}>{msg}</p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-4">
      <div className="shimmer h-8 w-32 rounded-lg" />
      <div className="card p-6 space-y-3">
        <div className="shimmer h-6 w-4/5 rounded" />
        <div className="shimmer h-4 w-2/3 rounded" />
        <div className="shimmer h-20 w-full rounded" />
      </div>
      <div className="shimmer h-12 w-full rounded-xl" />
      <div className="card p-6 space-y-3">
        <div className="shimmer h-5 w-1/3 rounded" />
        <div className="shimmer h-4 w-full rounded" />
        <div className="shimmer h-4 w-5/6 rounded" />
      </div>
    </div>
  );
}
