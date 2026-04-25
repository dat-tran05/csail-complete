import { writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import PDFParser from "pdf2json";
import type { Room, Polygon, RoomType } from "../../shared/schema/room";

interface PdfText { x: number; y: number; w: number; R: { T: string }[]; }
interface PdfFill { x: number; y: number; w: number; h: number; }
interface PdfPage { Texts: PdfText[]; Fills?: PdfFill[]; HLines?: any[]; VLines?: any[]; }
interface PdfDoc { Pages: PdfPage[]; }

const ROOM_NUM_RE = /\b([A-Z]?\d{3,4}[A-Z]?)\b/;

function classify(label: string): RoomType {
  const l = label.toLowerCase();
  if (l.includes("conf")) return "conference";
  if (l.includes("lab")) return "lab";
  if (l.includes("office")) return "office";
  if (l.includes("corridor") || l.includes("hall")) return "corridor";
  if (l.includes("common") || l.includes("lounge")) return "common";
  return "office";
}

export async function extractFloor(pdfPath: string, floor: number): Promise<void> {
  if (!existsSync(pdfPath)) {
    console.error(`PDF not found: ${pdfPath}`);
    console.error(`Place the floor-plans PDF there and re-run.`);
    console.error(`Falling back: app will use data/rooms-floor-${floor}-sample.json automatically.`);
    process.exit(1);
  }

  const parser = new PDFParser(null, true);

  const doc: PdfDoc = await new Promise((resolve, reject) => {
    parser.on("pdfParser_dataError", (err: any) => reject(err.parserError));
    parser.on("pdfParser_dataReady", (pdfData: PdfDoc) => resolve(pdfData));
    parser.loadPDF(pdfPath);
  });

  const page = doc.Pages[floor - 1];
  if (!page) {
    console.error(`PDF has no page index ${floor - 1} (floor ${floor}).`);
    console.error(`PDF has ${doc.Pages.length} pages. Adjust the page→floor mapping in extract-vector.ts.`);
    process.exit(1);
  }

  const labels = (page.Texts ?? [])
    .map((t) => ({
      x: t.x,
      y: t.y,
      text: decodeURIComponent(t.R.map((r) => r.T).join("")),
    }))
    .filter((l) => l.text.trim().length > 0);

  const fills = (page.Fills ?? []).filter((f) => f.w > 1 && f.h > 1);

  const rooms: Room[] = [];
  for (const fill of fills) {
    const poly: Polygon = [
      [fill.x, fill.y],
      [fill.x + fill.w, fill.y],
      [fill.x + fill.w, fill.y + fill.h],
      [fill.x, fill.y + fill.h],
    ];
    void (fill.x + fill.w / 2); // cx — reserved for future bbox math
    void (fill.y + fill.h / 2); // cy — reserved for future bbox math
    const inside = labels.find((l) =>
      l.x >= fill.x && l.x <= fill.x + fill.w &&
      l.y >= fill.y && l.y <= fill.y + fill.h
    );
    const label = inside?.text.trim() ?? "";
    const numMatch = label.match(ROOM_NUM_RE);
    if (!numMatch) continue;
    const number = numMatch[1]!;
    rooms.push({
      id: `32-${number}`,
      number,
      floor,
      polygon: poly,
      type: classify(label),
      label,
    });
  }

  if (rooms.length === 0) {
    console.error(`No rooms extracted from page ${floor}.`);
    console.error(`The PDF may be raster, or the structure differs from expected (Fills + Texts).`);
    console.error(`Inspect with: bun pipeline/build.ts inspect ${pdfPath}`);
    console.error(`If raster, build pipeline/pdf-trace/trace-manual/ — see its README.`);
    process.exit(1);
  }

  const out = `data/rooms-floor-${floor}.json`;
  await writeFile(out, JSON.stringify(rooms, null, 2));
  console.log(`Wrote ${rooms.length} rooms to ${out}`);
}
