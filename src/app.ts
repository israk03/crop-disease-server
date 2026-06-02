import express, {
  Application,
  NextFunction,
  Request,
  Response,
} from "express";

import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import compression from "compression";

import { env } from "./config/env.js";
import errorMiddleware from "./middlewares/error.middleware.js";
import authRoutes from "./modules/auth/auth.routes.js";
import AppError from "./utils/AppError.js";
import userRoutes from "./modules/user/user.routes.js";
import farmRoutes from "./modules/farm/farm.routes.js";
import detectionRoutes from "./modules/detection/detection.routes.js";

import forumRoutes from "./modules/forum/forum.routes.js";
import nestedCommentRouter from "./modules/comment/comment.routes.js";
import { commentRouter } from "./modules/comment/comment.routes.js";

const app: Application = express();

// ─────────────────────────────────────────────────────────────
// Security Middleware
// ─────────────────────────────────────────────────────────────

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

app.use(
  cors({
    origin: [env.FRONTEND_URL],
    credentials: true,
  })
);

// ─────────────────────────────────────────────────────────────
// Performance Middleware
// ─────────────────────────────────────────────────────────────

app.use(compression());

// ─────────────────────────────────────────────────────────────
// Logging Middleware
// ─────────────────────────────────────────────────────────────

if (env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ─────────────────────────────────────────────────────────────
// Body Parsing
// ─────────────────────────────────────────────────────────────

app.use(express.json({ limit: "10mb" }));

app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(cookieParser());

// ─────────────────────────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────────────────────────

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    statusCode: 200,
    message: "Crop Disease API is running",
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});


// Mount under /posts — nestedCommentRouter handles /posts/:postId/comments
forumRoutes.use("/:id/comments", nestedCommentRouter);


// ─────────────────────────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────────────────────────

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/farms", farmRoutes);
app.use("/api/v1/detections", detectionRoutes);
app.use("/api/v1/posts", forumRoutes);
app.use("/api/v1/comments", commentRouter);

// ─────────────────────────────────────────────────────────────
// Not Found Route
// ─────────────────────────────────────────────────────────────

app.use( ( _req: Request, _res: Response, next: NextFunction ) => { next( new AppError( "Route not found", 404 ) ); } );

// ─────────────────────────────────────────────────────────────
// Global Error Handler
// ─────────────────────────────────────────────────────────────

app.use(errorMiddleware);

export default app;