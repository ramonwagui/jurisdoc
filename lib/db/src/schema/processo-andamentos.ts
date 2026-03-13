import { pgTable, serial, text, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { processosTable } from "./processos";
import { appUsersTable } from "./users";

export const andamentoTipoEnum = pgEnum("andamento_tipo", [
  "andamento",
  "parecer",
  "audiencia",
  "prazo",
  "recurso",
  "encerramento",
  "outro",
]);

export const processoAndamentosTable = pgTable("processo_andamentos", {
  id: serial("id").primaryKey(),
  processoId: integer("processo_id").notNull().references(() => processosTable.id, { onDelete: "cascade" }),
  autorId: integer("autor_id").notNull().references(() => appUsersTable.id),
  tipo: andamentoTipoEnum("tipo").notNull().default("andamento"),
  conteudo: text("conteudo").notNull(),
  visivelCliente: boolean("visivel_cliente").notNull().default(true),
  dataEvento: timestamp("data_evento"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ProcessoAndamento = typeof processoAndamentosTable.$inferSelect;
export type InsertProcessoAndamento = typeof processoAndamentosTable.$inferInsert;
