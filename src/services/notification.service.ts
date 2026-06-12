import mongoose from "mongoose";
import Notification, {
  NotificationType,
  INotification,
} from "../models/notification.model.js";

import { emitToUser } from "../socket/socket.js";
import { SOCKET_EVENTS } from "../socket/socket.events.js";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface CreateNotificationPayload {
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  referenceId?: string;
  referenceModel?: "Detection" | "Consultation" | "Post" | "Comment";
  metadata?: Record<string, unknown>;
}

// ─────────────────────────────────────────────
// CORE SERVICE
// ─────────────────────────────────────────────

export const createNotification = async (
  payload: CreateNotificationPayload
): Promise<INotification> => {
  const notification = await Notification.create({
    recipient: new mongoose.Types.ObjectId(payload.recipientId),
    type: payload.type,
    title: payload.title,
    message: payload.message,
    referenceId: payload.referenceId
      ? new mongoose.Types.ObjectId(payload.referenceId)
      : null,
    referenceModel: payload.referenceModel ?? null,
    metadata: payload.metadata ?? {},
  });

  // run in parallel (don’t block main flow unnecessarily)
  const unreadCountPromise = Notification.countDocuments({
    recipient: payload.recipientId,
    isRead: false,
  });

  const unreadCount = await unreadCountPromise;

  // socket emit should never break DB logic
  try {
    emitToUser(payload.recipientId, SOCKET_EVENTS.NOTIFICATION_NEW, {
      notification,
      unreadCount,
    });
  } catch (err) {
    console.error("Notification socket emit failed:", err);
  }

  return notification;
};

// ─────────────────────────────────────────────
// GET NOTIFICATIONS (PAGINATED)
// ─────────────────────────────────────────────

export const getUserNotifications = async (
  userId: string,
  page = 1,
  limit = 20
) => {
  const skip = (page - 1) * limit;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),

    Notification.countDocuments({ recipient: userId }),

    Notification.countDocuments({ recipient: userId, isRead: false }),
  ]);

  return {
    notifications,
    unreadCount,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ─────────────────────────────────────────────
// UNREAD COUNT ONLY
// ─────────────────────────────────────────────

export const getUnreadCount = async (userId: string): Promise<number> => {
  return Notification.countDocuments({
    recipient: userId,
    isRead: false,
  });
};

// ─────────────────────────────────────────────
// MARK AS READ
// ─────────────────────────────────────────────

export const markAsRead = async (
  notificationId: string,
  userId: string
): Promise<void> => {
  const updated = await Notification.findOneAndUpdate(
    {
      _id: notificationId,
      recipient: userId,
    },
    { isRead: true },
    { new: true }
  );

  if (!updated) return;

  const unreadCount = await getUnreadCount(userId);

  try {
    emitToUser(userId, SOCKET_EVENTS.NOTIFICATION_COUNT, {
      unreadCount,
    });
  } catch (err) {
    console.error("Socket emit failed:", err);
  }
};

// ─────────────────────────────────────────────
// MARK ALL AS READ
// ─────────────────────────────────────────────

export const markAllAsRead = async (userId: string): Promise<void> => {
  await Notification.updateMany(
    { recipient: userId, isRead: false },
    { isRead: true }
  );

  try {
    emitToUser(userId, SOCKET_EVENTS.NOTIFICATION_COUNT, {
      unreadCount: 0,
    });
  } catch (err) {
    console.error("Socket emit failed:", err);
  }
};

// ─────────────────────────────────────────────
// DELETE NOTIFICATION
// ─────────────────────────────────────────────

export const deleteNotification = async (
  notificationId: string,
  userId: string
): Promise<void> => {
  await Notification.findOneAndDelete({
    _id: notificationId,
    recipient: userId,
  });
};

// ─────────────────────────────────────────────
// FACTORY FUNCTIONS (DOMAIN EVENTS)
// ─────────────────────────────────────────────

export const notifyDetectionCompleted = (
  userId: string,
  detectionId: string,
  diseaseName: string
) =>
  createNotification({
    recipientId: userId,
    type: "DETECTION_COMPLETED",
    title: "Analysis Complete",
    message:
      diseaseName === "Healthy"
        ? "Your crop looks healthy! No disease detected."
        : `Disease detected: ${diseaseName}. Tap to view recommendations.`,
    referenceId: detectionId,
    referenceModel: "Detection",
    metadata: { diseaseName },
  });

export const notifyDetectionFailed = (
  userId: string,
  detectionId: string
) =>
  createNotification({
    recipientId: userId,
    type: "DETECTION_FAILED",
    title: "Analysis Failed",
    message: "We could not analyze your image. Please try again.",
    referenceId: detectionId,
    referenceModel: "Detection",
  });

export const notifyConsultationRequest = (
  expertId: string,
  consultationId: string,
  farmerName: string,
  cropType: string
) =>
  createNotification({
    recipientId: expertId,
    type: "CONSULTATION_REQUEST",
    title: "New Consultation Request",
    message: `${farmerName} needs help with ${cropType}.`,
    referenceId: consultationId,
    referenceModel: "Consultation",
    metadata: { farmerName, cropType },
  });

export const notifyConsultationAccepted = (
  farmerId: string,
  consultationId: string,
  expertName: string
) =>
  createNotification({
    recipientId: farmerId,
    type: "CONSULTATION_ACCEPTED",
    title: "Consultation Accepted",
    message: `${expertName} accepted your request.`,
    referenceId: consultationId,
    referenceModel: "Consultation",
    metadata: { expertName },
  });

export const notifyConsultationCompleted = (
  farmerId: string,
  consultationId: string,
  expertName: string
) =>
  createNotification({
    recipientId: farmerId,
    type: "CONSULTATION_COMPLETED",
    title: "Consultation Completed",
    message: `Your consultation with ${expertName} is completed.`,
    referenceId: consultationId,
    referenceModel: "Consultation",
    metadata: { expertName },
  });

export const notifyNewMessage = (
  recipientId: string,
  consultationId: string,
  senderName: string
) =>
  createNotification({
    recipientId,
    type: "NEW_MESSAGE",
    title: "New Message",
    message: `${senderName} sent you a message.`,
    referenceId: consultationId,
    referenceModel: "Consultation",
    metadata: { senderName },
  });

export const notifyNewComment = (
  postAuthorId: string,
  postId: string,
  commenterName: string
) =>
  createNotification({
    recipientId: postAuthorId,
    type: "NEW_COMMENT",
    title: "New Comment",
    message: `${commenterName} commented on your post.`,
    referenceId: postId,
    referenceModel: "Post",
    metadata: { commenterName },
  });

export const notifyPostUpvote = (
  postAuthorId: string,
  postId: string,
  voterName: string
) =>
  createNotification({
    recipientId: postAuthorId,
    type: "POST_UPVOTE",
    title: "Post Upvoted",
    message: `${voterName} upvoted your post.`,
    referenceId: postId,
    referenceModel: "Post",
    metadata: { voterName },
  });

export const notifyExpertApproved = (expertId: string) =>
  createNotification({
    recipientId: expertId,
    type: "EXPERT_APPROVED",
    title: "Account Approved",
    message: "Your expert account has been approved.",
  });

export const notifyDiseaseAlert = (
  userId: string,
  alertId: string,
  diseaseName: string,
  region: string,
  cropType: string
) =>
  createNotification({
    recipientId: userId,
    type: "DISEASE_ALERT",
    title: "Disease Alert",
    message: `${diseaseName} detected in ${region} affecting ${cropType}.`,
    referenceId: alertId,
    metadata: { diseaseName, region, cropType },
  });

// ─────────────────────────────────────────────
// DEFAULT EXPORT (OPTIONAL USAGE)
// ─────────────────────────────────────────────

const notificationService = {
  createNotification,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};

export default notificationService;