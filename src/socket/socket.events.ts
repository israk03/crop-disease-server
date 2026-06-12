export const SOCKET_EVENTS = {
  /*
   |--------------------------------------------------------------------------
   | Connection
   |--------------------------------------------------------------------------
   */

  DISCONNECT: "disconnect",
  ERROR: "socket:error",
  CHAT_USER_JOINED: "chat:user_joined",
  CHAT_USER_LEFT: "chat:user_left",

  /*
   |--------------------------------------------------------------------------
   | Presence
   |--------------------------------------------------------------------------
   */

  USER_JOIN: "user:join",
  USER_ONLINE: "user:online",
  USER_OFFLINE: "user:offline",

  /*
   |--------------------------------------------------------------------------
   | Consultation Chat
   |--------------------------------------------------------------------------
   */

  CONSULTATION_JOIN: "consultation:join",
  CONSULTATION_LEAVE: "consultation:leave",

  MESSAGE_SEND: "message:send",
  MESSAGE_NEW: "message:new",

  TYPING_START: "typing:start",
  TYPING_STOP: "typing:stop",
  TYPING_UPDATE: "typing:update",

  /*
   |--------------------------------------------------------------------------
   | Notifications
   |--------------------------------------------------------------------------
   */

  NOTIFICATION_JOIN: "notification:join",

  NOTIFICATION_NEW: "notification:new",
  NOTIFICATION_COUNT: "notification:count",

  /*
   |--------------------------------------------------------------------------
   | AI Detection
   |--------------------------------------------------------------------------
   */

  DETECTION_COMPLETED: "detection:completed",
  DETECTION_FAILED: "detection:failed",

  /*
   |--------------------------------------------------------------------------
   | Disease Alerts
   |--------------------------------------------------------------------------
   */

  ALERT_NEW: "alert:new",
} as const;

export type SocketEvent =
  (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];