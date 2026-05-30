import Farm from "../../models/farm.model.js";
import AppError from "../../utils/AppError.js";
import {
  CreateFarmInput,
  UpdateFarmInput,
} from "./farm.validation.js";

const getOwnedFarm = async (
  farmId: string,
  ownerId: string
) => {
  const farm = await Farm.findById(farmId);

  if (!farm) {
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

const createFarm = async (
  ownerId: string,
  data: CreateFarmInput
) => {
  const farmData = {
    owner: ownerId,
    name: data.name,
    size: data.size,
    soilType: data.soilType,
    address: data.address,
    region: data.region,

    ...(data.location && {
      location: {
        type: "Point" as const,
        coordinates: [
          data.location.longitude,
          data.location.latitude,
        ],
      },
    }),
  };

  return await Farm.create(farmData);
};

const getMyFarms = async (ownerId: string) => {
  return await Farm.find({
    owner: ownerId,
    isActive: true,
  }).sort({
    createdAt: -1,
  });
};

const getFarmById = async (
  farmId: string,
  ownerId: string
) => {
  return await getOwnedFarm(farmId, ownerId);
};

const updateFarm = async (
  farmId: string,
  ownerId: string,
  data: UpdateFarmInput
) => {
  await getOwnedFarm(farmId, ownerId);

  const updates = {
    ...(data.name !== undefined && {
      name: data.name,
    }),

    ...(data.size !== undefined && {
      size: data.size,
    }),

    ...(data.soilType !== undefined && {
      soilType: data.soilType,
    }),

    ...(data.address !== undefined && {
      address: data.address,
    }),

    ...(data.region !== undefined && {
      region: data.region,
    }),

    ...(data.location && {
      location: {
        type: "Point" as const,
        coordinates: [
          data.location.longitude,
          data.location.latitude,
        ],
      },
    }),
  };

  return await Farm.findByIdAndUpdate(
    farmId,
    { $set: updates },
    {
      new: true,
      runValidators: true,
    }
  );
};

const deleteFarm = async (
  farmId: string,
  ownerId: string
) => {
  await getOwnedFarm(farmId, ownerId);

  return await Farm.findByIdAndUpdate(
    farmId,
    {
      isActive: false,
    },
    {
      new: true,
    }
  );
};

const farmService = {
  createFarm,
  getMyFarms,
  getFarmById,
  updateFarm,
  deleteFarm,
};

export default farmService;