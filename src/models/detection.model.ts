import mongoose, { Document, Schema } from "mongoose";

export const DETECTION_STATUS = [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
] as const;

export const SEVERITY_LEVELS = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
] as const;

export type DetectionStatus = (typeof DETECTION_STATUS)[number];
export type SeverityLevel = (typeof SEVERITY_LEVELS)[number];

export interface IAIResult {
  diseaseName: string;
  confidenceScore: number;
  severityLevel: SeverityLevel;
  affectedParts: string[];
  description: string;
  causes: string;
  organicTreatment: string;
  chemicalTreatment: string;
  preventiveMeasures: string;
  aiSummary: string;
  isHealthy: boolean;
}

export interface IDetection extends Document {
  _id: mongoose.Types.ObjectId;

  owner: mongoose.Types.ObjectId;

  cropType: string;

  imageUrl: string;
  imagePublicId: string;

  status: DetectionStatus;

  aiResult?: IAIResult | null;

  errorMessage?: string | null;

  isShared: boolean;

  farm?: mongoose.Types.ObjectId | null;
  crop?: mongoose.Types.ObjectId | null;

  createdAt: Date;
  updatedAt: Date;
}

const aiResultSchema = new Schema<IAIResult>(
  {
    diseaseName: {
      type: String,
      required: true,
      trim: true,
    },

    confidenceScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    severityLevel: {
      type: String,
      enum: SEVERITY_LEVELS,
      required: true,
    },

    affectedParts: [
      {
        type: String,
        trim: true,
      },
    ],

    description: {
      type: String,
      required: true,
      trim: true,
    },

    causes: {
      type: String,
      required: true,
      trim: true,
    },

    organicTreatment: {
      type: String,
      required: true,
      trim: true,
    },

    chemicalTreatment: {
      type: String,
      required: true,
      trim: true,
    },

    preventiveMeasures: {
      type: String,
      required: true,
      trim: true,
    },

    aiSummary: {
      type: String,
      required: true,
      trim: true,
    },

    isHealthy: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: false,
  }
);

const detectionSchema = new Schema<IDetection>(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    cropType: {
      type: String,
      required: [true, "Crop type is required"],
      trim: true,
    },

    imageUrl: {
      type: String,
      required: true,
      trim: true,
    },

    imagePublicId: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: DETECTION_STATUS,
      default: "PENDING",
      index: true,
    },

    aiResult: {
      type: aiResultSchema,
      default: null,
    },

    errorMessage: {
      type: String,
      default: null,
      trim: true,
    },

    isShared: {
      type: Boolean,
      default: false,
      index: true,
    },

    farm: {
      type: Schema.Types.ObjectId,
      ref: "Farm",
      default: null,
    },

    crop: {
      type: Schema.Types.ObjectId,
      ref: "Crop",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/**
 * User detection history
 */
detectionSchema.index({
  owner: 1,
  status: 1,
  createdAt: -1,
});

/**
 * Community feed
 */
detectionSchema.index({
  isShared: 1,
  createdAt: -1,
});

/**
 * Disease analytics
 */
detectionSchema.index({
  "aiResult.diseaseName": 1,
});

const Detection = mongoose.model<IDetection>(
  "Detection",
  detectionSchema
);

export default Detection;