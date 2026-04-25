import { readFile } from "node:fs/promises";
import { PDFParse } from "pdf-parse";

export async function inspectPdf(path: string): Promise<void> {
  console.log(`\nInspecting: ${path}\n`);
  let buf: Buffer;
  try {
    buf = await readFile(path);
  } catch (e) {
    console.error(`Cannot read file: ${path}`);
    console.error(`Place the floor plan PDF at ${path} and re-run.`);
    process.exit(1);
  }

  const parser = new PDFParse({ data: buf });
  const info = await parser.getInfo();
  const textResult = await parser.getText();

  const numpages = info.total;
  const fullText = textResult.pages.map((p) => p.text).join("");
  console.log(`Pages: ${numpages}`);
  console.log(`Text length (all pages): ${fullText.length} chars`);
  console.log(`Producer: ${(info.info as Record<string, string>)?.Producer ?? "unknown"}`);
  console.log(`Creator: ${(info.info as Record<string, string>)?.Creator ?? "unknown"}`);

  const sample = fullText.slice(0, 600).replace(/\s+/g, " ");
  console.log(`\nText sample:\n  ${sample}\n`);

  const looksVector = fullText.length > 500 && /\bG?\d{3,4}\b/.test(fullText);
  console.log(looksVector
    ? "→ PDF appears to contain searchable text (likely vector). Try `bun pipeline/build.ts trace-floor 7`."
    : "→ PDF text is sparse — likely raster. Vector extraction will fail; use the manual tracer fallback (see pipeline/pdf-trace/trace-manual/README.md)."
  );
}
