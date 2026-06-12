import mongoose from "mongoose";
import { Server, Socket } from "socket.io";

import Consultation from "../../models/consultation.model.js";
import { SOCKET_EVENTS } from "../socket.events.js";

const consultationRoom = (consultationId: string) =>
  `consultation:${consultationId}`;

export const registerChatHandlers = (
  io: Server,
  socket: Socket
): void => {
  const userId = socket.data.userId as string;

  socket.on(
    SOCKET_EVENTS.CONSULTATION_JOIN,
    async (consultationId: string) => {
      try {
        if (!mongoose.Types.ObjectId.isValid(consultationId)) {
          socket.emit(SOCKET_EVENTS.ERROR, {
            message: "Invalid consultation id",
          });
          return;
        }

        const consultation =
          await Consultation.findById(consultationId);

        if (!consultation) {
          socket.emit(SOCKET_EVENTS.ERROR, {
            message: "Consultation not found",
          });
          return;
        }

        const isFarmer =
          consultation.farmer.toString() === userId;

        const isExpert =
          consultation.expert.toString() === userId;

        if (!isFarmer && !isExpert) {
          socket.emit(SOCKET_EVENTS.ERROR, {
            message:
              "You are not part of this consultation",
          });
          return;
        }

        if (
          !["ACCEPTED", "ACTIVE"].includes(
            consultation.status
          )
        ) {
          socket.emit(SOCKET_EVENTS.ERROR, {
            message:
              "Chat is unavailable for this consultation",
          });
          return;
        }

        const roomName =
          consultationRoom(consultationId);

        await socket.join(roomName);

        socket.to(roomName).emit(
          SOCKET_EVENTS.CHAT_USER_JOINED,
          {
            userId,
            consultationId,
          }
        );

        console.log(
          `User ${userId} joined ${roomName}`
        );
      } catch (error) {
        console.error(error);

        socket.emit(SOCKET_EVENTS.ERROR, {
          message: "Failed to join consultation",
        });
      }
    }
  );

  socket.on(
    SOCKET_EVENTS.CONSULTATION_LEAVE,
    async (consultationId: string) => {
      const roomName =
        consultationRoom(consultationId);

      await socket.leave(roomName);

      socket.to(roomName).emit(
        SOCKET_EVENTS.CHAT_USER_LEFT,
        {
          userId,
          consultationId,
        }
      );
    }
  );

  socket.on(
    SOCKET_EVENTS.TYPING_START,
    (consultationId: string) => {
      socket
        .to(consultationRoom(consultationId))
        .emit(SOCKET_EVENTS.TYPING_UPDATE, {
          userId,
          consultationId,
          isTyping: true,
        });
    }
  );

  socket.on(
    SOCKET_EVENTS.TYPING_STOP,
    (consultationId: string) => {
      socket
        .to(consultationRoom(consultationId))
        .emit(SOCKET_EVENTS.TYPING_UPDATE, {
          userId,
          consultationId,
          isTyping: false,
        });
    }
  );
};