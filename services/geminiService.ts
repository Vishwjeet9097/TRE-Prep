
import { GoogleGenAI, Type } from "@google/genai";

import { UserService } from "../store";

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          number: { type: Type.INTEGER },
          content_en: { type: Type.STRING },
          content_hi: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING, description: "a, b, c, d, or e" },
                text_en: { type: Type.STRING },
                text_hi: { type: Type.STRING }
              },
              required: ["id", "text_en", "text_hi"]
            }
          },
          correctOptionId: { type: Type.STRING },
          explanation_en: { type: Type.STRING },
          explanation_hi: { type: Type.STRING },
          topic: { type: Type.STRING, description: "History, Polity, Geography, Economy, Science, Math, Current Affairs, Bihar Special" }
        },
        required: ["number", "content_en", "content_hi", "options", "correctOptionId", "explanation_en", "explanation_hi", "topic"]
      }
    }
  },
  required: ["questions"]
};

/**
 * Extracts a specific range of questions from the PDF.
 * This is necessary to avoid hitting the AI's output token limit for 150 bilingual questions.
 */
export const extractQuestionBatch = async (
  pdfBase64: string,
  rangeStart: number,
  rangeEnd: number,
  onProgress: (msg: string) => void
) => {
  const profile = UserService.getProfile();
  const apiKey = profile.apiKey || process.env.API_KEY;

  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please add it in Settings.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `
    You are a Professional BPSC TRE 4.0 Digitizer.
    TASK: Extract questions numbered ${rangeStart} to ${rangeEnd} from the provided PDF.
    
    STRICT RULES:
    1. ONLY extract questions in the range [${rangeStart} - ${rangeEnd}].
    2. BILINGUAL: Map English to 'content_en' and Hindi to 'content_hi'.
    3. OPTIONS: BPSC papers usually have 5 options (A, B, C, D, E). Extract all.
    4. ACCURACY: Do not hallucinate. If a question in this range is missing, skip it.
    5. COMPACTNESS: Keep explanations to exactly one sentence to save space.
    6. TOPIC TAGGING: Categorize every question into one of: 'History', 'Polity', 'Geography', 'Economy', 'Science', 'Math', 'Current Affairs', 'Bihar Special'. Use your best judgement based on content.
    7. FORMATTING: 
       - Code Snippets: MUST be wrapped in markdown code blocks (e.g. \`\`\`python ... \`\`\`).
       - Math/Equations: MUST be formatted in LaTeX (e.g. $x^2 + y^2 = z^2$). Do NOT use plain text for math.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", // Flash is faster for high-volume extraction
      contents: [
        { text: `Extract questions ${rangeStart} through ${rangeEnd}. Ensure all bilingual parts and options are included.` },
        { inlineData: { mimeType: "application/pdf", data: pdfBase64 } }
      ],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema
      }
    });

    const text = response.text;
    if (!text) return [];

    const parsed = JSON.parse(text);
    return (parsed.questions || []).map((q: any) => ({
      id: Math.random().toString(36).substr(2, 9),
      number: q.number,
      content: { en: q.content_en || "", hi: q.content_hi || "" },
      options: (q.options || []).map((o: any) => ({
        id: (o.id || "").toLowerCase(),
        text: { en: o.text_en || "", hi: o.text_hi || "" }
      })),
      correctOptionId: (q.correctOptionId || "").toLowerCase(),
      explanation: { en: q.explanation_en || "", hi: q.explanation_hi || "" },
      topic: q.topic || "General"
    }));
  } catch (error) {
    console.error(`Batch ${rangeStart}-${rangeEnd} failed:`, error);
    throw error; // Propagate error to main parser
  }
};

// Custom error for rate limits
export class LimitReachedError extends Error {
  parsedQuestions: any[];
  completedBatches: number;

  constructor(message: string, parsedQuestions: any[], completedBatches: number) {
    super(message);
    this.name = "LimitReachedError";
    this.parsedQuestions = parsedQuestions;
    this.completedBatches = completedBatches;
  }
}

/**
 * Orchestrates the full 150-question extraction by calling batches.
 */
export const parseExamPDF = async (
  pdfBase64: string,
  onProgress: (msg: string) => void,
  startBatch: number = 0,
  initialQuestions: any[] = []
) => {
  const allQuestions: any[] = [...initialQuestions];
  const batchSize = 30;
  const totalQuestions = 150;
  const totalBatches = Math.ceil(totalQuestions / batchSize);

  onProgress(`Initializing Professional Parser (Batch ${startBatch + 1}/${totalBatches})...`);

  for (let i = startBatch; i < totalBatches; i++) {
    const start = (i * batchSize) + 1;
    const end = Math.min((i + 1) * batchSize, totalQuestions);

    onProgress(`Processing Batch ${i + 1}/${totalBatches}: Extracting Questions ${start}-${end}...`);

    try {
      const batch = await extractQuestionBatch(pdfBase64, start, end, onProgress);
      allQuestions.push(...batch);
    } catch (error: any) {
      // Check for rate limit / quota errors
      if (error.message?.includes("429") || error.message?.includes("quota") || error.message?.includes("limit")) {
        throw new LimitReachedError(
          "API Limit Reached. Pausing extraction to preserve progress.",
          allQuestions,
          i // Completed batches count (failed at i, so i batches fully done before? No, i failed. so i batches completed? No, 0 to i-1 completed)
          // Actually, if batch i failed, we have completed i batches (0 to i-1). 
          // So restarting at i is correct.
        );
      }
      console.error(`Batch ${i} failed, skipping...`, error);
      // For non-critical errors, we might want to continue or throw?
      // Let's throw LimitReachedError for generic failures too if we want "Resume" capability for network errors etc.
      // But strictly speaking:
      throw new LimitReachedError(
        "Extraction Interrupted. You can resume from this batch.",
        allQuestions,
        i
      );
    }

    // Tiny delay to respect rate limits
    await new Promise(r => setTimeout(r, 1000));
  }

  if (allQuestions.length === 0) {
    throw new Error("No questions could be extracted. Please check PDF quality.");
  }

  // Sort by number to ensure order is preserved during reassembly
  return allQuestions.sort((a, b) => a.number - b.number);
};

/**
 * Generates a fresh batch of 20 BPSC-style questions on a specific topic.
 */
export const generateQuestionsByTopic = async (
  topic: string,
  onProgress: (msg: string) => void
) => {
  const profile = UserService.getProfile();
  const apiKey = profile.apiKey || process.env.API_KEY;

  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please add it in Settings.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `
    You are a Senior BPSC (Bihar Public Service Commission) Exam Setter.
    TASK: Generate a high-quality, 20-question practice set for the topic: "${topic}".

    STRICT RULES:
    1. PATTERN: BPSC TRE Standard (5 Options).
       - Option A, B, C: Plausible distractors or correct answer.
       - Option D: "More than one of the above" (उपर्युक्त में से एक से अधिक).
       - Option E: "None of the above" (उपर्युक्त में से कोई नहीं).
    2. BILINGUAL: Every question and option MUST be in English and Hindi.
    3. DIFFICULTY: Mix of Moderate (60%) and Hard (40%). Avoid easy questions.
    4. ACCURACY: Fact-check strictly. No hallucinations.
    5. FORMAT: Return strict JSON.
  `;

  onProgress(`AI requires thinking time... Drafting 20 high-quality questions on "${topic}"...`);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp", // Using Flash for speed/cost balance
      contents: [
        { text: `Generate 20 BPSC-style questions on ${topic}. Ensure strict 5-option pattern with D and E fixed.` }
      ],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema
      }
    });

    onProgress("Formatting and validating content...");

    const text = response.text;
    if (!text) throw new Error("AI returned empty response");

    const parsed = JSON.parse(text);
    return (parsed.questions || []).map((q: any, idx: number) => ({
      id: Math.random().toString(36).substr(2, 9),
      number: idx + 1,
      content: { en: q.content_en || "", hi: q.content_hi || "" },
      options: (q.options || []).map((o: any) => ({
        id: (o.id || "").toLowerCase(),
        text: { en: o.text_en || "", hi: o.text_hi || "" }
      })),
      correctOptionId: (q.correctOptionId || "").toLowerCase(),
      explanation: { en: q.explanation_en || "", hi: q.explanation_hi || "" },
      topic: topic
    }));

  } catch (error) {
    console.error(`Generation failed:`, error);
    throw error;
  }
};
