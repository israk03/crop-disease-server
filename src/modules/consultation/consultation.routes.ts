import { Router } from "express";
import consultationController from "./consultation.controller.js";
import {
  protect,
  authorize,
} from "../../middlewares/auth.middleware.js";
import validate from "../../middlewares/validate.middleware.js";
import { uploadSingleImage } from "../../middlewares/upload.middleware.js";

import {
  createConsultationSchema,
  sendMessageSchema,
  reviewSchema,
  consultationQuerySchema,
} from "./consultation.validation.js";

const router = Router();

/*
|--------------------------------------------------------------------------
| Protected Routes
|--------------------------------------------------------------------------
*/

router.use(protect);

/*
|--------------------------------------------------------------------------
| Consultation Management
|--------------------------------------------------------------------------
*/

router.post(
  "/",
  authorize("FARMER"),
  validate(createConsultationSchema),
  consultationController.createConsultation
);

router.get(
  "/",
  authorize("FARMER", "EXPERT"),
  validate(consultationQuerySchema),
  consultationController.getMyConsultations
);

router.get(
  "/:id",
  authorize("FARMER", "EXPERT"),
  consultationController.getConsultationById
);

/*
|--------------------------------------------------------------------------
| Consultation State Transitions
|--------------------------------------------------------------------------
*/

router.patch(
  "/:id/accept",
  authorize("EXPERT"),
  consultationController.acceptConsultation
);

router.patch(
  "/:id/reject",
  authorize("EXPERT"),
  consultationController.rejectConsultation
);

router.patch(
  "/:id/cancel",
  authorize("FARMER"),
  consultationController.cancelConsultation
);

router.patch(
  "/:id/complete",
  authorize("EXPERT"),
  consultationController.completeConsultation
);

/*
|--------------------------------------------------------------------------
| Consultation Chat
|--------------------------------------------------------------------------
*/

router.post(
  "/:id/messages",
  authorize("FARMER", "EXPERT"),
  uploadSingleImage("image"),
  validate(sendMessageSchema),
  consultationController.sendMessage
);

router.get(
  "/:id/messages",
  authorize("FARMER", "EXPERT"),
  consultationController.getMessages
);

/*
|--------------------------------------------------------------------------
| Reviews
|--------------------------------------------------------------------------
*/

router.post(
  "/:id/review",
  authorize("FARMER"),
  validate(reviewSchema),
  consultationController.submitReview
);

export default router;