import { UserRole } from "../modules/user/user.interface.js";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;

  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};