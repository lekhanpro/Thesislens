/**
 * POST /api/search-references
 * Searches the web for academic references using Tavily API.
 * Body: { query: string, paperId?: string, searchType?: "paper"|"author"|"topic" }
 */

import { NextRequest, NextResponse } from "next/server";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedDate?: string;
  source: string;
  relevanceScore: number;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  totalResults: number;
  searchType: string;
}

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { query, searchType = "paper" } = await req.json();

    if (!query?.trim()) {
      return NextResponse.json({ error: "Search query is required." }, { status: 400 });
    }

    const apiKey = process.env.TAVILY_API_KEY;

    if (!apiKey) {
      // Return mock academic results when Tavily isn't configured
      return NextResponse.json(mockResults(query, searchType));
    }

    // Build an academic-focused search query
    const academicQuery = buildAcademicQuery(query, searchType);

    const tavilyRes = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: academicQuery,
        search_depth: "advanced",
        include_domains: [
          "scholar.google.com",
          "arxiv.org",
          "semanticscholar.org",
          "researchgate.net",
          "pubmed.ncbi.nlm.nih.gov",
          "acm.org",
          "ieee.org",
          "springer.com",
          "elsevier.com",
          "nature.com",
          "science.org",
          "wiley.com",
          "tandfonline.com",
          "ssrn.com",
          "jstor.org",
          "ncbi.nlm.nih.gov",
          "frontiersin.org",
          "mdpi.com",
          "dl.acm.org",
        ],
        max_results: 10,
        include_answer: false,
      }),
    });

    if (!tavilyRes.ok) {
      const errText = await tavilyRes.text();
      console.error("[search-references] Tavily error:", errText);
      // Fall back to mock on API error
      return NextResponse.json(mockResults(query, searchType));
    }

    const data = await tavilyRes.json();
    const results: SearchResult[] = (data.results ?? []).map(
      (r: any, i: number) => ({
        title: r.title || "Untitled",
        url: r.url,
        snippet: r.content?.slice(0, 400) || r.snippet || "",
        publishedDate: r.published_date,
        source: extractDomain(r.url),
        relevanceScore: r.score ?? (1 - i * 0.05),
      })
    );

    const response: SearchResponse = {
      query,
      results,
      totalResults: results.length,
      searchType,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("[search-references] Error:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Search failed." },
      { status: 500 }
    );
  }
}

function buildAcademicQuery(query: string, type: string): string {
  switch (type) {
    case "author":    return `${query} researcher academic publications papers`;
    case "topic":     return `${query} research survey review academic paper`;
    case "citation":  return `"${query}" cite reference academic paper`;
    default:          return `${query} academic paper research study`;
  }
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

function mockResults(query: string, searchType: string): SearchResponse {
  return {
    query,
    searchType,
    totalResults: 3,
    results: [
      {
        title: `Set up TAVILY_API_KEY to enable live academic search`,
        url: "https://tavily.com",
        snippet:
          "Add TAVILY_API_KEY to your environment variables (Vercel dashboard or .env.local) to enable live web search across Google Scholar, arXiv, Semantic Scholar, PubMed, and 15+ academic databases.",
        source: "tavily.com",
        relevanceScore: 1.0,
      },
      {
        title: `arXiv.org — Open access research papers`,
        url: `https://arxiv.org/search/?searchtype=all&query=${encodeURIComponent(query)}`,
        snippet: `Search arXiv for papers related to: "${query}". arXiv is a free distribution service for scholarly articles in physics, mathematics, computer science, and more.`,
        source: "arxiv.org",
        relevanceScore: 0.9,
      },
      {
        title: `Semantic Scholar — AI-powered academic search`,
        url: `https://www.semanticscholar.org/search?q=${encodeURIComponent(query)}&sort=Relevance`,
        snippet: `Search Semantic Scholar for: "${query}". Access 200M+ academic papers with AI-generated summaries, citations, and related work.`,
        source: "semanticscholar.org",
        relevanceScore: 0.85,
      },
    ],
  };
}
