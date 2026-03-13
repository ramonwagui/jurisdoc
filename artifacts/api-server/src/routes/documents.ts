import { Router, type IRouter } from "express";
import { eq, sql, desc, count } from "drizzle-orm";
import { db, appUsersTable, documentsTable } from "@workspace/db";
import {
  CreateDocumentBody,
  GetDocumentParams,
  DeleteDocumentParams,
  ListDocumentsQueryParams,
  SearchDocumentsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/documents", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  const parsed = ListDocumentsQueryParams.safeParse(req.query);
  const page = parsed.success ? parsed.data.page ?? 1 : 1;
  const limit = parsed.success ? parsed.data.limit ?? 20 : 20;
  const offset = (page - 1) * limit;

  const [totalResult] = await db.select({ count: count() }).from(documentsTable);
  const total = totalResult?.count ?? 0;

  const documents = await db
    .select({
      id: documentsTable.id,
      uploadedBy: documentsTable.uploadedBy,
      title: documentsTable.title,
      fileName: documentsTable.fileName,
      storagePath: documentsTable.storagePath,
      mimeType: documentsTable.mimeType,
      hasExtractedText: sql<boolean>`length(${documentsTable.extractedText}) > 0`,
      createdAt: documentsTable.createdAt,
      uploaderName: appUsersTable.name,
    })
    .from(documentsTable)
    .leftJoin(appUsersTable, eq(documentsTable.uploadedBy, appUsersTable.id))
    .orderBy(desc(documentsTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({
    documents,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

router.post("/documents", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  const appUser = await db
    .select()
    .from(appUsersTable)
    .where(eq(appUsersTable.replitUserId, req.user.id))
    .limit(1);

  if (appUser.length === 0) {
    res.status(401).json({ error: "Usuário não encontrado no sistema" });
    return;
  }

  const parsed = CreateDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [doc] = await db
    .insert(documentsTable)
    .values({
      uploadedBy: appUser[0].id,
      title: parsed.data.title,
      fileName: parsed.data.fileName,
      storagePath: parsed.data.storagePath,
      mimeType: parsed.data.mimeType,
      extractedText: parsed.data.extractedText || "",
    })
    .returning();

  res.status(201).json(doc);
});

router.get("/documents/search", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  const parsed = SearchDocumentsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Parâmetros inválidos" });
    return;
  }

  const { q, page = 1, limit = 20 } = parsed.data;
  const offset = (page - 1) * limit;

  const tsQuery = sql`plainto_tsquery('portuguese', ${q})`;
  const tsVector = sql`to_tsvector('portuguese', ${documentsTable.title} || ' ' || ${documentsTable.extractedText})`;

  const [totalResult] = await db
    .select({ count: count() })
    .from(documentsTable)
    .where(sql`${tsVector} @@ ${tsQuery}`);

  const total = totalResult?.count ?? 0;

  const results = await db
    .select({
      id: documentsTable.id,
      title: documentsTable.title,
      fileName: documentsTable.fileName,
      snippet: sql<string>`ts_headline('portuguese', ${documentsTable.extractedText}, ${tsQuery}, 'MaxWords=50, MinWords=20, StartSel=<mark>, StopSel=</mark>')`,
      rank: sql<number>`ts_rank(${tsVector}, ${tsQuery})`,
      createdAt: documentsTable.createdAt,
      uploaderName: appUsersTable.name,
    })
    .from(documentsTable)
    .leftJoin(appUsersTable, eq(documentsTable.uploadedBy, appUsersTable.id))
    .where(sql`${tsVector} @@ ${tsQuery}`)
    .orderBy(sql`ts_rank(${tsVector}, ${tsQuery}) DESC`)
    .limit(limit)
    .offset(offset);

  res.json({
    results,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    query: q,
  });
});

router.get("/documents/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  const params = GetDocumentParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [doc] = await db
    .select({
      id: documentsTable.id,
      uploadedBy: documentsTable.uploadedBy,
      title: documentsTable.title,
      fileName: documentsTable.fileName,
      storagePath: documentsTable.storagePath,
      mimeType: documentsTable.mimeType,
      hasExtractedText: sql<boolean>`length(${documentsTable.extractedText}) > 0`,
      createdAt: documentsTable.createdAt,
      uploaderName: appUsersTable.name,
    })
    .from(documentsTable)
    .leftJoin(appUsersTable, eq(documentsTable.uploadedBy, appUsersTable.id))
    .where(eq(documentsTable.id, params.data.id))
    .limit(1);

  if (!doc) {
    res.status(404).json({ error: "Documento não encontrado" });
    return;
  }

  res.json(doc);
});

router.delete("/documents/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  const params = DeleteDocumentParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [deleted] = await db
    .delete(documentsTable)
    .where(eq(documentsTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Documento não encontrado" });
    return;
  }

  res.status(204).end();
});

export default router;
