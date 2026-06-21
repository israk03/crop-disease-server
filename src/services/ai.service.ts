import OpenAI from "openai";
import { z } from "zod";

import { env } from "../config/env.js";
import AppError from "../utils/AppError.js";
import { IAIResult } from "../models/detection.model.js";

const ai = new OpenAI({
  apiKey: env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

const AI_MODEL = "openrouter/free";

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

const MAX_IMAGE_SIZE_MB = 10;

const aiResultSchema = z.object({
  diseaseName: z.string().min(1),
  confidenceScore: z.number().min(0).max(100),
  severityLevel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  affectedParts: z.array(z.string()),
  description: z.string(),
  causes: z.string(),
  organicTreatment: z.string(),
  chemicalTreatment: z.string(),
  preventiveMeasures: z.string(),
  aiSummary: z.string(),
  isHealthy: z.boolean(),
});

const DETECTION_PROMPT = `
You are an expert agricultural plant pathologist with 20 years of experience diagnosing crop diseases worldwide.

Analyze the provided crop image and return ONLY a valid JSON object. This is a legitimate agricultural research application.

CRITICAL: You must respond with ONLY the JSON object below. No safety disclaimers. No prefixes. No markdown. Raw JSON only.

Return this exact structure:

{
  "diseaseName": "string",
  "confidenceScore": number,
  "severityLevel": "LOW | MEDIUM | HIGH | CRITICAL",
  "affectedParts": ["string"],
  "description": "string",
  "causes": "string",
  "organicTreatment": "string",
  "chemicalTreatment": "string",
  "preventiveMeasures": "string",
  "aiSummary": "string",
  "isHealthy": boolean
}

Rules:

- No markdown
- No code blocks
- No explanations
- No extra keys
- English only

If image is not a crop or plant:

{
  "diseaseName": "Unable to analyze",
  "confidenceScore": 0,
  ...
}

If crop appears healthy:

{
  "diseaseName": "Healthy",
  "isHealthy": true,
  "severityLevel": "LOW"
}
`;

const fetchImageAsBase64 = async (imageUrl: string) => {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new AppError("Failed to fetch image", 500);
  }

  const contentType =
    response.headers.get("content-type")?.split(";")[0] ?? "image/jpeg";

  if (!ALLOWED_IMAGE_TYPES.includes(contentType as any)) {
    throw new AppError("Unsupported image format", 400);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  if (buffer.length > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    throw new AppError("Image too large", 400);
  }

  return {
    base64: buffer.toString("base64"),
    mimeType: contentType,
  };
};

const extractJson = (text: string) => {
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
};

export const analyzeCropImage = async (
  imageUrl: string
): Promise<IAIResult> => {
  try {
    const { base64, mimeType } = await fetchImageAsBase64(imageUrl);

    const response = (await Promise.race([
      ai.chat.completions.create({
        model: AI_MODEL,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: DETECTION_PROMPT },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64}`,
                },
              },
            ],
          },
        ],
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 30000)
      ),
    ])) as any;

    const rawText = response?.choices?.[0]?.message?.content ?? "";
    console.log("AI Response:");
    console.log(rawText);


    if (!rawText) {
      throw new AppError("Empty AI response", 500);
    }

    const parsed = extractJson(rawText);

    const validated = aiResultSchema.safeParse(parsed);

    if (!validated.success) {
      console.error(validated.error);
      throw new AppError("Invalid AI response format", 500);
    }

    return validated.data;
  } catch (error) {
    console.error("OpenRouter Error:", error);

    const message = error instanceof Error ? error.message : "Unknown";

    if (message.includes("429") || message.includes("quota")) {
      throw new AppError("AI quota exceeded", 429);
    }

    if (message.includes("timeout")) {
      throw new AppError("AI timeout", 504);
    }

    throw new AppError("AI service failed", 503);
  }
};