import { type Request, type Response, type NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, appUsersTable } from "@workspace/db";
import { clearSession, getSessionId, getSession } from "../lib/auth";

declare global {
  namespace Express {
    interface Request {
      isAuthenticated(): boolean;
      appUser?: typeof appUsersTable.$inferSelect;
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  req.isAuthenticated = function (this: Request) {
    return this.appUser != null;
  };

  const sid = getSessionId(req);
  if (!sid) {
    next();
    return;
  }

  const session = await getSession(sid);
  if (!session?.appUserId) {
    await clearSession(res, sid);
    next();
    return;
  }

  const [appUser] = await db
    .select()
    .from(appUsersTable)
    .where(eq(appUsersTable.id, session.appUserId))
    .limit(1);

  if (!appUser) {
    await clearSession(res, sid);
    next();
    return;
  }

  req.appUser = appUser;
  next();
}
