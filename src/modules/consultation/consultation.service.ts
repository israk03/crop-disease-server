import mongoose from "mongoose";
import Consultation from "../../models/consultation.model.js";
import Message from "../../models/message.model.js";
import User from "../../models/user.model.js";
import AppError from "../../utils/AppError.js";
import { uploadToCloudinary } from "../../services/upload.service.js";
import {
  CreateConsultationInput,
  SendMessageInput,
  ReviewInput,
  ConsultationQueryInput,
} from "./consultation.validation.js";

import {
  CONSULTATION_STATUS,
  ALLOWED_STATUS_TRANSITIONS,
} from "../../constants/consultation.constants.js";

import { SOCKET_EVENTS } from "../../socket/socket.events.js";
import { emitToConsultation } from "../../socket/socket.js";

// ─────────────────────────────────────────────
// Helper: Access control
// ─────────────────────────────────────────────
const verifyConsultationAccess = async (consultationId: string, userId: string) => {
  const consultation = await Consultation.findById(consultationId);
  if (!consultation) throw new AppError("Consultation not found", 404);

  const isFarmer = consultation.farmer.toString() === userId;
  const isExpert = consultation.expert.toString() === userId;

  if (!isFarmer && !isExpert) {
    throw new AppError("Access denied", 403);
  }

  return consultation;
};

// ─────────────────────────────────────────────
// Helper: transition validation
// ─────────────────────────────────────────────
const ensureTransitionAllowed = (current: string, next: string) => {
  const allowed =
    ALLOWED_STATUS_TRANSITIONS[current as keyof typeof ALLOWED_STATUS_TRANSITIONS];

  if (!allowed?.includes(next as never)) {
    throw new AppError(`Invalid transition: ${current} → ${next}`, 400);
  }
};

// ─────────────────────────────────────────────
// Create consultation
// ─────────────────────────────────────────────
const createConsultation = async (farmerId: string, data: CreateConsultationInput) => {
  const expert = await User.findOne({
    _id: data.expertId,
    role: "EXPERT",
    isActive: true,
  });

  if (!expert) throw new AppError("Expert not available", 404);

  const existing = await Consultation.findOne({
    farmer: farmerId,
    expert: data.expertId,
    status: { $in: ["PENDING", "ACCEPTED", "ACTIVE"] },
  });

  if (existing) {
    throw new AppError("Active consultation already exists", 409);
  }

  const consultation = await Consultation.create({
    farmer: farmerId,
    expert: data.expertId,
    problemDescription: data.problemDescription,
    cropType: data.cropType,
    linkedDetection: data.linkedDetection || null,
    scheduledTime: data.scheduledTime ? new Date(data.scheduledTime) : null,
  });

  await consultation.populate([
    { path: "farmer", select: "name avatar location" },
    { path: "expert", select: "name avatar rating specializations" },
  ]);

  return consultation;
};

// ─────────────────────────────────────────────
// Accept consultation
// ─────────────────────────────────────────────
const acceptConsultation = async (consultationId: string, expertId: string) => {
  const consultation = await Consultation.findById(consultationId);
  if (!consultation) throw new AppError("Not found", 404);

  if (consultation.expert.toString() !== expertId) {
    throw new AppError("Unauthorized", 403);
  }

  ensureTransitionAllowed(consultation.status, CONSULTATION_STATUS.ACCEPTED);

  consultation.status = CONSULTATION_STATUS.ACCEPTED;
  consultation.acceptedAt = new Date();
  await consultation.save();

  return consultation;
};

// ─────────────────────────────────────────────
// Reject consultation (expert side)
// ─────────────────────────────────────────────
const rejectConsultation = async (consultationId: string, expertId: string) => {
  const consultation = await Consultation.findById(consultationId);
  if (!consultation) throw new AppError("Not found", 404);

  if (consultation.expert.toString() !== expertId) {
    throw new AppError("Unauthorized", 403);
  }

  ensureTransitionAllowed(consultation.status, CONSULTATION_STATUS.CANCELLED);

  consultation.status = CONSULTATION_STATUS.CANCELLED;
  consultation.cancelledAt = new Date();
  await consultation.save();

  return consultation;
};

// ─────────────────────────────────────────────
// Cancel consultation (farmer side)
// ─────────────────────────────────────────────
const cancelConsultation = async (consultationId: string, farmerId: string) => {
  const consultation = await Consultation.findById(consultationId);
  if (!consultation) throw new AppError("Not found", 404);

  if (consultation.farmer.toString() !== farmerId) {
    throw new AppError("Unauthorized", 403);
  }

  ensureTransitionAllowed(consultation.status, CONSULTATION_STATUS.CANCELLED);

  consultation.status = CONSULTATION_STATUS.CANCELLED;
  consultation.cancelledAt = new Date();
  await consultation.save();

  return consultation;
};

// ─────────────────────────────────────────────
// Complete consultation
// ─────────────────────────────────────────────
const completeConsultation = async (consultationId: string, expertId: string) => {
  const consultation = await Consultation.findById(consultationId);
  if (!consultation) throw new AppError("Not found", 404);

  if (consultation.expert.toString() !== expertId) {
    throw new AppError("Unauthorized", 403);
  }

  ensureTransitionAllowed(consultation.status, CONSULTATION_STATUS.COMPLETED);

  consultation.status = CONSULTATION_STATUS.COMPLETED;
  consultation.completedAt = new Date();
  await consultation.save();

  await User.findByIdAndUpdate(expertId, {
    $inc: { consultationCount: 1 },
  });

  return consultation;
};

// ─────────────────────────────────────────────
// Send message
// ─────────────────────────────────────────────
const sendMessage = async (
  consultationId: string,
  senderId: string,
  data: SendMessageInput,
  file?: Express.Multer.File
) => {
  const consultation = await verifyConsultationAccess(consultationId, senderId);

  const allowed = ["ACCEPTED", "ACTIVE"];
  if (!allowed.includes(consultation.status)) {
    throw new AppError("Chat not available", 400);
  }

  if (consultation.status === CONSULTATION_STATUS.ACCEPTED) {
    consultation.status = CONSULTATION_STATUS.ACTIVE;
    await consultation.save();
  }

  let imageUrl: string | null = null;

  if (data.messageType === "IMAGE") {
    if (!file) throw new AppError("Image file required", 400);

    const upload = await uploadToCloudinary(file.buffer, "chat-attachments");
    imageUrl = upload.url;
  }

  const message = await Message.create({
    consultation: consultationId,
    sender: senderId,
    content: data.content ?? "",
    messageType: data.messageType,
    imageUrl,
  });

  await message.populate("sender", "name avatar role");

  emitToConsultation(consultationId, SOCKET_EVENTS.MESSAGE_NEW, {
    message,
    consultationId,
  });

  return message;
};

// ─────────────────────────────────────────────
// Get messages
// ─────────────────────────────────────────────
const getMessages = async (consultationId: string, userId: string) => {
  await verifyConsultationAccess(consultationId, userId);

  const messages = await Message.find({ consultation: consultationId })
    .sort({ createdAt: 1 })
    .populate("sender", "name avatar role");

  await Message.updateMany(
    {
      consultation: consultationId,
      sender: { $ne: new mongoose.Types.ObjectId(userId) },
      isRead: false,
    },
    { $set: { isRead: true, readAt: new Date() } }
  );

  return messages;
};

// ─────────────────────────────────────────────
// Submit review
// ─────────────────────────────────────────────
const submitReview = async (consultationId: string, farmerId: string, data: ReviewInput) => {
  const consultation = await Consultation.findById(consultationId);
  if (!consultation) throw new AppError("Not found", 404);

  if (consultation.farmer.toString() !== farmerId) {
    throw new AppError("Unauthorized", 403);
  }

  if (consultation.status !== CONSULTATION_STATUS.COMPLETED) {
    throw new AppError("Only completed consultations can be reviewed", 400);
  }

  if (consultation.rating) {
    throw new AppError("Already reviewed", 409);
  }

  consultation.rating = data.rating;
  consultation.review = data.review;
  consultation.reviewedAt = new Date();
  await consultation.save();

  const stats = await Consultation.aggregate([
    {
      $match: {
        expert: consultation.expert,
        rating: { $exists: true, $ne: null },
      },
    },
    {
      $group: {
        _id: "$expert",
        avg: { $avg: "$rating" },
      },
    },
  ]);

  if (stats.length) {
    await User.findByIdAndUpdate(consultation.expert, {
      rating: Math.round(stats[0].avg * 10) / 10,
    });
  }

  return consultation;
};

// ─────────────────────────────────────────────
// Get my consultations
// ─────────────────────────────────────────────
const getMyConsultations = async (
  userId: string,
  userRole: string,
  query: ConsultationQueryInput
) => {
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 10);
  const skip = (page - 1) * limit;

  const roleFilter =
    userRole === "EXPERT"
      ? { expert: userId }
      : { farmer: userId };

  const filter: Record<string, any> = { ...roleFilter };

  if (query.status) {
    filter.status = query.status;
  }

  const [consultations, total] = await Promise.all([
    Consultation.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("farmer", "name avatar location")
      .populate("expert", "name avatar rating specializations"),

    Consultation.countDocuments(filter),
  ]);

  return {
    consultations,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ─────────────────────────────────────────────
// Get consultation by ID
// ─────────────────────────────────────────────
const getConsultationById = async (consultationId: string, userId: string) => {
  const consultation = await verifyConsultationAccess(consultationId, userId);

  await consultation.populate([
    { path: "farmer", select: "name avatar location" },
    {
      path: "expert",
      select: "name avatar rating specializations bio experience",
    },
    {
      path: "linkedDetection",
      select: "cropType imageUrl aiResult status",
    },
  ]);

  return consultation;
};

export default {
  createConsultation,
  acceptConsultation,
  rejectConsultation,
  cancelConsultation,
  completeConsultation,
  sendMessage,
  getMessages,
  submitReview,
  getMyConsultations,
  getConsultationById,
};