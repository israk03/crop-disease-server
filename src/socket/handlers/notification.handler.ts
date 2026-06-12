import { Server, Socket } from "socket.io";

import { SOCKET_EVENTS } from "../socket.events.js";

const userRoom = (userId: string) => `user:${userId}`;

export const registerNotificationHandlers = (
  io: Server,
  socket: Socket
): void => {
  const userId = socket.data.userId as string;

  if (!userId) {
    socket.emit(SOCKET_EVENTS.ERROR, {
      message: "Unauthorized socket connection",
    });

    return;
  }

  const roomName = userRoom(userId);

  socket.join(roomName);

  console.log(
    `User ${userId} joined notification room`
  );

  socket.broadcast.emit(
    SOCKET_EVENTS.USER_ONLINE,
    {
      userId,
    }
  );

  socket.on(
    SOCKET_EVENTS.DISCONNECT,
    async () => {
      try {
        const sockets =
          await io.in(roomName).fetchSockets();

        if (sockets.length === 0) {
          socket.broadcast.emit(
            SOCKET_EVENTS.USER_OFFLINE,
            {
              userId,
            }
          );
        }

        console.log(
          `User ${userId} disconnected`
        );
      } catch (error) {
        console.error(
          "Disconnect handler error:",
          error
        );
      }
    }
  );
};