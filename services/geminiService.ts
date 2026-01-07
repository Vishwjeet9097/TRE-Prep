
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Added schema for extracting initial metadata from the exam paper header.
 */
const METADATA_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    paperTitle: { type: Type.STRING },
    totalQuestions: { type: Type.INTEGER },
    durationMinutes: { type: Type.INTEGER }
  },
  required: ["paperTitle", "totalQuestions"]
};

const STAGING_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    metadata: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        totalQuestions: { type: Type.INTEGER },
        durationMinutes: { type: Type.INTEGER }
      }
    },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          order: { type: Type.INTEGER },
          subject: { type: Type.STRING },
          correctAnswer: { type: Type.INTEGER, description: "0-based index of correct option" },
          contentEn: { type: Type.STRING },
          contentHi: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                orderIndex: { type: Type.INTEGER },
                textEn: { type: Type.STRING },
                textHi: { type: Type.STRING }
              }
            }
          }
        },
        required: ["order", "correctAnswer", "contentEn", "contentHi", "options"]
      }
    }
  }
};

/**
 * Implemented and exported extractPaperMetadata to provide basic exam information from the text.
 */
export const extractPaperMetadata = async (text: string): Promise<any> => {
  const prompt = `
    Extract metadata from this BPSC exam paper header text.
    - paperTitle: The main title or subject of the exam.
    - totalQuestions: Total number of questions mentioned (usually 120 or 150).
    - durationMinutes: The duration of the exam in minutes.

    TEXT:
    ${text}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: METADATA_SCHEMA,
      },
    });

    return JSON.parse(response.text.trim());
  } catch (error) {
    console.error("Metadata extraction error:", error);
    return { paperTitle: "BPSC Exam", totalQuestions: 120, durationMinutes: 120 };
  }
};

/**
 * parseExamPaperToStaging optimized for speed to prevent timeouts.
 * Uses gemini-3-flash-preview for high-performance extraction.
 */
export const parseExamPaperToStaging = async (textChunks: string[], maxQs: number): Promise<any> => {
  const combinedText = textChunks.join("\n\n--- PAGE ---\n\n");
  
  const prompt = `
    ACT AS A SENIOR DATABASE ARCHITECT. 
    Extract all complete questions found in the following text segment from a BPSC exam paper.
    
    INSTRUCTIONS:
    - Identify every question provided in this specific text segment.
    - BPSC papers are BILINGUAL (English and Hindi). You MUST capture both translations for every question and its 5 options.
    - Use valid LaTeX ($...$) for all mathematical expressions and formulas.
    - Questions usually have 5 options (A, B, C, D, E). 
    - Identify the correct answer index (0-4) based on exam context or common knowledge if not explicitly marked.
    - If a question starts in this segment but ends in the next, try to extract as much as possible or skip if incomplete.
    
    SEGMENT TEXT:
    ${combinedText}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: STAGING_SCHEMA,
        // Removed thinkingConfig to significantly reduce latency for extraction tasks
      },
    });

    return JSON.parse(response.text.trim());
  } catch (error) {
    console.error("Staging Parse Error (Batch):", error);
    // Return empty set for this batch to allow others to continue
    return { metadata: {}, questions: [] };
  }
};
