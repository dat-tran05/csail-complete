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
};

if (!subcommand || !(subcommand in COMMANDS)) {
  console.error("Usage: bun pipeline/build.ts <inspect|trace-floor> [args]");
  console.error("  inspect [pdf-path]                — analyze PDF structure");
  console.error("  trace-floor <n> [pdf-path]        — extract floor N rooms → data/rooms-floor-N.json");
  process.exit(1);
}

await COMMANDS[subcommand]!(args);
