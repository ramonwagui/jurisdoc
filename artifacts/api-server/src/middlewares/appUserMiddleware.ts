import { type Request, type Response, type NextFunction } from "express";

export async function appUserMiddleware(
  _req: Request,
  _res: Response,
  next: NextFunction,
) {
  next();
}
