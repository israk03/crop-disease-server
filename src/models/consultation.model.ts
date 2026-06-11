import mongoose, { Document, Schema } from "mongoose";

export type ConsultationStatus =
  | "PENDING"
  | "ACCEPTED"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED";

export interface IConsultation extends Document {
  _id: mongoose.Types.ObjectId;
  farmer: mongoose.Types.ObjectId;       // ref → User
  expert: mongoose.Types.ObjectId;       // ref → User
  status: ConsultationStatus;
  problemDescription: string;
  cropType: string;
  linkedDetection?: mongoose.Types.ObjectId; // ref → Detection
  scheduledTime?: Date;
  // Review — filled after completion
  rating?: number;
  review?: string;
  reviewedAt?: Date;
  // Timestamps for each transition — useful for analytics
  acceptedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const consultationSchema = new Schema<IConsultation>(
  {
    farmer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    expert: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "ACTIVE", "COMPLETED", "CANCELLED"],
      default: "PENDING",
      index: true,
    },
    problemDescription: {
      type: String,
      required: [true, "Problem description is required"],
      trim: true,
      minlength: [10, "Description must be at least 10 characters"],
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    cropType: {
      type: String,
      required: [true, "Crop type is required"],
      trim: true,
    },
    linkedDetection: {
      type: Schema.Types.ObjectId,
      ref: "Detection",
      default: null,
    },
    scheduledTime: {
      type: Date,
      default: null,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    review: {
      type: String,
      maxlength: [1000, "Review cannot exceed 1000 characters"],
      trim: true,
      default: null,
    },
    reviewedAt: { type: Date, default: null },
    acceptedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Compound index — expert dashboard: "show me my pending consultations"
consultationSchema.index({ expert: 1, status: 1, createdAt: -1 });

// Compound index — farmer dashboard: "show me my active consultations"
consultationSchema.index({ farmer: 1, status: 1, createdAt: -1 });

const Consultation = mongoose.model<IConsultation>(
  "Consultation",
  consultationSchema
);
export default Consultation;