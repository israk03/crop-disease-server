

import { Request, Response, NextFunction } from "express";

const parseForumFormData = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.body.tags && typeof req.body.tags === "string") {
    try {
      req.body.tags = JSON.parse(req.body.tags);
    } catch {
      req.body.tags = [];
    }
  }

  next();
};

export default parseForumFormData;