import { db, documentsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

async function reindexSearchVectors() {
  console.log("Reindexing search vectors with dual-dictionary (portuguese + simple)...");

  const result = await db
    .update(documentsTable)
    .set({
      searchVector: sql`to_tsvector('portuguese', ${documentsTable.title} || ' ' || ${documentsTable.extractedText}) || to_tsvector('simple', ${documentsTable.title} || ' ' || ${documentsTable.extractedText})`,
    })
    .returning({ id: documentsTable.id });

  console.log(`Reindexed ${result.length} documents.`);
  process.exit(0);
}

reindexSearchVectors().catch((err) => {
  console.error("Reindex failed:", err);
  process.exit(1);
});
