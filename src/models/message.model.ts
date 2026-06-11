import mongoose, { Document, Schema } from "mongoose";

export const MESSAGE_TYPES = [
  "TEXT",
  "IMAGE",
] as const;

export type MessageType =
  (typeof MESSAGE_TYPES)[number];

export interface IMessage extends Document {
  _id: mongoose.Types.ObjectId;

  consultation: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;

  content: string;

  messageType: MessageType;

  imageUrl?: string | null;

  isRead: boolean;
  readAt?: Date | null;

  isEdited: boolean;
  editedAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    consultation: {
      type: Schema.Types.ObjectId,
      ref: "Consultation",
      required: true,
      index: true,
    },

    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    content: {
      type: String,
      required: [true, "Message content is required"],
      trim: true,
      maxlength: [2000, "Message cannot exceed 2000 characters"],
    },

    messageType: {
      type: String,
      enum: MESSAGE_TYPES,
      default: "TEXT",
      required: true,
    },

    imageUrl: {
      type: String,
      default: null,
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    readAt: {
      type: Date,
      default: null,
    },

    isEdited: {
      type: Boolean,
      default: false,
    },

    editedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/*
|--------------------------------------------------------------------------
| Conditional validation
|--------------------------------------------------------------------------
*/

messageSchema.pre("validate", function (next) {
  if (
    this.messageType === "IMAGE" &&
    !this.imageUrl
  ) {
    return next(
      new Error("imageUrl is required for IMAGE messages")
    );
  }

  if (
    this.messageType === "TEXT" &&
    !this.content?.trim()
  ) {
    return next(
      new Error("content is required for TEXT messages")
    );
  }

  next();
});

/*
|--------------------------------------------------------------------------
| Indexes
|--------------------------------------------------------------------------
*/

messageSchema.index({
  consultation: 1,
  createdAt: 1,
});

messageSchema.index({
  consultation: 1,
  isRead: 1,
});

messageSchema.index({
  sender: 1,
});

const Message = mongoose.model<IMessage>(
  "Message",
  messageSchema
);

export default Message;