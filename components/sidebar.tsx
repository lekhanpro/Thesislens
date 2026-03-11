"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Upload,
  GitCompareArrows,
  Search,
  BookOpen,
  Sparkles,
  FlaskConical,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/",          label: "Dashboard",       icon: LayoutDashboard, desc: "All papers" },
  { href: "/upload",    label: "Upload Paper",     icon: Upload,          desc: "Add new PDF" },
  { href: "/search",    label: "Search References",icon: Search,          desc: "Web search" },
  { href: "/compare",   label: "Compare Papers",   icon: GitCompareArrows,desc: "Side-by-side" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-60 min-h-screen flex flex-col sticky top-0 z-30"
      style={{
        background: "linear-gradient(180deg, #07091a 0%, #04080f 100%)",
        borderRight: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {/* Brand */}
      <div className="px-5 pt-6 pb-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #c9a227, #7a5a0e)" }}
          >
            <FlaskConical className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-[15px] leading-none tracking-tight">ThesisLens</p>
            <p className="text-[11px] mt-0.5" style={{ color: "#c9a227", opacity: 0.8 }}>Academic AI Explorer</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest px-2 mb-3" style={{ color: "#334155" }}>
          Navigation
        </p>
        {nav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("nav-link", active && "nav-link-active")}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium leading-none truncate">{item.label}</p>
                <p className="text-[11px] mt-0.5 opacity-60 leading-none">{item.desc}</p>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div
          className="rounded-xl p-3"
          style={{ background: "rgba(201,162,39,0.06)", border: "1px solid rgba(201,162,39,0.1)" }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-3.5 h-3.5" style={{ color: "#c9a227" }} />
            <span className="text-[11px] font-semibold" style={{ color: "#c9a227" }}>Powered by Groq</span>
          </div>
          <p className="text-[10px] leading-relaxed" style={{ color: "#475569" }}>
            Ultra-fast LLM inference with Llama 3.3 70B
          </p>
        </div>
      </div>
    </aside>
  );
}
