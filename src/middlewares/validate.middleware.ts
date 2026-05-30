import { Request, Response, NextFunction } from "express";
import { ZodObject } from "zod";

export type ValidatedRequest<T = any> = Request & {
  validated: T;
};

const validate =
  (schema: ZodObject<any>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    

    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.issues.map((e) => ({
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

    // IMPORTANT FIX
    req.validated = result.data;

    next();
  };

export default validate;