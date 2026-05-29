import { UserRole } from "../../models/user.model";

declare global {
  namespace Express {
    interface UserPayload {
      id: string;
      email: string;
      role: UserRole;
    }

    interface Request {
      user: UserPayload;
      validated?: {
        body?: any;
        query?: any;
        params?: any;
      };
    }
  }
}

export {};
