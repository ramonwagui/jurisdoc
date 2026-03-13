import { pgTable, serial, text, integer, timestamp, index, varchar } from "drizzle-orm/pg-core";
import { customType } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { appUsersTable } from "./users";

const tsvectorType = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

export const documentsTable = pgTable("documents", {
  id: serial("id").primaryKey(),
  uploadedBy: integer("uploaded_by").notNull().references(() => appUsersTable.id),
  title: varchar("title").notNull(),
  fileName: varchar("file_name").notNull(),
  storagePath: varchar("storage_path").notNull(),
  mimeType: varchar("mime_type").notNull(),
  extractedText: text("extracted_text").notNull().default(""),
  searchVector: tsvectorType("search_vector"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("documents_search_idx").using("gin", table.searchVector),
]);

export const insertDocumentSchema = createInsertSchema(documentsTable).omit({ id: true, createdAt: true, updatedAt: true, searchVector: true });
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documentsTable.$inferSelect;
