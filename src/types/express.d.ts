import { RegisterInput } from "../modules/auth/auth.validation";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;

      validated?: {
        body?: any;
        query?: any;
        params?: any;
      };
    }
  }
}

export {};
