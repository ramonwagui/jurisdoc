import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, categoriesTable } from "@workspace/db";
import { CreateCategoryBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/categories", async (req, res) => {
  if (!req.isAuthenticated() || !req.appUser) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  const categories = await db
    .select()
    .from(categoriesTable)
    .orderBy(categoriesTable.name);

  res.json(categories);
});

router.post("/categories", async (req, res) => {
  if (!req.isAuthenticated() || !req.appUser) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  if (req.appUser.role !== "admin") {
    res.status(403).json({ error: "Apenas administradores podem criar categorias" });
    return;
  }

  const parsed = CreateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Nome da categoria é obrigatório" });
    return;
  }

  const trimmedName = parsed.data.name.trim();
  if (!trimmedName) {
    res.status(400).json({ error: "Nome da categoria não pode ser vazio" });
    return;
  }

  try {
    const [category] = await db
      .insert(categoriesTable)
      .values({ name: trimmedName })
      .returning();

    res.status(201).json(category);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("unique")) {
      res.status(400).json({ error: "Já existe uma categoria com este nome" });
      return;
    }
    throw err;
  }
});

router.patch("/categories/:id", async (req, res) => {
  if (!req.isAuthenticated() || !req.appUser) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  if (req.appUser.role !== "admin") {
    res.status(403).json({ error: "Apenas administradores podem editar categorias" });
    return;
  }

  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const parsed = CreateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Nome da categoria é obrigatório" });
    return;
  }

  const trimmedName = parsed.data.name.trim();
  if (!trimmedName) {
    res.status(400).json({ error: "Nome da categoria não pode ser vazio" });
    return;
  }

  const [existing] = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.id, id))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Categoria não encontrada" });
    return;
  }

  try {
    const [updated] = await db
      .update(categoriesTable)
      .set({ name: trimmedName })
      .where(eq(categoriesTable.id, id))
      .returning();

    res.json(updated);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("unique")) {
      res.status(400).json({ error: "Já existe uma categoria com este nome" });
      return;
    }
    throw err;
  }
});

router.delete("/categories/:id", async (req, res) => {
  if (!req.isAuthenticated() || !req.appUser) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  if (req.appUser.role !== "admin") {
    res.status(403).json({ error: "Apenas administradores podem excluir categorias" });
    return;
  }

  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [existing] = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.id, id))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Categoria não encontrada" });
    return;
  }

  await db.delete(categoriesTable).where(eq(categoriesTable.id, id));

  res.status(204).end();
});

export default router;
