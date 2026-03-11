import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Sidebar } from "@/components/sidebar";

export const metadata: Metadata = {
  title: "ThesisLens — AI-Powered Academic Research Explorer",
  description:
    "Upload academic PDFs and get AI-powered simplified summaries, citation-aware chat, viva preparation, reference web search, and paper comparison — powered by Groq LLM.",
  keywords: ["research", "AI", "PDF", "thesis", "academic", "paper", "Groq", "RAG", "references"],
  openGraph: {
    title: "ThesisLens — AI Academic Research Explorer",
    description: "AI-powered research paper analysis and academic reference search",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ display: "flex", minHeight: "100vh" }}>
        <Providers>
          <Sidebar />
          <main style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
