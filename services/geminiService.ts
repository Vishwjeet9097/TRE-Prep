
import { GoogleGenAI, Type } from "@google/genai";

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
          explanation_hi: { type: Type.STRING }
        },
        required: ["number", "content_en", "content_hi", "options", "correctOptionId", "explanation_en", "explanation_hi"]
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const systemInstruction = `
    You are a Professional BPSC TRE 4.0 Digitizer.
    TASK: Extract questions numbered ${rangeStart} to ${rangeEnd} from the provided PDF.
    
    STRICT RULES:
    1. ONLY extract questions in the range [${rangeStart} - ${rangeEnd}].
    2. BILINGUAL: Map English to 'content_en' and Hindi to 'content_hi'.
    3. OPTIONS: BPSC papers usually have 5 options (A, B, C, D, E). Extract all.
    4. ACCURACY: Do not hallucinate. If a question in this range is missing, skip it.
    5. COMPACTNESS: Keep explanations to exactly one sentence to save space.
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
      explanation: { en: q.explanation_en || "", hi: q.explanation_hi || "" }
    }));
  } catch (error) {
    console.error(`Batch ${rangeStart}-${rangeEnd} failed:`, error);
    return [];
  }
};

/**
 * Orchestrates the full 150-question extraction by calling batches.
 */
export const parseExamPDF = async (pdfBase64: string, onProgress: (msg: string) => void) => {
  const allQuestions: any[] = [];
  const batchSize = 30;
  const totalQuestions = 150;
  const totalBatches = Math.ceil(totalQuestions / batchSize);

  onProgress("Initializing Professional Multi-Batch Parser...");

  for (let i = 0; i < totalBatches; i++) {
    const start = (i * batchSize) + 1;
    const end = Math.min((i + 1) * batchSize, totalQuestions);
    
    onProgress(`Processing Batch ${i + 1}/${totalBatches}: Extracting Questions ${start}-${end}...`);
    
    const batch = await extractQuestionBatch(pdfBase64, start, end, onProgress);
    allQuestions.push(...batch);
    
    // Tiny delay to respect rate limits
    await new Promise(r => setTimeout(r, 1000));
  }

  if (allQuestions.length === 0) {
    throw new Error("No questions could be extracted. Please check PDF quality.");
  }

  // Sort by number to ensure order is preserved during reassembly
  return allQuestions.sort((a, b) => a.number - b.number);
};
