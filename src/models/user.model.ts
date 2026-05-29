import mongoose, {
  HydratedDocument,
  Model,
  Schema,
} from "mongoose";
import bcrypt from "bcryptjs";

export type UserRole = "FARMER" | "EXPERT" | "ADMIN";

// ─────────────────────────────────────────────────────────
// USER INTERFACE
// ─────────────────────────────────────────────────────────

export interface IUser {
  name: string;
  email: string;
  phone?: string;
  password: string;

  avatar?: string | null;
  location?: string;

  role: UserRole;

  isVerified: boolean;
  isActive: boolean;

  // Expert fields
  specializations?: string[];
  bio?: string;
  experience?: number;
  rating?: number;
  consultationCount?: number;

  // Security fields
  refreshToken?: string;
  passwordChangedAt?: Date;
  lastLoginAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────────────────────────────────
// INSTANCE METHODS
// ─────────────────────────────────────────────────────────

export interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// ─────────────────────────────────────────────────────────
// MODEL TYPES
// ─────────────────────────────────────────────────────────

type UserModel = Model<IUser, {}, IUserMethods>;

export type UserDocument = HydratedDocument<IUser, IUserMethods>;

// ─────────────────────────────────────────────────────────
// SCHEMA
// ─────────────────────────────────────────────────────────

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],

      validate: {
        validator: (value: string) => value.trim().length > 0,
        message: "Name cannot be empty",
      },
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,

      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email",
      ],
    },

    phone: {
      type: String,
      trim: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },

    avatar: {
      type: String,
      default: null,
    },

    location: {
      type: String,
      trim: true,
    },

    role: {
      type: String,
      enum: ["FARMER", "EXPERT", "ADMIN"],
      default: "FARMER",
      index: true,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Expert Profile Fields

    specializations: {
      type: [String],
      default: [],
    },

    bio: {
      type: String,
      maxlength: [500, "Bio cannot exceed 500 characters"],
    },

    experience: {
      type: Number,
      min: [0, "Experience cannot be negative"],
    },

    rating: {
      type: Number,
      default: 0,
      min: [0, "Rating cannot be below 0"],
      max: [5, "Rating cannot exceed 5"],
    },

    consultationCount: {
      type: Number,
      default: 0,
      min: [0, "Consultation count cannot be negative"],
    },

    // Security Fields

    refreshToken: {
      type: String,
      select: false,
    },

    passwordChangedAt: {
      type: Date,
    },

    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,

    toJSON: {
      transform: (_, ret: Record<string, unknown>) => {
        delete ret.password;
        delete ret.refreshToken;
        delete ret.__v;

        return ret;
      },
    },

    toObject: {
      transform: (_, ret: Record<string, unknown>) => {
        delete ret.password;
        delete ret.refreshToken;
        delete ret.__v;

        return ret;
      },
    },
  }
);

// ─────────────────────────────────────────────────────────
// INDEXES
// ─────────────────────────────────────────────────────────

userSchema.index({ email: 1 }, { unique: true });

userSchema.index({ role: 1 });

userSchema.index({ isActive: 1 });

// ─────────────────────────────────────────────────────────
// PRE SAVE MIDDLEWARE
// ─────────────────────────────────────────────────────────

userSchema.pre("save", async function (next) {
  // Only hash password if modified

  if (!this.isModified("password")) {
    return next();
  }

  // Hash password

  this.password = await bcrypt.hash(this.password, 12);

  // Update password changed timestamp

  if (!this.isNew) {
    this.passwordChangedAt = new Date();
  }

  next();
});

// ─────────────────────────────────────────────────────────
// INSTANCE METHODS
// ─────────────────────────────────────────────────────────

userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// ─────────────────────────────────────────────────────────
// MODEL
// ─────────────────────────────────────────────────────────

const User = mongoose.model<IUser, UserModel>("User", userSchema);

export default User;

