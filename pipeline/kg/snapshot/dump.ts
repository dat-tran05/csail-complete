export {};
import { spawnSync } from "node:child_process";

const date = new Date().toISOString().slice(0, 10);
const filename = `csail-kg-${date}.dump`;

// Neo4j's Docker image uses neo4j as PID 1, so `neo4j stop` exits the container.
// Instead: stop the container, run neo4j-admin via a throwaway container sharing
// the same data volume, then restart the original container.
console.log("Stopping Neo4j container...");
spawnSync("docker", ["stop", "csail-neo4j"], { stdio: "inherit" });

console.log(`Dumping → snapshots/${filename}`);
const result = spawnSync(
  "docker",
  [
    "run", "--rm",
    "-v", "csail-complete_neo4j_data:/data",
    "-v", `${process.cwd()}/snapshots:/snapshots`,
    "neo4j:5.20.0-community",
    "neo4j-admin", "database", "dump", "neo4j",
    "--to-path=/snapshots",
    "--overwrite-destination=true",
  ],
  { stdio: "inherit" }
);

console.log("Restarting Neo4j container...");
spawnSync("docker", ["start", "csail-neo4j"], { stdio: "inherit" });

if (result.status !== 0) process.exit(result.status ?? 1);

spawnSync("mv", [`${process.cwd()}/snapshots/neo4j.dump`, `${process.cwd()}/snapshots/${filename}`], { stdio: "inherit" });
console.log(`✓ snapshots/${filename}`);
