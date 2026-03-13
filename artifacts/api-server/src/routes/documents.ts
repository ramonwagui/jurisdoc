import { Router, type IRouter } from "express";
import { eq, sql, desc, count } from "drizzle-orm";
import { db, appUsersTable, documentsTable, categoriesTable } from "@workspace/db";
import {
  GetDocumentParams,
  DeleteDocumentParams,
  ListDocumentsQueryParams,
  SearchDocumentsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/documents", async (req, res) => {
  if (!req.isAuthenticated() || !req.appUser) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  const parsed = ListDocumentsQueryParams.safeParse(req.query);
  const page = parsed.success ? parsed.data.page ?? 1 : 1;
  const limit = parsed.success ? parsed.data.limit ?? 20 : 20;
  const categoryId = parsed.success ? parsed.data.categoryId : undefined;
  const offset = (page - 1) * limit;

  const whereConditions = categoryId !== undefined ? eq(documentsTable.categoryId, categoryId) : undefined;

  const [totalResult] = await db
    .select({ count: count() })
    .from(documentsTable)
    .where(whereConditions);
  const total = totalResult?.count ?? 0;

  const documents = await db
    .select({
      id: documentsTable.id,
      uploadedBy: documentsTable.uploadedBy,
      title: documentsTable.title,
      fileName: documentsTable.fileName,
      mimeType: documentsTable.mimeType,
      hasExtractedText: sql<boolean>`length(${documentsTable.extractedText}) > 0`,
      categoryId: documentsTable.categoryId,
      categoryName: categoriesTable.name,
      createdAt: documentsTable.createdAt,
      uploaderName: appUsersTable.name,
    })
    .from(documentsTable)
    .leftJoin(appUsersTable, eq(documentsTable.uploadedBy, appUsersTable.id))
    .leftJoin(categoriesTable, eq(documentsTable.categoryId, categoriesTable.id))
    .where(whereConditions)
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

router.get("/documents/search", async (req, res) => {
  if (!req.isAuthenticated() || !req.appUser) {
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

  const tsQuery = sql`(websearch_to_tsquery('portuguese', ${q}) || websearch_to_tsquery('simple', ${q}))`;

  const [totalResult] = await db
    .select({ count: count() })
    .from(documentsTable)
    .where(sql`${documentsTable.searchVector} @@ ${tsQuery}`);

  let total = totalResult?.count ?? 0;
  let useFallback: false | "ilike" | "trigram" = false;

  if (total === 0) {
    const ilikePattern = `%${q}%`;
    const [ilikeTotal] = await db
      .select({ count: count() })
      .from(documentsTable)
      .where(sql`(${documentsTable.title} || ' ' || ${documentsTable.extractedText}) ILIKE ${ilikePattern}`);

    if ((ilikeTotal?.count ?? 0) > 0) {
      total = ilikeTotal!.count;
      useFallback = "ilike";
    } else {
      const [trigramTotal] = await db
        .select({ count: count() })
        .from(documentsTable)
        .where(sql`word_similarity(${q}, ${documentsTable.title} || ' ' || ${documentsTable.extractedText}) > 0.3`);
      total = trigramTotal?.count ?? 0;
      useFallback = "trigram";
    }
  }

  let results;

  if (useFallback === "ilike") {
    const ilikePattern = `%${q}%`;
    results = await db
      .select({
        id: documentsTable.id,
        title: documentsTable.title,
        fileName: documentsTable.fileName,
        snippet: sql<string>`substring(${documentsTable.extractedText} from greatest(1, position(lower(${q}) in lower(${documentsTable.extractedText})) - 50) for 150)`,
        rank: sql<number>`1`,
        categoryId: documentsTable.categoryId,
        categoryName: categoriesTable.name,
        createdAt: documentsTable.createdAt,
        uploaderName: appUsersTable.name,
      })
      .from(documentsTable)
      .leftJoin(appUsersTable, eq(documentsTable.uploadedBy, appUsersTable.id))
      .leftJoin(categoriesTable, eq(documentsTable.categoryId, categoriesTable.id))
      .where(sql`(${documentsTable.title} || ' ' || ${documentsTable.extractedText}) ILIKE ${ilikePattern}`)
      .orderBy(desc(documentsTable.createdAt))
      .limit(limit)
      .offset(offset);
  } else if (useFallback === "trigram") {
    results = await db
      .select({
        id: documentsTable.id,
        title: documentsTable.title,
        fileName: documentsTable.fileName,
        snippet: sql<string>`substring(${documentsTable.extractedText} from 1 for 150)`,
        rank: sql<number>`word_similarity(${q}, ${documentsTable.title} || ' ' || ${documentsTable.extractedText})`,
        categoryId: documentsTable.categoryId,
        categoryName: categoriesTable.name,
        createdAt: documentsTable.createdAt,
        uploaderName: appUsersTable.name,
      })
      .from(documentsTable)
      .leftJoin(appUsersTable, eq(documentsTable.uploadedBy, appUsersTable.id))
      .leftJoin(categoriesTable, eq(documentsTable.categoryId, categoriesTable.id))
      .where(sql`word_similarity(${q}, ${documentsTable.title} || ' ' || ${documentsTable.extractedText}) > 0.3`)
      .orderBy(sql`word_similarity(${q}, ${documentsTable.title} || ' ' || ${documentsTable.extractedText}) DESC`)
      .limit(limit)
      .offset(offset);
  } else {
    results = await db
      .select({
        id: documentsTable.id,
        title: documentsTable.title,
        fileName: documentsTable.fileName,
        snippet: sql<string>`ts_headline('simple', ${documentsTable.extractedText}, ${tsQuery}, 'MaxWords=50, MinWords=20, StartSel=<mark>, StopSel=</mark>')`,
        rank: sql<number>`ts_rank(${documentsTable.searchVector}, ${tsQuery})`,
        categoryId: documentsTable.categoryId,
        categoryName: categoriesTable.name,
        createdAt: documentsTable.createdAt,
        uploaderName: appUsersTable.name,
      })
      .from(documentsTable)
      .leftJoin(appUsersTable, eq(documentsTable.uploadedBy, appUsersTable.id))
      .leftJoin(categoriesTable, eq(documentsTable.categoryId, categoriesTable.id))
      .where(sql`${documentsTable.searchVector} @@ ${tsQuery}`)
      .orderBy(sql`ts_rank(${documentsTable.searchVector}, ${tsQuery}) DESC`)
      .limit(limit)
      .offset(offset);
  }

  res.json({
    results,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    query: q,
  });
});

router.get("/documents/:id", async (req, res) => {
  if (!req.isAuthenticated() || !req.appUser) {
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
      categoryId: documentsTable.categoryId,
      categoryName: categoriesTable.name,
      createdAt: documentsTable.createdAt,
      uploaderName: appUsersTable.name,
    })
    .from(documentsTable)
    .leftJoin(appUsersTable, eq(documentsTable.uploadedBy, appUsersTable.id))
    .leftJoin(categoriesTable, eq(documentsTable.categoryId, categoriesTable.id))
    .where(eq(documentsTable.id, params.data.id))
    .limit(1);

  if (!doc) {
    res.status(404).json({ error: "Documento não encontrado" });
    return;
  }

  res.json(doc);
});

router.delete("/documents/:id", async (req, res) => {
  if (!req.isAuthenticated() || !req.appUser) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  const params = DeleteDocumentParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [doc] = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.id, params.data.id))
    .limit(1);

  if (!doc) {
    res.status(404).json({ error: "Documento não encontrado" });
    return;
  }

  if (doc.uploadedBy !== req.appUser.id && req.appUser.role !== "admin") {
    res.status(403).json({ error: "Sem permissão para excluir este documento" });
    return;
  }

  await db
    .delete(documentsTable)
    .where(eq(documentsTable.id, params.data.id));

  if (doc.storagePath) {
    try {
      const { ObjectStorageService } = await import("../lib/objectStorage");
      const storage = new ObjectStorageService();
      const objectFile = await storage.getObjectEntityFile(doc.storagePath);
      await storage.deleteObject(objectFile);
    } catch (storageErr) {
      console.error("Failed to delete storage object:", storageErr);
    }
  }

  res.status(204).end();
});

export default router;
