/**
 * Centralized Groq system prompts — mirrors the Python version but for the JS client.
 * 
 * NOTE: When using Groq's json_object response_format mode, the model MUST return
 * a JSON object (not a bare array). Prompts that expect arrays wrap them in an object.
 * The unwrapArray() helper in groq.ts extracts the array back out.
 */

export function summaryPrompt(paperContent: string): string {
  return `You are an expert academic research simplifier. Explain this paper as if talking to a 1st-year undergraduate student.

PAPER:
${paperContent}

Respond ONLY with valid JSON object:
{
  "overview": "3-5 sentence plain-language overview",
  "problem_statement": "What problem does this paper solve? (simple terms)",
  "methodology": "How did they solve it? Step-by-step, simple",
  "key_contributions": ["contribution 1", "contribution 2", "contribution 3"],
  "limitations": ["limitation 1", "limitation 2"],
  "practical_implications": "Real-world impact and applications"
}`;
}

export function glossaryPrompt(paperContent: string): string {
  return `You are a technical terminology expert. Extract ALL important technical terms, acronyms, and domain-specific concepts from this paper.

RULES:
- Include at least 10 terms, up to 30
- Definitions must be simple enough for a 1st-year student
- Include how each term is used specifically in THIS paper
- Order by importance

PAPER:
${paperContent}

Respond ONLY with a valid JSON object containing a "terms" array:
{
  "terms": [
    {"term": "Term Name", "definition": "Simple definition", "context": "How used in this paper"}
  ]
}`;
}

export function vivaPrompt(paperContent: string): string {
  return `You are an experienced academic examiner preparing viva voce questions.

PAPER:
${paperContent}

Generate EXACTLY 10 questions (3 easy, 4 medium, 3 hard). Base ALL questions strictly on the paper content.

Respond ONLY with a valid JSON object containing a "questions" array:
{
  "questions": [
    {
      "question": "The question text",
      "suggested_answer": "Comprehensive answer demonstrating mastery",
      "difficulty": "easy"
    }
  ]
}

Use "easy", "medium", or "hard" for difficulty values.`;
}

export function relatedWorkPrompt(paperContent: string, refsContent: string): string {
  return `You are a research analyst. Analyze the references and related work in this paper.

PAPER:
${paperContent}

REFERENCES:
${refsContent}

Respond ONLY with a valid JSON object:
{
  "summary": "3-5 sentence overview of the related work landscape",
  "themes": ["Theme 1: description", "Theme 2: description"],
  "key_references": [
    {
      "reference": "The cited work",
      "relevance": "Why it matters to this paper",
      "relationship": "How this paper builds on or differs from it"
    }
  ],
  "gaps": "Gaps in existing literature identified by this paper"
}`;
}

export function chatPrompt(
  context: string,
  history: string,
  question: string
): string {
  return `You are a precise academic research assistant. Answer using ONLY the provided context.

RULES:
1. Answer STRICTLY from context. Never hallucinate.
2. If context lacks the answer, say "I cannot find sufficient information in the paper."
3. Cite the section and a short excerpt for every claim.

RETRIEVED CONTEXT:
${context}

CHAT HISTORY:
${history || "None"}

QUESTION: ${question}

Respond ONLY with a valid JSON object:
{
  "answer": "Your answer based strictly on context",
  "citations": [
    {"section": "Section name", "excerpt": "Short relevant quote (max 100 words)", "page": 0}
  ],
  "confidence": "high"
}

Use "high", "medium", or "low" for confidence.`;
}

export function comparePrompt(
  title1: string,
  content1: string,
  title2: string,
  content2: string
): string {
  return `You are a comparative research analyst. Compare these two papers fairly and thoroughly.

PAPER 1 — "${title1}":
${content1}

PAPER 2 — "${title2}":
${content2}

Respond ONLY with a valid JSON object:
{
  "dimensions": [
    {"dimension": "Problem Statement", "paper_1": "...", "paper_2": "..."},
    {"dimension": "Methodology", "paper_1": "...", "paper_2": "..."},
    {"dimension": "Key Contributions", "paper_1": "...", "paper_2": "..."},
    {"dimension": "Novelty & Innovation", "paper_1": "...", "paper_2": "..."},
    {"dimension": "Evaluation & Results", "paper_1": "...", "paper_2": "..."},
    {"dimension": "Limitations", "paper_1": "...", "paper_2": "..."},
    {"dimension": "Practical Impact", "paper_1": "...", "paper_2": "..."}
  ],
  "verdict": "Balanced 3-5 sentence overall comparison"
}`;
}

// ─── Utility ────────────────────────────────────────────────────────────────

export function buildPaperContext(
  title: string,
  abstract: string,
  sections: { heading: string; content: string }[],
  maxWords = 5000
): string {
  let content = `Title: ${title}\n\nAbstract: ${abstract}\n\n`;
  let words = 0;

  for (const section of sections) {
    const sectionText = `## ${section.heading}\n${section.content}\n\n`;
    const sectionWords = sectionText.split(/\s+/).length;
    if (words + sectionWords > maxWords) {
      const remaining = maxWords - words;
      content += sectionText.split(/\s+/).slice(0, remaining).join(" ");
      break;
    }
    content += sectionText;
    words += sectionWords;
  }

  return content;
}
