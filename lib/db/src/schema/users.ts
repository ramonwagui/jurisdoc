import { pgTable, serial, varchar, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable as authUsersTable } from "./auth";

export const appUserRoleEnum = pgEnum("app_user_role", ["admin", "advogado"]);

export const appUsersTable = pgTable("app_users", {
  id: serial("id").primaryKey(),
  replitUserId: varchar("replit_user_id").notNull().unique().references(() => authUsersTable.id),
  name: varchar("name").notNull(),
  email: varchar("email"),
  role: appUserRoleEnum("role").notNull().default("advogado"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAppUserSchema = createInsertSchema(appUsersTable).omit({ id: true, createdAt: true });
export type InsertAppUser = z.infer<typeof insertAppUserSchema>;
export type AppUser = typeof appUsersTable.$inferSelect;
