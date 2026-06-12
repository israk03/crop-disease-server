import { Server as HTTPServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { SOCKET_EVENTS, SocketEvent } from "./socket.events.js";
import { registerChatHandlers } from "./handlers/chat.handler.js";
import { registerNotificationHandlers } from "./handlers/notification.handler.js";

// Module-level singleton — set once, accessed everywhere via getIO()
let io: Server;

// ── JWT Payload type ──────────────────────────────────────────────────────────

interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

export const userRoom = (userId: string): string =>
  `user:${userId}`;

export const consultationRoom = (
  consultationId: string
): string =>
  `consultation:${consultationId}`;
// ── Setup function — called once from server.ts ───────────────────────────────

export const setupSocket = (httpServer: HTTPServer): Server => {
  if (io) {
    return io;
  }

  io = new Server(httpServer, {
    cors: {
      origin: env.FRONTEND_URL,
      credentials: true,
      methods: ["GET", "POST"],
    },
    // How long to wait for reconnection before giving up
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ── Authentication middleware ───────────────────────────────────────────────
  // Every socket connection must carry a valid JWT.
  // This runs BEFORE the "connection" event — unauthenticated sockets
  // are rejected before they even connect.

  io.use((socket: Socket, next) => {
    try {
      // Client sends token in the handshake auth object:
      // socket = io(URL, { auth: { token: "Bearer xyz..." } })
      const token = socket.handshake.auth?.token as string | undefined;

      if (!token) {
        return next(new Error("Authentication token required"));
      }

      // Strip "Bearer " prefix if present
      const rawToken = token.startsWith("Bearer ")
        ? token.slice(7)
        : token;

      const decoded = jwt.verify(rawToken, env.JWT_ACCESS_SECRET) as JwtPayload;

      // Attach user data to socket — available in all handlers as socket.data
      socket.data = {
        ...socket.data,
        userId: decoded.id,
        email: decoded.email,
        role: decoded.role,
      };

      next(); // Allow connection
    } catch (error) {
      // Invalid or expired token — reject the connection
      next(new Error("Invalid or expired token"));
    }
  });

  // ── Connection handler ──────────────────────────────────────────────────────
  // Runs for every successfully authenticated socket connection

  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId as string;
    const role = socket.data.role as string;

    console.log(
      `🟢 Socket connected — User: ${userId} | Role: ${role} | SocketID: ${socket.id}`
    );



    // Register all event handlers for this socket
    // Each handler file handles one concern (chat vs notifications)
    registerChatHandlers(io, socket);
    registerNotificationHandlers(io, socket);

    // Send confirmation to the connected client
    socket.emit("connected", {
      message: "Connected to real-time server",
      userId,
    });

    // ── Disconnect logging ──────────────────────────────────────────────────
    socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
      console.log(
        `🔴 Socket disconnected — User: ${userId} | Reason: ${reason} | SocketID: ${socket.id}`
      );
    });
  });

  console.log("🔌 Socket.io server initialized");
  return io;
};

// ── Singleton accessor ────────────────────────────────────────────────────────
// Import and call getIO() from anywhere to emit events.
// The detection worker and consultation service already call this.

export const getIO = (): Server => {
  if (!io) {
    throw new Error(
      "Socket.io has not been initialized. Call setupSocket() first."
    );
  }
  return io;
};

// ── Utility emit helpers ──────────────────────────────────────────────────────
// Convenience functions so other services don't need to know room name formats.
// Import these instead of calling getIO() directly in services.

// Emit to a specific user (their personal room)
export const emitToUser = (
  userId: string,
  event: SocketEvent,
  data: unknown
): void => {
  getIO()
    .to(userRoom(userId))
    .emit(event, data);
};

// Emit to a consultation room (both farmer and expert)
export const emitToConsultation = (
  consultationId: string,
  event: SocketEvent,
  data: unknown
): void => {
  getIO()
    .to(consultationRoom(consultationId))
    .emit(event, data);
};

// Emit to all connected users (disease alerts)
export const emitToAll = (
  event: SocketEvent,
  data: unknown
): void => {
  getIO().emit(event, data);
};