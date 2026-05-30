import mongoose, { Document, Schema } from "mongoose";

export type CropStatus = "GROWING" | "HARVESTED" | "FAILED";

export interface ICrop extends Document {
  _id: mongoose.Types.ObjectId;
  farm: mongoose.Types.ObjectId;
  owner: mongoose.Types.ObjectId;

  name: string;
  variety?: string;

  plantingDate: Date;
  expectedHarvestDate?: Date;

  status: CropStatus;
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

const cropSchema = new Schema<ICrop>(
  {
    farm: {
      type: Schema.Types.ObjectId,
      ref: "Farm",
      required: [true, "Farm reference is required"],
      index: true,
    },

    // Denormalized owner for faster user-level crop queries
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Crop owner is required"],
      index: true,
    },

    name: {
      type: String,
      required: [true, "Crop name is required"],
      trim: true,
      lowercase: true,
      minlength: [2, "Crop name must be at least 2 characters"],
      maxlength: [100, "Crop name cannot exceed 100 characters"],
    },

    variety: {
      type: String,
      trim: true,
      maxlength: [100, "Variety cannot exceed 100 characters"],
    },

    plantingDate: {
      type: Date,
      required: [true, "Planting date is required"],
    },

    expectedHarvestDate: {
      type: Date,

      validate: {
        validator(this: ICrop, value: Date) {
          if (!value) return true;

          return value > this.plantingDate;
        },
        message:
          "Expected harvest date must be later than planting date",
      },
    },

    status: {
      type: String,
      enum: ["GROWING", "HARVESTED", "FAILED"],
      default: "GROWING",
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },
  },
  {
    timestamps: true,
  }
);

// Farm crops sorted by latest planting date
cropSchema.index({
  farm: 1,
  plantingDate: -1,
});

// Common dashboard query:
// Crop.find({ owner, status })
cropSchema.index({
  owner: 1,
  status: 1,
});

const Crop =
  mongoose.models.Crop ||
  mongoose.model<ICrop>("Crop", cropSchema);

export default Crop;