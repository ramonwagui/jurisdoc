import { pgTable, serial, varchar, text, integer, boolean, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { appUsersTable } from "./users";

export const processoAreaEnum = pgEnum("processo_area", [
  "civil",
  "criminal",
  "trabalhista",
  "previdenciario",
  "familia",
  "empresarial",
  "outro",
]);

export const processoStatusEnum = pgEnum("processo_status", [
  "em_andamento",
  "aguardando_decisao",
  "recurso",
  "encerrado",
]);

export const processosTable = pgTable("processos", {
  id: serial("id").primaryKey(),
  numero: varchar("numero").notNull().unique(),
  titulo: varchar("titulo").notNull(),
  clienteNome: varchar("cliente_nome").notNull(),
  clienteCpf: varchar("cliente_cpf").notNull(),
  clienteTelefone: varchar("cliente_telefone"),
  area: processoAreaEnum("area").notNull().default("civil"),
  status: processoStatusEnum("status").notNull().default("em_andamento"),
  descricao: text("descricao"),
  advogadoId: integer("advogado_id").notNull().references(() => appUsersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("processos_cpf_idx").on(table.clienteCpf),
  index("processos_numero_idx").on(table.numero),
]);

export type Processo = typeof processosTable.$inferSelect;
export type InsertProcesso = typeof processosTable.$inferInsert;
