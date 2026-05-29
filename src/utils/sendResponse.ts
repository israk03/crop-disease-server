import { Response } from "express";

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface SendResponseOptions<T> {
  res: Response;
  statusCode: number;
  success: boolean;
  message: string;
  data?: T;
  meta?: PaginationMeta;
}

const sendResponse = <T>({
  res,
  statusCode,
  success,
  message,
  data,
  meta,
}: SendResponseOptions<T>) => {
  return res.status(statusCode).json({
    success,
    statusCode,
    message,
    ...(meta && { meta }),
    ...(data !== undefined && { data }),
    timestamp: new Date().toISOString(),
  });
};

export default sendResponse;