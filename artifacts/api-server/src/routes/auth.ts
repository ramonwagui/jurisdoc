import { Router, type IRouter, type Request, type Response } from "express";
import { eq, isNotNull } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, appUsersTable } from "@workspace/db";
import {
  clearSession,
  createSession,
  getSessionId,
  setSessionCookie,
  SESSION_COOKIE,
} from "../lib/auth";
import { z } from "zod";

const router: IRouter = Router();

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const SetupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
});

async function hasAnyPasswordUser(): Promise<boolean> {
  const rows = await db
    .select({ id: appUsersTable.id })
    .from(appUsersTable)
    .where(isNotNull(appUsersTable.passwordHash))
    .limit(1);
  return rows.length > 0;
}

function safeUser(user: typeof appUsersTable.$inferSelect) {
  const { passwordHash: _pw, ...safe } = user;
  return safe;
}

router.get("/auth/user", (req: Request, res: Response) => {
  if (!req.appUser) {
    res.json({ user: null });
    return;
  }
  res.json({ user: safeUser(req.appUser) });
});

router.get("/auth/setup-status", async (_req: Request, res: Response) => {
  const needsSetup = !(await hasAnyPasswordUser());
  res.json({ needsSetup });
});

router.post("/auth/setup", async (req: Request, res: Response) => {
  if (await hasAnyPasswordUser()) {
    res.status(400).json({ error: "Configuração inicial já foi concluída" });
    return;
  }

  const parsed = SetupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Dados inválidos: nome, email e senha (mínimo 6 caracteres) são obrigatórios",
    });
    return;
  }

  const { name, email, password } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 12);

  let admin: typeof appUsersTable.$inferSelect;
  try {
    const [created] = await db
      .insert(appUsersTable)
      .values({ name, email, passwordHash, role: "admin", active: true })
      .returning();
    admin = created;
  } catch {
    res.status(400).json({ error: "Email já está em uso. Utilize outro email para o administrador." });
    return;
  }

  const sid = await createSession({ appUserId: admin.id });
  setSessionCookie(res, sid);
  res.json(safeUser(admin));
});

router.post("/auth/login", async (req: Request, res: Response) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Email e senha são obrigatórios" });
    return;
  }

  const { email, password } = parsed.data;

  const [user] = await db
    .select()
    .from(appUsersTable)
    .where(eq(appUsersTable.email, email))
    .limit(1);

  if (!user || !user.passwordHash) {
    res.status(401).json({ error: "Credenciais inválidas" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Credenciais inválidas" });
    return;
  }

  if (!user.active) {
    res.status(403).json({ error: "Conta desativada. Contate o administrador." });
    return;
  }

  const sid = await createSession({ appUserId: user.id });
  setSessionCookie(res, sid);
  res.json(safeUser(user));
});

router.get("/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  await clearSession(res, sid);
  res.cookie(SESSION_COOKIE, "", { maxAge: 0, path: "/" });
  res.redirect("/login");
});

export default router;
