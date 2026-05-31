import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

import { env } from "../config/env.js";
import AppError from "../utils/AppError.js";
import { IAIResult } from "../models/detection.model.js";

const ai = new GoogleGenAI({
  apiKey: env.GEMINI_API_KEY,
});

const AI_MODEL = "gemini-2.0-flash";

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

  severityLevel: z.enum([
    "LOW",
    "MEDIUM",
    "HIGH",
    "CRITICAL",
  ]),

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

Analyze the provided crop image and return ONLY a valid JSON object.

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

const fetchImageAsBase64 = async (
  imageUrl: string
): Promise<{
  base64: string;
  mimeType: string;
}> => {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new AppError(
      "Failed to fetch crop image",
      500
    );
  }

  const contentType =
    response.headers.get("content-type")?.split(";")[0].trim() ??
    "image/jpeg";

  if (
    !ALLOWED_IMAGE_TYPES.includes(
      contentType as (typeof ALLOWED_IMAGE_TYPES)[number]
    )
  ) {
    throw new AppError(
      "Unsupported image format",
      400
    );
  }

  const contentLength = response.headers.get("content-length");

  if (
    contentLength &&
    Number(contentLength) >
      MAX_IMAGE_SIZE_MB * 1024 * 1024
  ) {
    throw new AppError(
      "Image exceeds maximum allowed size",
      400
    );
  }

  const arrayBuffer = await response.arrayBuffer();

  const base64 = Buffer.from(arrayBuffer).toString(
    "base64"
  );

  return {
    base64,
    mimeType: contentType,
  };
};

const extractJson = (text: string): unknown => {
  const cleaned = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  return JSON.parse(cleaned);
};

export const analyzeCropImage = async (
  imageUrl: string
): Promise<IAIResult> => {
  try {
    const { base64, mimeType } =
      await fetchImageAsBase64(imageUrl);

    const response = await Promise.race([
      ai.models.generateContent({
        model: AI_MODEL,

        contents: [
          {
            inlineData: {
              data: base64,
              mimeType,
            },
          },
          {
            text: DETECTION_PROMPT,
          },
        ],
      }),

      new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error("AI request timeout")
            ),
          30000
        )
      ),
    ]);

    const rawText =
      (response as Awaited<
        ReturnType<typeof ai.models.generateContent>
      >).text ?? "";

    if (!rawText.trim()) {
      throw new AppError(
        "AI returned empty response",
        500
      );
    }

    const parsed = extractJson(rawText);

    const validationResult =
      aiResultSchema.safeParse(parsed);

    if (!validationResult.success) {
      throw new AppError(
        "AI returned invalid response structure",
        500
      );
    }

    return validationResult.data as IAIResult;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (error instanceof SyntaxError) {
      throw new AppError(
        "AI response could not be parsed",
        500
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Unknown error";

    if (
      message.includes("429") ||
      message.toLowerCase().includes("quota")
    ) {
      throw new AppError(
        "AI service quota exceeded",
        429
      );
    }

    if (
      message.toLowerCase().includes("safety")
    ) {
      throw new AppError(
        "Image blocked by AI safety filters",
        400
      );
    }

    if (
      message.toLowerCase().includes("timeout")
    ) {
      throw new AppError(
        "AI analysis timed out",
        504
      );
    }

    throw new AppError(
      "AI analysis service unavailable",
      503
    );
  }
};