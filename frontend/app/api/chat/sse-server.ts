const encoder = new TextEncoder();

export interface SseWriter {
  event(name: string, data: unknown): void;
  close(): void;
}

export function makeSseWriter(controller: ReadableStreamDefaultController<Uint8Array>): SseWriter {
  let closed = false;
  return {
    event(name, data) {
      if (closed) return;
      const payload = `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;
      controller.enqueue(encoder.encode(payload));
    },
    close() {
      if (closed) return;
      closed = true;
      try { controller.close(); } catch {}
    },
  };
}
