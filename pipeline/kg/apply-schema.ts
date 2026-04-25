export {};
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { closeDriver, withWrite } from "./client";

const cypherText = readFileSync(join(import.meta.dir, "schema.cypher"), "utf8");
const statements = cypherText
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

await withWrite(async (session) => {
  for (const stmt of statements) {
    await session.run(stmt);
    console.log("✓", stmt.split("\n")[0]);
  }
});
await closeDriver();
console.log(`Applied ${statements.length} schema statements.`);
