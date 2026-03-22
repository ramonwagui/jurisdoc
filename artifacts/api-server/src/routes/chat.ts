import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, documentsTable } from "@workspace/db";
import { ai } from "@workspace/integrations-gemini-ai";
import {
  ChatWithDocumentBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/chat", async (req, res) => {
  if (!req.isAuthenticated() || !req.appUser) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  const body = ChatWithDocumentBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [doc] = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.id, body.data.documentId))
    .limit(1);

  if (!doc) {
    res.status(404).json({ error: "Documento não encontrado" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const history = body.data.history || [];
    const messages = [
      {
        role: "system" as const,
        content: `Você é um assistente jurídico especializado. Analise e responda perguntas ESTRITAMENTE com base no seguinte documento legal. Não invente informações que não estejam no documento. Se a resposta não puder ser encontrada no documento, diga claramente que a informação não consta no documento fornecido.

DOCUMENTO: "${doc.title}"
---
${doc.extractedText}
---

Responda sempre em português brasileiro de forma clara e profissional.`,
      },
      ...history.map((m: { role: string; content: string }) => ({
        role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
        content: m.content,
      })),
      {
        role: "user" as const,
        content: body.data.message,
      },
    ];

    const stream = await ai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      stream: true,
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content;
      if (text) {
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error) {
    console.error("Chat error:", error);
    res.write(`data: ${JSON.stringify({ error: "Erro ao processar a mensagem" })}\n\n`);
    res.end();
  }
});

export default router;
