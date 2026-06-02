import { Request, Response, NextFunction } from "express";
import { ZodObject } from "zod";

export type ValidatedRequest<T = any> = Request & {
  validated: T;
};

type ValidationTarget =
  | "body"
  | "params"
  | "query";

const validate =
  (
    schema: ZodObject<any>,
    target: ValidationTarget = "body"
  ) =>
  (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    const data =
      target === "body"
        ? req.body
        : target === "params"
        ? req.params
        : req.query;

    const result = schema.safeParse(data);

    if (!result.success) {
      const errors =
        result.error.issues.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }));

      res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Validation failed",
        errors,
      });

      return;
    }

    req.validated = result.data;

    next();
  };

export default validate;