"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import {
  Upload, FileText, CheckCircle2, AlertCircle, Loader2,
  ArrowRight, Shield, Zap, BookOpen, MessageSquare,
  GraduationCap, BarChart2,
} from "lucide-react";
import { useUploadPaper } from "@/hooks/hooks";

export default function UploadPage() {
  const router = useRouter();
  const uploadMutation = useUploadPaper();
  const [file, setFile] = useState<File | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) setFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
  });

  const handleUpload = () => {
    if (!file) return;
    uploadMutation.mutate(file, {
      onSuccess: (paper) => router.push(`/paper/${paper.id}`),
    });
  };

  const features = [
    { icon: BookOpen,     color: "#c9a227", title: "Simplified Summary",   desc: "ELI first-year explanation of any complex paper" },
    { icon: MessageSquare,color: "#2dd4bf", title: "Citation-Aware Chat",   desc: "Ask questions — every answer cites a section" },
    { icon: GraduationCap,color: "#a78bfa", title: "Viva Preparation",      desc: "AI-generated Q&A sorted by difficulty level" },
    { icon: BarChart2,    color: "#fb923c", title: "Paper Comparison",       desc: "7-dimension side-by-side analysis with verdict" },
  ];

  return (
    <div className="min-h-screen px-8 py-9 max-w-3xl mx-auto">

      {/* ── Header ── */}
      <div className="mb-10 animate-fade-up">
        <h1 className="font-serif text-4xl font-bold text-white tracking-tight mb-2">
          Upload Research Paper
        </h1>
        <p style={{ color: "#64748b" }} className="text-base">
          Upload any academic PDF and let AI extract, structure, and analyse it for you.
        </p>
        <div className="mt-5 h-px" style={{ background: "linear-gradient(90deg, rgba(201,162,39,0.4), transparent 70%)" }} />
      </div>

      {/* ── Drop Zone ── */}
      <div
        {...getRootProps()}
        className="card animate-fade-up mb-4 cursor-pointer transition-all duration-300"
        style={{
          padding: "48px 32px",
          textAlign: "center",
          borderColor: isDragActive ? "rgba(201,162,39,0.5)" : undefined,
          boxShadow: isDragActive ? "0 0 40px rgba(201,162,39,0.12), inset 0 1px 0 rgba(255,255,255,0.06)" : undefined,
          background: isDragActive ? "rgba(201,162,39,0.04)" : undefined,
          animationDelay: "60ms",
        }}
        id="drop-zone"
      >
        <input {...getInputProps()} id="file-input" />
        {uploadMutation.isSuccess ? (
          <div className="space-y-3">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <CheckCircle2 className="w-8 h-8" style={{ color: "#10b981" }} />
            </div>
            <p className="text-lg font-semibold text-white">Analysed successfully!</p>
            <p className="text-sm" style={{ color: "#64748b" }}>Redirecting to your paper…</p>
          </div>
        ) : uploadMutation.isPending ? (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "rgba(201,162,39,0.1)", border: "1px solid rgba(201,162,39,0.2)" }}>
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#c9a227" }} />
            </div>
            <div>
              <p className="text-lg font-semibold text-white mb-1">Processing PDF…</p>
              <p className="text-sm" style={{ color: "#64748b" }}>Extracting text · Chunking sections · Indexing for RAG</p>
            </div>
            <div className="progress-bar w-64 mx-auto">
              <div className="progress-fill shimmer" style={{ width: "100%" }} />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto transition-all"
              style={{
                background: file ? "rgba(201,162,39,0.1)"  : isDragActive ? "rgba(201,162,39,0.15)" : "rgba(255,255,255,0.04)",
                border:     file ? "1px solid rgba(201,162,39,0.25)" : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {file
                ? <FileText className="w-8 h-8" style={{ color: "#c9a227" }} />
                : <Upload className="w-8 h-8" style={{ color: isDragActive ? "#c9a227" : "#334155" }} />
              }
            </div>
            {file ? (
              <div>
                <p className="text-lg font-semibold text-white">{file.name}</p>
                <p className="text-sm" style={{ color: "#64748b" }}>
                  {(file.size / 1024 / 1024).toFixed(2)} MB · Click to change file
                </p>
              </div>
            ) : (
              <div>
                <p className="text-lg font-semibold text-white">
                  {isDragActive ? "Drop PDF here" : "Drag & drop your PDF"}
                </p>
                <p className="text-sm" style={{ color: "#64748b" }}>
                  or click to browse files · Max 50 MB · PDF only
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Error ── */}
      {uploadMutation.isError && (
        <div
          className="flex items-start gap-3 p-4 rounded-xl mb-4 animate-fade-up"
          style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)" }}
        >
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "#fb7185" }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "#fda4af" }}>Upload failed</p>
            <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>{uploadMutation.error.message}</p>
          </div>
        </div>
      )}

      {/* ── Upload Button ── */}
      {file && !uploadMutation.isPending && !uploadMutation.isSuccess && (
        <div className="flex justify-center mb-8 animate-fade-up">
          <button onClick={handleUpload} className="btn-primary px-10 py-3 text-base" id="analyse-btn">
            Analyse Paper
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* ── Trust badges ── */}
      <div className="flex items-center justify-center gap-6 mb-8 animate-fade-up" style={{ animationDelay: "120ms" }}>
        {[
          { icon: Shield, text: "Secure · private" },
          { icon: Zap,    text: "Groq LLM · fast" },
          { icon: BookOpen, text: "All PDF formats" },
        ].map((b) => (
          <div key={b.text} className="flex items-center gap-1.5 text-xs" style={{ color: "#475569" }}>
            <b.icon className="w-3.5 h-3.5" />
            {b.text}
          </div>
        ))}
      </div>

      {/* ── Features ── */}
      <div className="grid grid-cols-2 gap-3 animate-fade-up" style={{ animationDelay: "160ms" }}>
        {features.map((f) => (
          <div key={f.title} className="card p-4 flex items-start gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${f.color}14`, border: `1px solid ${f.color}22` }}
            >
              <f.icon className="w-4 h-4" style={{ color: f.color }} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">{f.title}</p>
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "#475569" }}>{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
