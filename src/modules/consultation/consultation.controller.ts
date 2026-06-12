import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import consultationService from "./consultation.service.js";
import sendResponse from "../../utils/sendResponse.js";

const createConsultation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const consultation = await consultationService.createConsultation(
      req.user!.id,
      req.body
    );

    sendResponse({
      res,
      statusCode: StatusCodes.CREATED,
      success: true,
      message: "Consultation request sent to expert",
      data: { consultation },
    });
  } catch (error) {
    next(error);
  }
};

const getMyConsultations = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await consultationService.getMyConsultations(
      req.user!.id,
      req.user!.role,
      req.query as any
    );

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Consultations retrieved successfully",
      data: {
        consultations: result.consultations,
      },
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

const getConsultationById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const consultation = await consultationService.getConsultationById(
      req.params.id as string,
      req.user!.id
    );

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Consultation retrieved successfully",
      data: { consultation },
    });
  } catch (error) {
    next(error);
  }
};

const acceptConsultation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const consultation = await consultationService.acceptConsultation(
      req.params.id as string,
      req.user!.id
    );

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Consultation accepted successfully",
      data: { consultation },
    });
  } catch (error) {
    next(error);
  }
};

const rejectConsultation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const consultation = await consultationService.rejectConsultation(
      req.params.id as string,
      req.user!.id
    );

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Consultation rejected successfully",
      data: { consultation },
    });
  } catch (error) {
    next(error);
  }
};

const cancelConsultation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const consultation = await consultationService.cancelConsultation(
      req.params.id as string,
      req.user!.id
    );

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Consultation cancelled successfully",
      data: { consultation },
    });
  } catch (error) {
    next(error);
  }
};

const completeConsultation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const consultation = await consultationService.completeConsultation(
      req.params.id as string, 
      req.user!.id
    );

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Consultation completed successfully",
      data: { consultation },
    });
  } catch (error) {
    next(error);
  }
};

const sendMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const message = await consultationService.sendMessage(
      req.params.id as string,
      req.user!.id,
      req.body,
      req.file
    );

    sendResponse({
      res,
      statusCode: StatusCodes.CREATED,
      success: true,
      message: "Message sent successfully",
      data: { message },
    });
  } catch (error) {
    next(error);
  }
};

const getMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const messages = await consultationService.getMessages(
      req.params.id as string,
      req.user!.id
    );

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Messages retrieved successfully",
      data: { messages },
    });
  } catch (error) {
    next(error);
  }
};

const submitReview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const consultation = await consultationService.submitReview(
      req.params.id as string,
      req.user!.id,
      req.body
    );

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Review submitted successfully",
      data: { consultation },
    });
  } catch (error) {
    next(error);
  }
};

const consultationController = {
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

export default consultationController;