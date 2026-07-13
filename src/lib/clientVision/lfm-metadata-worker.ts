/// <reference lib="webworker" />

import {
  AutoModelForImageTextToText,
  AutoProcessor,
  RawImage,
} from "@huggingface/transformers";

import {
  LFM_PINDECK_METADATA_PROMPT,
  parseClientVisionMetadata,
} from "./metadata-format";

const MODEL_ID = "LiquidAI/LFM2.5-VL-450M-ONNX";

let processor: any;
let model: any;
let loading = false;

function post(message: Record<string, unknown>) {
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(message);
}

async function loadModel() {
  if (model && processor) {
    post({ type: "ready" });
    return;
  }
  if (loading) return;
  loading = true;
  try {
    post({ type: "progress", stage: "loading-model", percent: 2 });
    const loadedProcessor = await AutoProcessor.from_pretrained(MODEL_ID);
    let lastPercent = 5;
    const loadedModel = await AutoModelForImageTextToText.from_pretrained(MODEL_ID, {
      dtype: {
        vision_encoder: "fp16",
        embed_tokens: "fp16",
        decoder_model_merged: "q4",
      },
      device: "webgpu",
      progress_callback: (info: { status?: string; total?: number; loaded?: number }) => {
        if (info.status !== "progress" || !info.total || !info.loaded) return;
        const percent = 5 + (info.loaded / info.total) * 90;
        if (percent - lastPercent < 2) return;
        lastPercent = percent;
        post({ type: "progress", stage: "loading-model", percent: Math.round(percent) });
      },
    });
    processor = loadedProcessor;
    model = loadedModel;
    post({ type: "progress", stage: "ready", percent: 100 });
    post({ type: "ready" });
  } catch (error) {
    post({ type: "error", message: `Model load failed: ${(error as Error).message}` });
  } finally {
    loading = false;
  }
}

async function analyze(id: number, bitmap: ImageBitmap) {
  if (!model || !processor) {
    post({ type: "error", id, message: "Model not loaded" });
    return;
  }
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Offscreen canvas is unavailable");
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.85 });
    const image = await RawImage.fromBlob(blob);
    const messages = [{
      role: "user",
      content: [{ type: "image" }, { type: "text", text: LFM_PINDECK_METADATA_PROMPT }],
    }];
    const prompt = processor.apply_chat_template(messages, { add_generation_prompt: true });
    const inputs = await processor(image, prompt, { add_special_tokens: false });
    const outputs = await model.generate({
      ...inputs,
      max_new_tokens: 260,
      do_sample: false,
      repetition_penalty: 1.05,
    });
    const decoded = processor.batch_decode(
      outputs.slice(null, [inputs.input_ids.dims.at(-1), null]),
      { skip_special_tokens: true },
    );
    post({ type: "result", id, metadata: parseClientVisionMetadata(decoded[0] ?? "") });
  } catch (error) {
    post({ type: "error", id, message: (error as Error).message });
  }
}

self.onmessage = (event: MessageEvent) => {
  const message = event.data;
  if (message.type === "init") void loadModel();
  if (message.type === "analyze") void analyze(message.id, message.bitmap);
};
