import mongoose, { Document, Schema } from "mongoose";

export interface IPost extends Document {
  _id: mongoose.Types.ObjectId;

  author: mongoose.Types.ObjectId;

  title: string;
  description: string;

  images: string[];

  tags: string[];

  cropType?: string;

  postType: "discussion" | "question" | "disease_case" | "advice";

  linkedDetection?: mongoose.Types.ObjectId;

  upvotes: mongoose.Types.ObjectId[];

  upvoteCount: number;

  commentCount: number;

  trendingScore: number;

  isEdited: boolean;
  editedAt?: Date | null;

  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<IPost>(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: [true, "Post title is required"],
      trim: true,
      minlength: [5, "Title must be at least 5 characters"],
      maxlength: [200, "Title cannot exceed 200 characters"],
    },

    description: {
      type: String,
      required: [true, "Post description is required"],
      trim: true,
      minlength: [10, "Description must be at least 10 characters"],
      maxlength: [5000, "Description cannot exceed 5000 characters"],
    },

    images: {
      type: [String],
      default: [],
      validate: {
        validator: (arr: string[]) => arr.length <= 5,
        message: "Cannot attach more than 5 images to a post",
      },
    },

    tags: {
      type: [String],
      default: [],
      set: (tags: string[]) =>
        tags.map((tag) => tag.trim().toLowerCase()),
      validate: {
        validator: (arr: string[]) => arr.length <= 10,
        message: "Cannot add more than 10 tags",
      },
    },

    cropType: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },

    postType: {
      type: String,
      enum: ["discussion", "question", "disease_case", "advice"],
      default: "discussion",
      index: true,
    },

    linkedDetection: {
      type: Schema.Types.ObjectId,
      ref: "Detection",
      default: null,
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
      index: true,
    },

    commentCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    trendingScore: {
      type: Number,
      default: 0,
      index: true,
    },

    isEdited: {
      type: Boolean,
      default: false,
    },

    editedAt: {
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
 * Feed queries
 */
postSchema.index({ isActive: 1, createdAt: -1 });

/**
 * Trending feed
 */
postSchema.index({ isActive: 1, trendingScore: -1 });

/**
 * Tag filtering
 */
postSchema.index({ tags: 1 });

/**
 * Full-text search
 */
postSchema.index(
  {
    title: "text",
    description: "text",
  },
  {
    weights: {
      title: 10,
      description: 3,
    },
  }
);

const Post = mongoose.model<IPost>("Post", postSchema);

export default Post;