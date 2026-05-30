import Crop from "../../models/crop.model.js";
import Farm from "../../models/farm.model.js";
import AppError from "../../utils/AppError.js";
import {
  CreateCropInput,
  UpdateCropInput,
} from "./crop.validation.js";

/**
 * Shared ownership guard
 * Ensures farm exists, is active, and belongs to user
 */
const verifyFarmOwnership = async (
  farmId: string,
  ownerId: string
) => {
  const farm = await Farm.findById(farmId);

  if (!farm || !farm.isActive) {
    throw new AppError("Farm not found", 404);
  }

  if (farm.owner.toString() !== ownerId) {
    throw new AppError(
      "You do not have access to this farm",
      403
    );
  }

  return farm;
};

const addCrop = async (
  farmId: string,
  ownerId: string,
  data: CreateCropInput
) => {
  await verifyFarmOwnership(farmId, ownerId);

  return await Crop.create({
    farm: farmId,
    owner: ownerId,
    name: data.name,
    variety: data.variety,
    plantingDate: new Date(data.plantingDate),
    expectedHarvestDate: data.expectedHarvestDate
      ? new Date(data.expectedHarvestDate)
      : undefined,
    notes: data.notes,
  });
};

const getCropsForFarm = async (
  farmId: string,
  ownerId: string
) => {
  await verifyFarmOwnership(farmId, ownerId);

  return await Crop.find({ farm: farmId }).sort({
    plantingDate: -1,
  });
};

const getCropById = async (
  farmId: string,
  cropId: string,
  ownerId: string
) => {
  await verifyFarmOwnership(farmId, ownerId);

  const crop = await Crop.findOne({
    _id: cropId,
    farm: farmId,
  });

  if (!crop) {
    throw new AppError("Crop not found", 404);
  }

  return crop;
};

const updateCrop = async (
  farmId: string,
  cropId: string,
  ownerId: string,
  data: UpdateCropInput
) => {
  await verifyFarmOwnership(farmId, ownerId);

  const updates: Record<string, any> = {
    ...(data.name !== undefined && { name: data.name }),
    ...(data.variety !== undefined && {
      variety: data.variety,
    }),
    ...(data.status !== undefined && { status: data.status }),
    ...(data.notes !== undefined && { notes: data.notes }),
    ...(data.plantingDate !== undefined && {
      plantingDate: new Date(data.plantingDate),
    }),
    ...(data.expectedHarvestDate !== undefined && {
      expectedHarvestDate: new Date(
        data.expectedHarvestDate
      ),
    }),
  };

  const crop = await Crop.findOneAndUpdate(
    { _id: cropId, farm: farmId },
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!crop) {
    throw new AppError("Crop not found", 404);
  }

  return crop;
};

const deleteCrop = async (
  farmId: string,
  cropId: string,
  ownerId: string
) => {
  await verifyFarmOwnership(farmId, ownerId);

  const crop = await Crop.findOneAndDelete({
    _id: cropId,
    farm: farmId,
  });

  if (!crop) {
    throw new AppError("Crop not found", 404);
  }

  return {
    message: "Crop deleted successfully",
    id: cropId,
  };
};

const cropService = {
  addCrop,
  getCropsForFarm,
  getCropById,
  updateCrop,
  deleteCrop,
};

export default cropService;