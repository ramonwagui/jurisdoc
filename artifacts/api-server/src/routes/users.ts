import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, appUsersTable } from "@workspace/db";
import {
  CreateUserBody,
  UpdateUserBody,
  UpdateUserParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/users/me", async (req, res) => {
  if (!req.isAuthenticated() || !req.appUser) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  res.json(req.appUser);
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

  const users = await db.select().from(appUsersTable);
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

  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [newUser] = await db
    .insert(appUsersTable)
    .values({
      replitUserId: parsed.data.replitUserId,
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
    })
    .returning();

  res.status(201).json(newUser);
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

  const params = UpdateUserParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const body = UpdateUserBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (body.data.name !== undefined) updateData.name = body.data.name;
  if (body.data.role !== undefined) updateData.role = body.data.role;
  if (body.data.active !== undefined) updateData.active = body.data.active;

  const [updated] = await db
    .update(appUsersTable)
    .set(updateData)
    .where(eq(appUsersTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }

  res.json(updated);
});

export default router;
