declare global {
  namespace Express {
    interface Request {
      auth?: { userId: number; role: string; businessId: number };
    }
  }
}
export {};
