import { type Request, type Response, type NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, appUsersTable } from "@workspace/db";

declare global {
  namespace Express {
    interface Request {
      appUser?: typeof appUsersTable.$inferSelect;
    }
  }
}

export async function appUserMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  if (!req.isAuthenticated()) {
    next();
    return;
  }

  const [existing] = await db
    .select()
    .from(appUsersTable)
    .where(eq(appUsersTable.replitUserId, req.user.id))
    .limit(1);

  if (existing) {
    req.appUser = existing;
    next();
    return;
  }

  const allUsers = await db.select().from(appUsersTable).limit(1);
  const role = allUsers.length === 0 ? ("admin" as const) : ("advogado" as const);

  const [newUser] = await db
    .insert(appUsersTable)
    .values({
      replitUserId: req.user.id,
      name:
        [req.user.firstName, req.user.lastName].filter(Boolean).join(" ") ||
        "Usuário",
      email: req.user.email,
      role,
    })
    .returning();

  req.appUser = newUser;
  next();
}
