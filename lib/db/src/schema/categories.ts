import { pgTable, serial, varchar, timestamp } from "drizzle-orm/pg-core";

export const categoriesTable = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Category = typeof categoriesTable.$inferSelect;
export type InsertCategory = typeof categoriesTable.$inferInsert;
