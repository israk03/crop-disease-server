import mongoose, { Document, Schema } from "mongoose";

export const NOTIFICATION_TYPES = [
  "DETECTION_COMPLETED",
  "DETECTION_FAILED",
  "CONSULTATION_REQUEST",
  "CONSULTATION_ACCEPTED",
  "CONSULTATION_COMPLETED",
  "NEW_MESSAGE",
  "POST_UPVOTE",
  "NEW_COMMENT",
  "COMMENT_UPVOTE",
  "EXPERT_APPROVED",
  "DISEASE_ALERT",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type ReferenceModel =
  | "Detection"
  | "Consultation"
  | "Post"
  | "Comment";

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  referenceId?: mongoose.Types.ObjectId;
  referenceModel?: ReferenceModel;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    referenceId: {
      type: Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    referenceModel: {
      type: String,
      enum: ["Detection", "Consultation", "Post", "Comment"],
      default: null,
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Inbox queries
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

const Notification = mongoose.model<INotification>(
  "Notification",
  notificationSchema
);

export default Notification;