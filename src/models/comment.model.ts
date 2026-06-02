import mongoose, { Document, Schema } from "mongoose";

export interface IComment extends Document {
  _id: mongoose.Types.ObjectId;

  post: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;

  parentComment?: mongoose.Types.ObjectId | null;

  depth: number;

  content: string;

  upvotes: mongoose.Types.ObjectId[];
  upvoteCount: number;

  replyCount: number;

  isExpertAnswer: boolean;
  isAcceptedAnswer: boolean;

  isEdited: boolean;
  editedAt?: Date | null;

  isDeleted: boolean;
  deletedAt?: Date | null;

  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    post: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },

    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    parentComment: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
      index: true,
    },

    depth: {
      type: Number,
      default: 0,
      min: 0,
    },

    content: {
      type: String,
      required: [true, "Comment content is required"],
      trim: true,
      minlength: [1, "Comment cannot be empty"],
      maxlength: [2000, "Comment cannot exceed 2000 characters"],
    },

    upvotes: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },

    upvoteCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    replyCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    isExpertAnswer: {
      type: Boolean,
      default: false,
    },

    isAcceptedAnswer: {
      type: Boolean,
      default: false,
    },

    isEdited: {
      type: Boolean,
      default: false,
    },

    editedAt: {
      type: Date,
      default: null,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Top-level comments sorted by popularity
 */
commentSchema.index({
  post: 1,
  parentComment: 1,
  upvoteCount: -1,
});

/**
 * Top-level comments sorted by newest
 */
commentSchema.index({
  post: 1,
  parentComment: 1,
  createdAt: -1,
});

/**
 * User comment history
 */
commentSchema.index({
  author: 1,
  createdAt: -1,
});

const Comment = mongoose.model<IComment>("Comment", commentSchema);

export default Comment;