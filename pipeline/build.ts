#!/usr/bin/env bun
export {};
const subcommand = process.argv[2];
const args = process.argv.slice(3);

const COMMANDS: Record<string, (args: string[]) => Promise<void>> = {
  inspect: async (args) => {
    const { inspectPdf } = await import("./pdf-trace/inspect");
    const path = args[0] ?? "data/floor-plans.pdf";
    await inspectPdf(path);
  },
  "trace-floor": async (args) => {
    const { extractFloor } = await import("./pdf-trace/extract-vector");
    const floor = parseInt(args[0] ?? "7", 10);
    const pdfPath = args[1] ?? "data/floor-plans.pdf";
    await extractFloor(pdfPath, floor);
  },
  kg: async (args) => {
    const sub = args[0];
    const rest = args.slice(1);
    if (sub === "schema") {
      await import("./kg/apply-schema");
    } else if (sub === "ingest") {
      await import("./kg/ingest/upsert-csail");
      await import("./kg/ingest/upsert-hci-lab");
    } else if (sub === "enrich") {
      const flag = rest[0];
      if (flag === "--floor" && rest[1] === "7") {
        await import("./kg/enrich/semantic-scholar-deep");
      } else {
        await import("./kg/enrich/semantic-scholar");
      }
    } else if (sub === "news") {
      await import("./kg/enrich/csail-news");
    } else if (sub === "snapshot") {
      const action = rest[0] ?? "dump";
      if (action === "dump") await import("./kg/snapshot/dump");
      else if (action === "restore") await import("./kg/snapshot/restore");
      else throw new Error(`Unknown snapshot action: ${action}`);
    } else {
      console.error("Usage: bun pipeline/build.ts kg <schema|ingest|enrich|news|snapshot>");
      console.error("  kg schema                    — apply constraints + indexes");
      console.error("  kg ingest                    — upsert CSAIL + HCI Lab people");
      console.error("  kg enrich [--floor 7]        — Semantic Scholar (deep for floor 7)");
      console.error("  kg news                      — scrape CSAIL news");
      console.error("  kg snapshot [dump|restore]   — neo4j-admin database dump/restore");
      process.exit(1);
    }
  },
};

if (!subcommand || !(subcommand in COMMANDS)) {
  console.error("Usage: bun pipeline/build.ts <inspect|trace-floor|kg> [args]");
  process.exit(1);
}

await COMMANDS[subcommand]!(args);
