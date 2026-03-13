import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, appUsersTable } from "@workspace/db";
import { z } from "zod";

const router: IRouter = Router();

const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["admin", "advogado"]).default("advogado"),
});

const UpdateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["admin", "advogado"]).optional(),
  active: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

router.get("/users/me", async (req, res) => {
  if (!req.isAuthenticated() || !req.appUser) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  const { passwordHash: _pw, ...safeUser } = req.appUser;
  res.json(safeUser);
});

router.get("/users", async (req, res) => {
  if (!req.isAuthenticated() || !req.appUser) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  if (req.appUser.role !== "admin") {
    res.status(403).json({ error: "Acesso negado" });
    return;
  }

  const users = await db.select({
    id: appUsersTable.id,
    name: appUsersTable.name,
    email: appUsersTable.email,
    role: appUsersTable.role,
    active: appUsersTable.active,
    createdAt: appUsersTable.createdAt,
  }).from(appUsersTable);

  res.json(users);
});

router.post("/users", async (req, res) => {
  if (!req.isAuthenticated() || !req.appUser) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  if (req.appUser.role !== "admin") {
    res.status(403).json({ error: "Acesso negado" });
    return;
  }

  const parsed = CreateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados inválidos: nome, email, senha e papel são obrigatórios" });
    return;
  }

  const { name, email, password, role } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 12);

  let newUser;
  try {
    const [created] = await db
      .insert(appUsersTable)
      .values({ name, email, passwordHash, role })
      .returning();
    newUser = created;
  } catch {
    res.status(400).json({ error: "Email já está em uso por outro usuário" });
    return;
  }

  const { passwordHash: _pw, ...safeUser } = newUser;
  res.status(201).json(safeUser);
});

router.patch("/users/:id", async (req, res) => {
  if (!req.isAuthenticated() || !req.appUser) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  if (req.appUser.role !== "admin") {
    res.status(403).json({ error: "Acesso negado" });
    return;
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const parsed = UpdateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados inválidos" });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.role !== undefined) updateData.role = parsed.data.role;
  if (parsed.data.active !== undefined) updateData.active = parsed.data.active;
  if (parsed.data.password !== undefined) {
    updateData.passwordHash = await bcrypt.hash(parsed.data.password, 12);
  }

  const [updated] = await db
    .update(appUsersTable)
    .set(updateData)
    .where(eq(appUsersTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }

  const { passwordHash: _pw, ...safeUser } = updated;
  res.json(safeUser);
});

export default router;
