import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import { sql } from "drizzle-orm";
import multer from "multer";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

import { db, documentsTable } from "@workspace/db";
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from "@workspace/api-zod";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "../lib/objectStorage";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

router.get("/test-r2", async (_req: Request, res: Response) => {
  try {
    const testBuffer = Buffer.from("R2 test successful!");
    const { objectPath } = await objectStorageService.uploadObjectEntity(
      testBuffer,
      "text/plain",
    );
    res.json({ success: true, path: objectPath });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("R2 Test Error:", err);
    res.status(500).json({ success: false, error });
  }
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

/**
 * POST /storage/uploads/request-url
 *
 * Request a presigned URL for file upload.
 * The client sends JSON metadata (name, size, contentType) — NOT the file.
 * Then uploads the file directly to the returned presigned URL.
 */
router.post(
  "/storage/uploads/request-url",
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.appUser) {
      res.status(401).json({ error: "Não autenticado" });
      return;
    }

    if (!req.appUser.active) {
      res.status(403).json({ error: "Conta desativada" });
      return;
    }

    const parsed = RequestUploadUrlBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Missing or invalid required fields" });
      return;
    }

    try {
      const { name, size, contentType } = parsed.data;

      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath =
        objectStorageService.normalizeObjectEntityPath(uploadURL);

      res.json(
        RequestUploadUrlResponse.parse({
          uploadURL,
          objectPath,
          metadata: { name, size, contentType },
        }),
      );
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  },
);

/**
 * POST /storage/upload-document
 *
 * Accept multipart file upload, store to object storage,
 * extract text server-side using pdf-parse/mammoth,
 * and create the document record atomically.
 */
router.post(
  "/storage/upload-document",
  upload.single("file"),
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.appUser) {
      res.status(401).json({ error: "Não autenticado" });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "Nenhum arquivo enviado" });
      return;
    }

    const isPdf =
      file.buffer.length >= 5 &&
      file.buffer.subarray(0, 5).toString() === "%PDF-";
    const isDocx =
      file.buffer.length >= 4 &&
      file.buffer[0] === 0x50 &&
      file.buffer[1] === 0x4b &&
      file.buffer[2] === 0x03 &&
      file.buffer[3] === 0x04;

    if (!isPdf && !isDocx) {
      res
        .status(400)
        .json({ error: "Tipo de arquivo não suportado. Envie PDF ou DOCX." });
      return;
    }

    const validatedMimeType = isPdf
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    try {
      console.log("Starting upload:", {
        filename: file.originalname,
        size: file.buffer.length,
        mimeType: file.mimetype,
      });

      const { objectPath } = await objectStorageService.uploadObjectEntity(
        file.buffer,
        validatedMimeType,
      );

      console.log("Upload to R2 successful:", objectPath);

      let extractedText = "";
      try {
        if (isPdf) {
          const parser = new PDFParse({ data: new Uint8Array(file.buffer) });
          const result = await parser.getText();
          extractedText = result.text;
        } else {
          const docxResult = await mammoth.extractRawText({
            buffer: file.buffer,
          });
          extractedText = docxResult.value;
        }
      } catch (extractErr) {
        console.error("Text extraction failed:", extractErr);
      }

      const title =
        req.body.title || file.originalname.replace(/\.[^/.]+$/, "");
      const rawCategoryId = req.body.categoryId;
      let categoryId: number | undefined = undefined;
      if (rawCategoryId) {
        const parsed = Number(rawCategoryId);
        if (isNaN(parsed) || parsed <= 0) {
          res.status(400).json({ error: "ID de categoria inválido" });
          return;
        }
        const { categoriesTable } = await import("@workspace/db");
        const [cat] = await db
          .select({ id: categoriesTable.id })
          .from(categoriesTable)
          .where(sql`${categoriesTable.id} = ${parsed}`)
          .limit(1);
        if (!cat) {
          res.status(400).json({ error: "Categoria não encontrada" });
          return;
        }
        categoryId = parsed;
      }

      const [doc] = await db
        .insert(documentsTable)
        .values({
          uploadedBy: req.appUser.id,
          title,
          fileName: file.originalname,
          storagePath: objectPath,
          mimeType: validatedMimeType,
          categoryId,
          extractedText,
          searchVector: sql`to_tsvector('portuguese', ${title} || ' ' || ${extractedText}) || to_tsvector('simple', ${title} || ' ' || ${extractedText})`,
        })
        .returning();

      res.status(201).json(doc);
    } catch (error) {
      console.error("Upload error:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      res
        .status(500)
        .json({ error: "Falha ao processar o upload", details: errorMessage });
    }
  },
);

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets from R2 public bucket.
 * These are unconditionally public — no authentication or ACL checks.
 */
router.get(
  "/storage/public-objects/*filePath",
  async (req: Request, res: Response) => {
    try {
      const raw = req.params.filePath;
      const filePath = Array.isArray(raw) ? raw.join("/") : raw;
      const objectKey = await objectStorageService.searchPublicObject(filePath);
      if (!objectKey) {
        res.status(404).json({ error: "File not found" });
        return;
      }

      const response = await objectStorageService.downloadObject(objectKey);

      res.status(200);
      response.headers.forEach((value, key) => res.setHeader(key, value));

      if (response.body) {
        const nodeStream = Readable.fromWeb(
          response.body as ReadableStream<Uint8Array>,
        );
        nodeStream.pipe(res);
      } else {
        res.end();
      }
    } catch (error) {
      console.error("Error serving public object:", error);
      res.status(500).json({ error: "Failed to serve public object" });
    }
  },
);

/**
 * GET /storage/objects/*
 *
 * Serve object entities from R2 bucket.
 * These are served from a separate path from /public-objects and can optionally
 * be protected with authentication or ACL checks based on the use case.
 */
router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    if (!req.isAuthenticated() || !req.appUser) {
      res.status(401).json({ error: "Não autenticado" });
      return;
    }

    const objectPath = `/objects/${wildcardPath}`;

    const [docRecord] = await db
      .select({ id: documentsTable.id })
      .from(documentsTable)
      .where(sql`${documentsTable.storagePath} = ${objectPath}`)
      .limit(1);

    if (!docRecord) {
      res.status(404).json({ error: "Objeto não encontrado" });
      return;
    }

    const objectKey =
      await objectStorageService.getObjectEntityFile(objectPath);

    const response = await objectStorageService.downloadObject(objectKey);

    res.status(200);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(
        response.body as ReadableStream<Uint8Array>,
      );
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    console.error("Error serving object:", error);
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Object not found" });
      return;
    }
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;
