import mongoose, { Schema } from "mongoose";

export type SoilType =
  | "CLAY"
  | "SANDY"
  | "LOAMY"
  | "SILTY"
  | "PEATY"
  | "CHALKY"
  | "OTHER";

export interface IFarm {
  owner: mongoose.Types.ObjectId;
  name: string;
  size: number; // hectares
  soilType: SoilType;
  address: string;
  region: string;

  // GeoJSON Point
  location?: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const farmSchema = new Schema<IFarm>(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Farm owner is required"],
      index: true,
    },

    name: {
      type: String,
      required: [true, "Farm name is required"],
      trim: true,
      minlength: [2, "Farm name must be at least 2 characters"],
      maxlength: [100, "Farm name cannot exceed 100 characters"],
    },

    size: {
      type: Number,
      required: [true, "Farm size is required"],
      min: [0.01, "Farm size must be greater than 0"],
    },

    soilType: {
      type: String,
      enum: [
        "CLAY",
        "SANDY",
        "LOAMY",
        "SILTY",
        "PEATY",
        "CHALKY",
        "OTHER",
      ],
      required: [true, "Soil type is required"],
    },

    address: {
      type: String,
      required: [true, "Farm address is required"],
      trim: true,
      maxlength: [255, "Address cannot exceed 255 characters"],
    },

    region: {
      type: String,
      required: [true, "Region is required"],
      trim: true,
      lowercase: true,
      index: true,
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
      },

      coordinates: {
        type: [Number],

        validate: {
          validator(value: number[]) {
            if (!value || value.length === 0) return true;

            if (value.length !== 2) return false;

            const [longitude, latitude] = value;

            return (
              longitude >= -180 &&
              longitude <= 180 &&
              latitude >= -90 &&
              latitude <= 90
            );
          },
          message:
            "Coordinates must be [longitude, latitude] within valid ranges",
        },
      },
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Common query pattern:
// Farm.find({ owner: userId, isActive: true })
farmSchema.index({
  owner: 1,
  isActive: 1,
});

// Geo queries for future outbreak map
farmSchema.index(
  { location: "2dsphere" },
  { sparse: true }
);

const Farm =
  mongoose.models.Farm ||
  mongoose.model<IFarm>("Farm", farmSchema);

export default Farm;