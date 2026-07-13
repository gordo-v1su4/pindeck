import type { ClientVisionMetadata } from "./metadata-format";

type Pending = {
  resolve: (metadata: ClientVisionMetadata) => void;
  reject: (error: Error) => void;
};

let worker: Worker | undefined;
let readyPromise: Promise<void> | undefined;
let nextId = 1;
const pending = new Map<number, Pending>();

export function analyzeImageWithClientLfm(blob: Blob): Promise<ClientVisionMetadata> {
  return ensureWorker().then(async () => {
    const bitmap = await createImageBitmap(blob);
    const id = nextId++;
    return new Promise<ClientVisionMetadata>((resolve, reject) => {
      pending.set(id, { resolve, reject });
      worker?.postMessage({ type: "analyze", id, bitmap }, [bitmap]);
    });
  });
}

export function isClientVisionPreferred() {
  return (import.meta.env.VITE_PINDECK_VISION_MODE || "client").toLowerCase() !== "server";
}

function ensureWorker() {
  if (readyPromise) return readyPromise;
  if (!("gpu" in navigator)) {
    return Promise.reject(new Error("WebGPU is unavailable in this browser"));
  }

  worker = new Worker(new URL("./lfm-metadata-worker.ts", import.meta.url), { type: "module" });
  readyPromise = new Promise<void>((resolve, reject) => {
    worker?.addEventListener("message", (event: MessageEvent) => {
      const message = event.data;
      if (message.type === "ready") resolve();
      if (message.type === "result") {
        const request = pending.get(message.id);
        if (!request) return;
        pending.delete(message.id);
        request.resolve(message.metadata ?? {});
      }
      if (message.type === "error") {
        if (message.id == null) {
          readyPromise = undefined;
          worker?.terminate();
          worker = undefined;
          reject(new Error(message.message));
          return;
        }
        const request = pending.get(message.id);
        if (!request) return;
        pending.delete(message.id);
        request.reject(new Error(message.message));
      }
    });
    worker?.postMessage({ type: "init" });
  });
  return readyPromise;
}
