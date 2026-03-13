import { Router, type IRouter } from "express";
import { eq, desc, sql, and, or, ilike, count } from "drizzle-orm";
import { db, processosTable, processoAndamentosTable, appUsersTable } from "@workspace/db";
import { z } from "zod";
import { ai } from "@workspace/integrations-gemini-ai";

const router: IRouter = Router();

const CreateProcessoBody = z.object({
  numero: z.string().optional(),
  titulo: z.string().min(1),
  clienteNome: z.string().min(1),
  clienteCpf: z.string().min(1),
  clienteTelefone: z.string().optional(),
  area: z.enum(["civil", "criminal", "trabalhista", "previdenciario", "familia", "empresarial", "outro"]).default("civil"),
  status: z.enum(["em_andamento", "aguardando_decisao", "recurso", "encerrado"]).default("em_andamento"),
  descricao: z.string().optional(),
  advogadoId: z.number().int(),
});

const UpdateProcessoBody = z.object({
  titulo: z.string().min(1).optional(),
  clienteNome: z.string().min(1).optional(),
  clienteCpf: z.string().min(1).optional(),
  clienteTelefone: z.string().nullable().optional(),
  area: z.enum(["civil", "criminal", "trabalhista", "previdenciario", "familia", "empresarial", "outro"]).optional(),
  status: z.enum(["em_andamento", "aguardando_decisao", "recurso", "encerrado"]).optional(),
  descricao: z.string().nullable().optional(),
  advogadoId: z.number().int().optional(),
});

const CreateAndamentoBody = z.object({
  tipo: z.enum(["andamento", "parecer", "audiencia", "prazo", "recurso", "encerramento", "outro"]).default("andamento"),
  conteudo: z.string().min(1),
  visivelCliente: z.boolean().default(true),
  dataEvento: z.string().optional(),
});

const UpdateAndamentoBody = z.object({
  tipo: z.enum(["andamento", "parecer", "audiencia", "prazo", "recurso", "encerramento", "outro"]).optional(),
  conteudo: z.string().min(1).optional(),
  visivelCliente: z.boolean().optional(),
  dataEvento: z.string().nullable().optional(),
});

const ConsultarBody = z.object({
  cpf: z.string().optional(),
  numero: z.string().optional(),
  pergunta: z.string().optional(),
});

function generateNumero(): string {
  const rand = Math.floor(Math.random() * 9999999).toString().padStart(7, "0");
  const dd = Math.floor(Math.random() * 99).toString().padStart(2, "0");
  const year = new Date().getFullYear();
  return `${rand}-${dd}.${year}.8.00.0001`;
}

router.get("/processos", async (req, res) => {
  if (!req.isAuthenticated() || !req.appUser) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const validStatuses = ["em_andamento", "aguardando_decisao", "recurso", "encerrado"] as const;
  const validAreas = ["civil", "criminal", "trabalhista", "previdenciario", "familia", "empresarial", "outro"] as const;

  const statusFilter = typeof req.query.status === "string" ? req.query.status : undefined;
  const areaFilter = typeof req.query.area === "string" ? req.query.area : undefined;
  const search = typeof req.query.search === "string" ? req.query.search : undefined;

  if (statusFilter && !validStatuses.includes(statusFilter as typeof validStatuses[number])) {
    res.status(400).json({ error: `Status inválido. Valores aceitos: ${validStatuses.join(", ")}` });
    return;
  }
  if (areaFilter && !validAreas.includes(areaFilter as typeof validAreas[number])) {
    res.status(400).json({ error: `Área inválida. Valores aceitos: ${validAreas.join(", ")}` });
    return;
  }

  const conditions: ReturnType<typeof eq>[] = [];

  if (req.appUser.role !== "admin") {
    conditions.push(eq(processosTable.advogadoId, req.appUser.id));
  }

  if (statusFilter) {
    conditions.push(eq(processosTable.status, statusFilter as typeof validStatuses[number]));
  }
  if (areaFilter) {
    conditions.push(eq(processosTable.area, areaFilter as typeof validAreas[number]));
  }
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        ilike(processosTable.numero, pattern),
        ilike(processosTable.clienteNome, pattern),
        ilike(processosTable.clienteCpf, pattern),
        ilike(processosTable.titulo, pattern),
      )!,
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult] = await db
    .select({ count: count() })
    .from(processosTable)
    .where(where);
  const total = totalResult?.count ?? 0;

  const processos = await db
    .select({
      id: processosTable.id,
      numero: processosTable.numero,
      titulo: processosTable.titulo,
      clienteNome: processosTable.clienteNome,
      clienteCpf: processosTable.clienteCpf,
      clienteTelefone: processosTable.clienteTelefone,
      area: processosTable.area,
      status: processosTable.status,
      descricao: processosTable.descricao,
      advogadoId: processosTable.advogadoId,
      advogadoNome: appUsersTable.name,
      createdAt: processosTable.createdAt,
      updatedAt: processosTable.updatedAt,
    })
    .from(processosTable)
    .leftJoin(appUsersTable, eq(processosTable.advogadoId, appUsersTable.id))
    .where(where)
    .orderBy(desc(processosTable.updatedAt))
    .limit(limit)
    .offset(offset);

  res.json({ processos, total, page, totalPages: Math.ceil(total / limit) });
});

router.post("/processos", async (req, res) => {
  if (!req.isAuthenticated() || !req.appUser) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  const parsed = CreateProcessoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados inválidos", details: parsed.error.format() });
    return;
  }

  const advogadoId = req.appUser.role === "admin" ? parsed.data.advogadoId : req.appUser.id;
  const numero = parsed.data.numero?.trim() || generateNumero();

  try {
    const [processo] = await db
      .insert(processosTable)
      .values({
        numero,
        titulo: parsed.data.titulo,
        clienteNome: parsed.data.clienteNome,
        clienteCpf: parsed.data.clienteCpf,
        clienteTelefone: parsed.data.clienteTelefone || null,
        area: parsed.data.area,
        status: parsed.data.status,
        descricao: parsed.data.descricao || null,
        advogadoId,
      })
      .returning();

    res.status(201).json(processo);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("unique")) {
      res.status(400).json({ error: "Já existe um processo com este número" });
      return;
    }
    throw err;
  }
});

router.get("/processos/:id", async (req, res) => {
  if (!req.isAuthenticated() || !req.appUser) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [processo] = await db
    .select({
      id: processosTable.id,
      numero: processosTable.numero,
      titulo: processosTable.titulo,
      clienteNome: processosTable.clienteNome,
      clienteCpf: processosTable.clienteCpf,
      clienteTelefone: processosTable.clienteTelefone,
      area: processosTable.area,
      status: processosTable.status,
      descricao: processosTable.descricao,
      advogadoId: processosTable.advogadoId,
      advogadoNome: appUsersTable.name,
      createdAt: processosTable.createdAt,
      updatedAt: processosTable.updatedAt,
    })
    .from(processosTable)
    .leftJoin(appUsersTable, eq(processosTable.advogadoId, appUsersTable.id))
    .where(eq(processosTable.id, id))
    .limit(1);

  if (!processo) {
    res.status(404).json({ error: "Processo não encontrado" });
    return;
  }

  if (req.appUser.role !== "admin" && processo.advogadoId !== req.appUser.id) {
    res.status(403).json({ error: "Sem permissão para visualizar este processo" });
    return;
  }

  const andamentos = await db
    .select({
      id: processoAndamentosTable.id,
      processoId: processoAndamentosTable.processoId,
      autorId: processoAndamentosTable.autorId,
      autorNome: appUsersTable.name,
      tipo: processoAndamentosTable.tipo,
      conteudo: processoAndamentosTable.conteudo,
      visivelCliente: processoAndamentosTable.visivelCliente,
      dataEvento: processoAndamentosTable.dataEvento,
      createdAt: processoAndamentosTable.createdAt,
    })
    .from(processoAndamentosTable)
    .leftJoin(appUsersTable, eq(processoAndamentosTable.autorId, appUsersTable.id))
    .where(eq(processoAndamentosTable.processoId, id))
    .orderBy(desc(processoAndamentosTable.createdAt));

  res.json({ ...processo, andamentos });
});

router.patch("/processos/:id", async (req, res) => {
  if (!req.isAuthenticated() || !req.appUser) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [existing] = await db
    .select()
    .from(processosTable)
    .where(eq(processosTable.id, id))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Processo não encontrado" });
    return;
  }

  if (req.appUser.role !== "admin" && existing.advogadoId !== req.appUser.id) {
    res.status(403).json({ error: "Sem permissão para editar este processo" });
    return;
  }

  const parsed = UpdateProcessoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados inválidos", details: parsed.error.format() });
    return;
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.titulo !== undefined) updateData.titulo = parsed.data.titulo;
  if (parsed.data.clienteNome !== undefined) updateData.clienteNome = parsed.data.clienteNome;
  if (parsed.data.clienteCpf !== undefined) updateData.clienteCpf = parsed.data.clienteCpf;
  if (parsed.data.clienteTelefone !== undefined) updateData.clienteTelefone = parsed.data.clienteTelefone;
  if (parsed.data.area !== undefined) updateData.area = parsed.data.area;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.descricao !== undefined) updateData.descricao = parsed.data.descricao;
  if (parsed.data.advogadoId !== undefined) {
    if (req.appUser!.role !== "admin") {
      res.status(403).json({ error: "Apenas administradores podem transferir processos" });
      return;
    }
    updateData.advogadoId = parsed.data.advogadoId;
  }

  const [updated] = await db
    .update(processosTable)
    .set(updateData)
    .where(eq(processosTable.id, id))
    .returning();

  res.json(updated);
});

router.delete("/processos/:id", async (req, res) => {
  if (!req.isAuthenticated() || !req.appUser) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  if (req.appUser.role !== "admin") {
    res.status(403).json({ error: "Apenas administradores podem excluir processos" });
    return;
  }

  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [existing] = await db
    .select()
    .from(processosTable)
    .where(eq(processosTable.id, id))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Processo não encontrado" });
    return;
  }

  await db.delete(processosTable).where(eq(processosTable.id, id));
  res.status(204).end();
});

router.post("/processos/:id/andamentos", async (req, res) => {
  if (!req.isAuthenticated() || !req.appUser) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  const processoId = Number(req.params.id);
  if (isNaN(processoId)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [processo] = await db
    .select()
    .from(processosTable)
    .where(eq(processosTable.id, processoId))
    .limit(1);

  if (!processo) {
    res.status(404).json({ error: "Processo não encontrado" });
    return;
  }

  const parsed = CreateAndamentoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados inválidos", details: parsed.error.format() });
    return;
  }

  const [andamento] = await db
    .insert(processoAndamentosTable)
    .values({
      processoId,
      autorId: req.appUser.id,
      tipo: parsed.data.tipo,
      conteudo: parsed.data.conteudo,
      visivelCliente: parsed.data.visivelCliente,
      dataEvento: parsed.data.dataEvento ? new Date(parsed.data.dataEvento) : null,
    })
    .returning();

  await db
    .update(processosTable)
    .set({ updatedAt: new Date() })
    .where(eq(processosTable.id, processoId));

  res.status(201).json(andamento);
});

router.patch("/processos/:id/andamentos/:andId", async (req, res) => {
  if (!req.isAuthenticated() || !req.appUser) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  const processoId = Number(req.params.id);
  const andId = Number(req.params.andId);
  if (isNaN(andId) || isNaN(processoId)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [existing] = await db
    .select()
    .from(processoAndamentosTable)
    .where(and(eq(processoAndamentosTable.id, andId), eq(processoAndamentosTable.processoId, processoId)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Andamento não encontrado" });
    return;
  }

  if (req.appUser.role !== "admin" && existing.autorId !== req.appUser.id) {
    res.status(403).json({ error: "Sem permissão para editar este andamento" });
    return;
  }

  const parsed = UpdateAndamentoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados inválidos", details: parsed.error.format() });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.tipo !== undefined) updateData.tipo = parsed.data.tipo;
  if (parsed.data.conteudo !== undefined) updateData.conteudo = parsed.data.conteudo;
  if (parsed.data.visivelCliente !== undefined) updateData.visivelCliente = parsed.data.visivelCliente;
  if (parsed.data.dataEvento !== undefined) updateData.dataEvento = parsed.data.dataEvento ? new Date(parsed.data.dataEvento) : null;

  const [updated] = await db
    .update(processoAndamentosTable)
    .set(updateData)
    .where(eq(processoAndamentosTable.id, andId))
    .returning();

  res.json(updated);
});

router.delete("/processos/:id/andamentos/:andId", async (req, res) => {
  if (!req.isAuthenticated() || !req.appUser) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  const processoId = Number(req.params.id);
  const andId = Number(req.params.andId);
  if (isNaN(andId) || isNaN(processoId)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [existing] = await db
    .select()
    .from(processoAndamentosTable)
    .where(and(eq(processoAndamentosTable.id, andId), eq(processoAndamentosTable.processoId, processoId)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Andamento não encontrado" });
    return;
  }

  if (req.appUser.role !== "admin" && existing.autorId !== req.appUser.id) {
    res.status(403).json({ error: "Sem permissão para excluir este andamento" });
    return;
  }

  await db.delete(processoAndamentosTable).where(eq(processoAndamentosTable.id, andId));
  res.status(204).end();
});

router.post("/processos/consultar", async (req, res) => {
  const parsed = ConsultarBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados inválidos" });
    return;
  }

  const { cpf, numero, pergunta } = parsed.data;

  if (!cpf && !numero) {
    res.status(400).json({ error: "Informe o CPF ou o número do processo" });
    return;
  }

  let processo;
  if (numero) {
    const [found] = await db
      .select({
        id: processosTable.id,
        numero: processosTable.numero,
        titulo: processosTable.titulo,
        clienteNome: processosTable.clienteNome,
        clienteCpf: processosTable.clienteCpf,
        area: processosTable.area,
        status: processosTable.status,
        advogadoNome: appUsersTable.name,
        createdAt: processosTable.createdAt,
      })
      .from(processosTable)
      .leftJoin(appUsersTable, eq(processosTable.advogadoId, appUsersTable.id))
      .where(eq(processosTable.numero, numero.trim()))
      .limit(1);
    processo = found;
  } else if (cpf) {
    const cleanCpf = cpf.replace(/\D/g, "");
    const [found] = await db
      .select({
        id: processosTable.id,
        numero: processosTable.numero,
        titulo: processosTable.titulo,
        clienteNome: processosTable.clienteNome,
        clienteCpf: processosTable.clienteCpf,
        area: processosTable.area,
        status: processosTable.status,
        advogadoNome: appUsersTable.name,
        createdAt: processosTable.createdAt,
      })
      .from(processosTable)
      .leftJoin(appUsersTable, eq(processosTable.advogadoId, appUsersTable.id))
      .where(sql`REPLACE(REPLACE(REPLACE(${processosTable.clienteCpf}, '.', ''), '-', ''), '/', '') = ${cleanCpf}`)
      .orderBy(desc(processosTable.updatedAt))
      .limit(1);
    processo = found;
  }

  if (!processo) {
    try {
      const stream = await ai.models.generateContentStream({
        model: "gemini-2.5-flash",
        contents: [{
          role: "user",
          parts: [{ text: `Você é o assistente virtual do escritório de advocacia JurisDoc. O cliente informou ${cpf ? `CPF: ${cpf}` : `número do processo: ${numero}`}, mas não encontramos nenhum processo com esses dados em nosso sistema. Responda de forma educada em português brasileiro, informando que não foi possível localizar o processo e sugerindo que o cliente entre em contato diretamente com o escritório para verificar os dados. Seja breve e profissional.` }],
        }],
        config: { maxOutputTokens: 512 },
      });

      let resposta = "";
      for await (const chunk of stream) {
        if (chunk.text) resposta += chunk.text;
      }

      res.json({ resposta, processo: null });
    } catch {
      res.json({
        resposta: "Não foi possível localizar um processo com os dados informados. Por favor, verifique as informações e tente novamente ou entre em contato diretamente com o escritório.",
        processo: null,
      });
    }
    return;
  }

  const andamentos = await db
    .select({
      tipo: processoAndamentosTable.tipo,
      conteudo: processoAndamentosTable.conteudo,
      dataEvento: processoAndamentosTable.dataEvento,
      createdAt: processoAndamentosTable.createdAt,
    })
    .from(processoAndamentosTable)
    .where(
      and(
        eq(processoAndamentosTable.processoId, processo.id),
        eq(processoAndamentosTable.visivelCliente, true),
      ),
    )
    .orderBy(processoAndamentosTable.createdAt);

  const statusLabels: Record<string, string> = {
    em_andamento: "Em andamento",
    aguardando_decisao: "Aguardando decisão",
    recurso: "Em recurso",
    encerrado: "Encerrado",
  };

  const areaLabels: Record<string, string> = {
    civil: "Cível",
    criminal: "Criminal",
    trabalhista: "Trabalhista",
    previdenciario: "Previdenciário",
    familia: "Família",
    empresarial: "Empresarial",
    outro: "Outro",
  };

  const tipoLabels: Record<string, string> = {
    andamento: "Andamento",
    parecer: "Parecer",
    audiencia: "Audiência",
    prazo: "Prazo",
    recurso: "Recurso",
    encerramento: "Encerramento",
    outro: "Outro",
  };

  const timelineText = andamentos.map((a, i) => {
    const date = a.dataEvento
      ? new Date(a.dataEvento).toLocaleDateString("pt-BR")
      : new Date(a.createdAt).toLocaleDateString("pt-BR");
    return `${i + 1}. [${tipoLabels[a.tipo] || a.tipo}] (${date}): ${a.conteudo}`;
  }).join("\n");

  const clientQuestion = pergunta || "Como está meu processo?";

  const prompt = `Você é o assistente virtual do escritório de advocacia JurisDoc. Um cliente está consultando o andamento do seu processo. Responda de forma clara, profissional e acessível em português brasileiro.

DADOS DO PROCESSO:
- Número: ${processo.numero}
- Título: ${processo.titulo}
- Cliente: ${processo.clienteNome}
- Área: ${areaLabels[processo.area] || processo.area}
- Status atual: ${statusLabels[processo.status] || processo.status}
- Advogado responsável: ${processo.advogadoNome || "Não informado"}

HISTÓRICO DE ANDAMENTOS (visíveis ao cliente):
${timelineText || "Nenhum andamento registrado até o momento."}

PERGUNTA DO CLIENTE: ${clientQuestion}

Instruções:
- Responda com base ESTRITAMENTE nas informações acima
- Não invente fatos ou andamentos
- Use linguagem acessível mas profissional
- Mencione o status atual do processo
- Se houver andamentos, resuma os mais relevantes
- Não revele informações marcadas como internas
- Seja objetivo e reconfortante`;

  try {
    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 2048 },
    });

    let resposta = "";
    for await (const chunk of stream) {
      if (chunk.text) resposta += chunk.text;
    }

    res.json({
      resposta,
      processo: {
        numero: processo.numero,
        titulo: processo.titulo,
        status: processo.status,
        area: processo.area,
        clienteNome: processo.clienteNome,
      },
    });
  } catch (error) {
    console.error("Consultation AI error:", error);
    res.status(500).json({ error: "Erro ao processar a consulta. Tente novamente." });
  }
});

export default router;
