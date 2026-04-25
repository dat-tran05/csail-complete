export {};
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

const dumps = readdirSync("snapshots").filter((f) => f.endsWith(".dump")).sort().reverse();
if (dumps.length === 0) { console.error("No dumps in snapshots/"); process.exit(1); }
const latest = dumps[0]!;
console.log(`Restoring from snapshots/${latest}`);

// Stage the chosen dump as neo4j.dump so neo4j-admin load can find it by database name.
spawnSync("cp", [`${process.cwd()}/snapshots/${latest}`, `${process.cwd()}/snapshots/neo4j.dump`], { stdio: "inherit" });

console.log("Stopping Neo4j container...");
spawnSync("docker", ["stop", "csail-neo4j"], { stdio: "inherit" });

const r = spawnSync(
  "docker",
  [
    "run", "--rm",
    "-v", "csail-complete_neo4j_data:/data",
    "-v", `${process.cwd()}/snapshots:/snapshots`,
    "neo4j:5.20.0-community",
    "neo4j-admin", "database", "load", "neo4j",
    "--from-path=/snapshots",
    "--overwrite-destination=true",
  ],
  { stdio: "inherit" }
);

spawnSync("rm", [`${process.cwd()}/snapshots/neo4j.dump`], { stdio: "inherit" });

console.log("Restarting Neo4j container...");
spawnSync("docker", ["start", "csail-neo4j"], { stdio: "inherit" });

if (r.status !== 0) process.exit(r.status ?? 1);
console.log(`✓ restored ${latest}`);
