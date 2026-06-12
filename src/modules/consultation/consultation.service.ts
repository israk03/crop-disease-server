import mongoose from "mongoose";
import Consultation from "../../models/consultation.model.js";
import Message from "../../models/message.model.js";
import User from "../../models/user.model.js";
import AppError from "../../utils/AppError.js";
import {
  uploadToCloudinary,
} from "../../services/upload.service.js";
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

// ── Helper: verify consultation access ───────────────────────────────────────
// Both farmer and expert involved in the consultation can access it.
// Nobody else can — not even admins in the chat (they use admin panel).

const verifyConsultationAccess = async (
  consultationId: string,
  userId: string
) => {
  const consultation = await Consultation.findById(consultationId);
  if (!consultation) throw new AppError("Consultation not found", 404);

  const isFarmer = consultation.farmer.toString() === userId;
  const isExpert = consultation.expert.toString() === userId;

  if (!isFarmer && !isExpert) {
    throw new AppError("You do not have access to this consultation", 403);
  }

  return { consultation, isFarmer, isExpert };
};

// ── Helper: ensure status transition is allowed ───────────────────────────────

const ensureTransitionAllowed = (
  currentStatus: string,
  nextStatus: string
) => {
  const allowed =
    ALLOWED_STATUS_TRANSITIONS[
      currentStatus as keyof typeof ALLOWED_STATUS_TRANSITIONS
    ];

  if (!allowed.includes(nextStatus as never)) {
    throw new AppError(
      `Invalid consultation transition: ${currentStatus} → ${nextStatus}`,
      400
    );
  }
};

// ── Create consultation request ───────────────────────────────────────────────

const createConsultation = async (
  farmerId: string,
  data: CreateConsultationInput
) => {
  // Verify the target expert actually exists and is an EXPERT role
  const expert = await User.findOne({
    _id: data.expertId,
    role: "EXPERT",
    isActive: true,
  });

  if (!expert) {
    throw new AppError("Expert not found or is not available", 404);
  }

  // Prevent farmers from having multiple active requests to the same expert
  const existingActive = await Consultation.findOne({
    farmer: farmerId,
    expert: data.expertId,
    status: { $in: ["PENDING", "ACCEPTED", "ACTIVE"] },
  });

  if (existingActive) {
    throw new AppError(
      "You already have an active consultation with this expert",
      409
    );
  }

  const consultation = await Consultation.create({
    farmer: farmerId,
    expert: data.expertId,
    problemDescription: data.problemDescription,
    cropType: data.cropType,
    linkedDetection: data.linkedDetection || null,
    scheduledTime: data.scheduledTime
      ? new Date(data.scheduledTime)
      : null,
  });

  // Populate both parties for the response
  await consultation.populate([
    { path: "farmer", select: "name avatar location" },
    { path: "expert", select: "name avatar specializations rating" },
  ]);

  // TODO Phase 10: Send notification to expert
  // notificationService.create(expert._id, 'CONSULTATION_REQUEST', consultation._id)

  return consultation;
};

// ── Get consultations (for both farmer and expert) ────────────────────────────

const getMyConsultations = async (
  userId: string,
  userRole: string,
  query: ConsultationQueryInput
) => {
  const { status, page, limit } = query;
  const skip = (page - 1) * limit;

  // Filter by the correct role field
  const roleFilter =
    userRole === "EXPERT" ? { expert: userId } : { farmer: userId };

  const filter: Record<string, any> = { ...roleFilter };
  if (status) filter.status = status;

  const [consultations, total] = await Promise.all([
    Consultation.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("farmer", "name avatar location")
      .populate("expert", "name avatar specializations rating")
      .populate("linkedDetection", "cropType imageUrl aiResult.diseaseName"),
    Consultation.countDocuments(filter),
  ]);

  return {
    consultations,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

// ── Get single consultation ───────────────────────────────────────────────────

const getConsultationById = async (
  consultationId: string,
  userId: string
) => {
  const { consultation } = await verifyConsultationAccess(
    consultationId,
    userId
  );

  await consultation.populate([
    { path: "farmer", select: "name avatar location" },
    {
      path: "expert",
      select: "name avatar specializations rating bio experience",
    },
    {
      path: "linkedDetection",
      select: "cropType imageUrl aiResult status",
    },
  ]);

  return consultation;
};

// ── Accept consultation ───────────────────────────────────────────────────────

const acceptConsultation = async (
  consultationId: string,
  expertId: string
) => {
  const consultation = await Consultation.findById(consultationId);
  if (!consultation) throw new AppError("Consultation not found", 404);

  // Only the assigned expert can accept
  if (consultation.expert.toString() !== expertId) {
    throw new AppError("You are not assigned to this consultation", 403);
  }

  ensureTransitionAllowed(
    consultation.status,
    CONSULTATION_STATUS.ACCEPTED
  );

  consultation.status = CONSULTATION_STATUS.ACCEPTED;
  consultation.acceptedAt = new Date();
  await consultation.save();

  // TODO Phase 10: notify farmer
  return consultation;
};

// ── Reject consultation ───────────────────────────────────────────────────────

const rejectConsultation = async (
  consultationId: string,
  expertId: string
) => {
  const consultation = await Consultation.findById(consultationId);

  if (!consultation) {
    throw new AppError("Consultation not found", 404);
  }

  if (consultation.expert.toString() !== expertId) {
    throw new AppError("You are not assigned to this consultation", 403);
  }

  ensureTransitionAllowed(
    consultation.status,
    CONSULTATION_STATUS.CANCELLED
  );

  consultation.status = CONSULTATION_STATUS.CANCELLED;
  consultation.cancelledAt = new Date();
  await consultation.save();

  return consultation;
};

// ── Cancel consultation ───────────────────────────────────────────────────────

const cancelConsultation = async (
  consultationId: string,
  farmerId: string
) => {
  const consultation = await Consultation.findById(consultationId);
  if (!consultation) throw new AppError("Consultation not found", 404);

  if (consultation.farmer.toString() !== farmerId) {
    throw new AppError("Only the farmer can cancel this consultation", 403);
  }

  ensureTransitionAllowed(
    consultation.status,
    CONSULTATION_STATUS.CANCELLED
  );

  consultation.status = CONSULTATION_STATUS.CANCELLED;
  consultation.cancelledAt = new Date();
  await consultation.save();

  return consultation;
};

// ── Complete consultation ─────────────────────────────────────────────────────

const completeConsultation = async (
  consultationId: string,
  expertId: string
) => {
  const consultation = await Consultation.findById(consultationId);
  if (!consultation) throw new AppError("Consultation not found", 404);

  if (consultation.expert.toString() !== expertId) {
    throw new AppError("Only the assigned expert can complete this consultation", 403);
  }

  ensureTransitionAllowed(
    consultation.status,
    CONSULTATION_STATUS.COMPLETED
  );

  consultation.status = CONSULTATION_STATUS.COMPLETED;
  consultation.completedAt = new Date();
  await consultation.save();

  // Update expert's consultation count
  await User.findByIdAndUpdate(expertId, {
    $inc: { consultationCount: 1 },
  });

  // TODO Phase 10: notify farmer consultation is complete
  return consultation;
};

// ── Send message ──────────────────────────────────────────────────────────────

const sendMessage = async (
  consultationId: string,
  senderId: string,
  data: SendMessageInput,
  file?: Express.Multer.File
) => {
  const { consultation } = await verifyConsultationAccess(
    consultationId,
    senderId
  );

  // Can only chat in ACCEPTED or ACTIVE consultations
  const chattableStatuses = ["ACCEPTED", "ACTIVE"];
  if (!chattableStatuses.includes(consultation.status)) {
    throw new AppError(
      "Chat is only available for active consultations",
      400
    );
  }

  // Auto-transition ACCEPTED → ACTIVE on first message
  // First message means both parties are now engaged
  if (consultation.status === CONSULTATION_STATUS.ACCEPTED) {
    consultation.status = CONSULTATION_STATUS.ACTIVE;
    await consultation.save();
  }

  let imageUrl: string | undefined;
  let content = data.content;

  // Handle image message
  if (data.messageType === "IMAGE" && file) {
    const uploadResult = await uploadToCloudinary(
      file.buffer,
      "chat-attachments",
      { quality: 85 }
    );
    imageUrl = uploadResult.url;
  }

  const message = await Message.create({
    consultation: consultationId,
    sender: senderId,
    content: content || "",
    messageType: data.messageType,
    imageUrl: imageUrl || null,
  });

  await message.populate("sender", "name avatar role");

  // Emit real-time message via Socket.io
  // Guarded with try/catch — Phase 9 activates this
//   try {
//     const { getIO } = await import("../../socket/socket.js");
//     const io = getIO();

//     // Emit to the consultation room
//     // Both farmer and expert join this room in Phase 9
//     io.to(`consultation:${consultationId}`).emit("message:new", {
//       message,
//       consultationId,
//     });
//   } catch {
//     // Socket.io not yet initialized — skip for now
//   }

  return message;
};

// ── Get message history ───────────────────────────────────────────────────────

const getMessages = async (
  consultationId: string,
  userId: string
) => {
  await verifyConsultationAccess(consultationId, userId);

  const messages = await Message.find({ consultation: consultationId })
    .sort({ createdAt: 1 }) // Oldest first — correct chat order
    .populate("sender", "name avatar role");

  // Mark all messages as read for this user
  // The other party's unread messages get marked when they open the chat
  await Message.updateMany(
    {
      consultation: consultationId,
      sender: { $ne: new mongoose.Types.ObjectId(userId) }, // Not sent by me
      isRead: false,
    },
    {
      $set: {
        isRead: true,
        readAt: new Date(),
      },
    }
  );

  return messages;
};

// ── Submit review ─────────────────────────────────────────────────────────────

const submitReview = async (
  consultationId: string,
  farmerId: string,
  data: ReviewInput
) => {
  const consultation = await Consultation.findById(consultationId);
  if (!consultation) throw new AppError("Consultation not found", 404);

  if (consultation.farmer.toString() !== farmerId) {
    throw new AppError("Only the farmer can review this consultation", 403);
  }

  if (consultation.status !== CONSULTATION_STATUS.COMPLETED) {
    throw new AppError("Can only review completed consultations", 400);
  }

  if (consultation.rating) {
    throw new AppError("You have already reviewed this consultation", 409);
  }

  // Save review on consultation
  consultation.rating = data.rating;
  consultation.review = data.review;
  consultation.reviewedAt = new Date();
  await consultation.save();

  // Recalculate expert's average rating using MongoDB aggregation
  const ratingStats = await Consultation.aggregate([
    {
      $match: {
        expert: consultation.expert,
        rating: { $exists: true, $ne: null },
      },
    },
    {
      $group: {
        _id: "$expert",
        averageRating: { $avg: "$rating" },
      },
    },
  ]);

  // Update expert's rating field
  if (ratingStats.length > 0) {
    await User.findByIdAndUpdate(consultation.expert, {
      rating: Math.round(ratingStats[0].averageRating * 10) / 10, // Round to 1dp
    });
  }

  return consultation;
};

const consultationService = {
  createConsultation,
  getMyConsultations,
  getConsultationById,
  acceptConsultation,
  rejectConsultation,
  cancelConsultation,
  completeConsultation,
  sendMessage,
  getMessages,
  submitReview,
};

export default consultationService;