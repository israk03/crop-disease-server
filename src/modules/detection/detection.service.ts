import Detection from "../../models/detection.model.js";
import AppError from "../../utils/AppError.js";

import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../../services/upload.service.js";

import { detectionQueue } from "../../queues/detection.queue.js";

import {
  CreateDetectionInput,
  DetectionQueryInput,
} from "./detection.validation.js";

const assertOwnership = (
  resourceOwnerId: string,
  currentUserId: string
) => {
  if (resourceOwnerId !== currentUserId) {
    throw new AppError(
      "You do not have access to this resource",
      403
    );
  }
};

const createDetection = async (
  ownerId: string,
  data: CreateDetectionInput,
  fileBuffer: Buffer
) => {
  if (!fileBuffer || fileBuffer.length === 0) {
    throw new AppError(
      "Crop image is required",
      400
    );
  }

  const {
    url: imageUrl,
    publicId: imagePublicId,
  } = await uploadToCloudinary(
    fileBuffer,
    "crop-images",
    {
      quality: 90,
    }
  );

  try {
    const detection = await Detection.create({
      owner: ownerId,

      cropType: data.cropType,

      imageUrl,
      imagePublicId,

      status: "PENDING",

      farm: data.farmId ?? null,

      crop: data.cropId ?? null,
    });

    await detectionQueue.add(
      "analyze-crop",
      {
        detectionId:
          detection._id.toString(),

        imageUrl,

        cropType: data.cropType,

        ownerId,
      }
    );

    return detection;
  } catch (error) {
    await deleteFromCloudinary(
      imagePublicId
    ).catch(() => null);

    throw error;
  }
};

const getMyDetections = async (
  ownerId: string,
  query: DetectionQueryInput
) => {
  const { status, page, limit } =
    query;

  const skip = (page - 1) * limit;

  const filter: {
    owner: string;
    status?: string;
  } = {
    owner: ownerId,
  };

  if (status) {
    filter.status = status;
  }

  const [detections, total] =
    await Promise.all([
      Detection.find(filter)
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .select("-imagePublicId"),

      Detection.countDocuments(filter),
    ]);

  return {
    detections,

    meta: {
      total,

      page,

      limit,

      totalPages:
        Math.ceil(total / limit),
    },
  };
};

const getDetectionById = async (
  detectionId: string,
  ownerId: string
) => {
  const detection =
    await Detection.findById(
      detectionId
    ).select("-imagePublicId");

  if (!detection) {
    throw new AppError(
      "Detection not found",
      404
    );
  }

  assertOwnership(
    detection.owner.toString(),
    ownerId
  );

  return detection;
};

const deleteDetection = async (
  detectionId: string,
  ownerId: string
) => {
  const detection =
    await Detection.findById(
      detectionId
    );

  if (!detection) {
    throw new AppError(
      "Detection not found",
      404
    );
  }

  assertOwnership(
    detection.owner.toString(),
    ownerId
  );

  await deleteFromCloudinary(
    detection.imagePublicId
  );

  await Detection.findByIdAndDelete(
    detectionId
  );

  return null;
};

const toggleSharing = async (
  detectionId: string,
  ownerId: string
) => {
  const detection =
    await Detection.findById(
      detectionId
    );

  if (!detection) {
    throw new AppError(
      "Detection not found",
      404
    );
  }

  assertOwnership(
    detection.owner.toString(),
    ownerId
  );

  if (
    detection.status !== "COMPLETED"
  ) {
    throw new AppError(
      "Only completed detections can be shared",
      400
    );
  }

  detection.isShared =
    !detection.isShared;

  await detection.save();

  return detection;
};

const detectionService = {
  createDetection,

  getMyDetections,

  getDetectionById,

  deleteDetection,

  toggleSharing,
};

export default detectionService;