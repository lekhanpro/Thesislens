import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max).trim() + "…";
}

export function getDifficultyColor(difficulty: string): string {
  switch (difficulty.toLowerCase()) {
    case "easy": return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
    case "hard": return "text-rose-400 bg-rose-400/10 border-rose-400/20";
    default: return "text-amber-400 bg-amber-400/10 border-amber-400/20";
  }
}
