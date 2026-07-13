import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

type OwnedImageBody = {
  imageId?: string;
  userId?: string;
  runId?: string;
  dispatchId?: string;
};

export const imageRefreshHttp = httpAction(async (ctx, request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!isAuthorized(request)) return json({ error: "Unauthorized" }, 401);

  const body = await readOwnedImageBody(request) as (OwnedImageBody & {
    forcePalette?: boolean;
    runMetadata?: boolean;
  }) | null;
  if (!body?.imageId || !body.userId || !body.runId || !body.dispatchId) {
    return json({ error: "imageId, userId, runId, and dispatchId are required" }, 400);
  }

  const task = "pindeck-image-refresh";
  try {
    const claim = await beginCallback(
      ctx,
      body.imageId,
      body.userId,
      body.runId,
      body.dispatchId,
      task,
    );
    if (claim.cachedResult) return json(claim.cachedResult);
    const image = await getImagePayload(ctx, body.imageId, body.userId);
    if (!image?.imageUrl) {
      throw new OrchestrationHttpError(
        "Image not found, not owned by user, or missing a durable URL",
        404,
      );
    }

    const result = await runAnalysisOnce(ctx, {
      imageId: body.imageId,
      userId: body.userId,
      runId: body.runId,
      dispatchId: body.dispatchId,
      task,
      progress: claim.progress,
      paletteUrl: image.imageUrl,
      forcePalette: body.forcePalette,
      runMetadata: body.runMetadata,
    });
    await completeCallback(ctx, body.imageId, body.runId, body.dispatchId, task, result);
    return json(result);
  } catch (error) {
    return orchestrationFailure(ctx, body.imageId, body.runId, body.dispatchId, task, error);
  }
});

export const mediaFinalizeHttp = httpAction(async (ctx, request) => {
  return runOwnedImageCallback(ctx, request, "pindeck-finalize-upload", async (ctx, body) => {
    const owned = { imageId: body.imageId, userId: body.userId };
    const upload = await ctx.runQuery((internal as any).images.internalGetUploadFinalizePayload, owned);
    if (!upload) {
      throw new OrchestrationHttpError("Upload not found or not owned by user", 404);
    }
    let progress = body.progress;
    let imageUrl = upload.imageUrl as string;
    if (!progress && (upload.storagePersistStatus !== "succeeded" || !upload.storagePath)) {
      if (!upload.storageId) {
        throw new OrchestrationHttpError("Upload is missing its temporary Convex storage file", 409);
      }
      const persisted = await ctx.runAction((internal as any).mediaStorage.finalizeUploadedImage, {
        imageId: upload.imageId,
        userId: upload.userId,
        storageId: upload.storageId,
        title: upload.title,
        description: upload.description,
        tags: upload.tags,
        category: upload.category,
        source: upload.source,
        sref: upload.sref,
        group: upload.group,
        projectName: upload.projectName,
        moodboardName: upload.moodboardName,
        variationCount: upload.variationCount,
        sourceType: upload.sourceType,
        scheduleAnalysis: false,
      });
      if (!persisted.ok) throw new Error(persisted.error);
      imageUrl = persisted.imageUrl;
    }
    if (!progress) {
      await setProgress(ctx, body.imageId, body.runId, body.dispatchId, body.task, "persisted");
      progress = "persisted";
    }

    const image = await getImagePayload(ctx, body.imageId, body.userId);
    if (!image?.imageUrl) throw new Error("Finalized upload is missing its durable URL");
    await runAnalysisOnce(ctx, {
      ...body,
      progress,
      paletteUrl: image.imageUrl,
      forcePalette: !image.colors?.length,
      runMetadata: true,
    });
    return { ok: true as const, imageUrl: image.imageUrl || imageUrl };
  });
});

export const externalIngestHttp = httpAction(async (ctx, request) => {
  return runOwnedImageCallback(ctx, request, "pindeck-external-ingest", async (ctx, body) => {
    const before = await getImagePayload(ctx, body.imageId, body.userId);
    if (!before) throw new OrchestrationHttpError("Ingest row not found or not owned by user", 404);
    let progress = body.progress;
    let imageUrl = before.imageUrl as string;
    if (!progress && (before.storagePersistStatus !== "succeeded" || !before.storagePath)) {
      const persisted = await ctx.runAction((internal as any).images.internalRepairImageMedia, {
        imageId: body.imageId,
        userId: body.userId,
      });
      if (!persisted.ok) {
        const message = persisted.error || "External image could not be persisted to durable storage";
        throw new OrchestrationHttpError(message, isPermanentMediaError(message) ? 422 : 500);
      }
      imageUrl = persisted.imageUrl ?? imageUrl;
    }
    if (!progress) {
      await setProgress(ctx, body.imageId, body.runId, body.dispatchId, body.task, "persisted");
      progress = "persisted";
    }

    const image = await getImagePayload(ctx, body.imageId, body.userId);
    if (!image?.imageUrl) throw new Error("Persisted ingest is missing its durable URL");

    if (image.sourceType === "discord" && progress !== "notified") {
      if (progress !== "notification-started") {
        await setProgress(
          ctx,
          body.imageId,
          body.runId,
          body.dispatchId,
          body.task,
          "notification-started",
        );
        const notification = await ctx.runAction(
          (internal as any).discordNotifications.postStatus,
          {
            event: "queued",
            imageId: body.imageId,
            title: image.title,
            sref: image.sref,
            sourceUrl: image.sourceUrl,
            userId: body.userId,
            imageUrl: image.imageUrl,
          },
        );
        if (!notification.ok) {
          console.warn("Pindeck Discord notification failed after media persistence", {
            imageId: body.imageId,
            error: notification.error,
          });
        }
      }
      await setProgress(ctx, body.imageId, body.runId, body.dispatchId, body.task, "notified");
      progress = "notified";
    }

    if (
      image.sourceType !== "discord" &&
      image.sourceType !== "pinterest" &&
      progress !== "analyzed"
    ) {
      await runAnalysisOnce(ctx, {
        ...body,
        progress,
        paletteUrl: image.imageUrl,
        forcePalette: !image.colors?.length,
        runMetadata: true,
      });
    }

    return { ok: true as const, imageUrl };
  });
});

export const mediaRepairHttp = httpAction(async (ctx, request) => {
  return runOwnedImageCallback(ctx, request, "pindeck-media-repair", async (ctx, body) => {
    const image = await ctx.runQuery((internal as any).images.internalGetMediaRepairPayload, {
      imageId: body.imageId,
      userId: body.userId,
    });
    if (!image) throw new OrchestrationHttpError("Repair row not found or not owned by user", 404);
    if (body.progress === "persisted" || (image.storagePersistStatus === "succeeded" && image.storagePath)) {
      return { ok: true as const, imageUrl: image.imageUrl, alreadyCompleted: true };
    }
    const persisted = await ctx.runAction((internal as any).images.internalRepairImageMedia, {
      imageId: body.imageId,
      userId: body.userId,
    });
    if (!persisted.ok) {
      const message = persisted.error || "Media repair did not produce a durable image";
      throw new OrchestrationHttpError(message, isPermanentMediaError(message) ? 422 : 500);
    }
    await setProgress(ctx, body.imageId, body.runId, body.dispatchId, body.task, "persisted");
    return { ok: true as const, imageUrl: persisted.imageUrl };
  });
});

export const variationGenerationHttp = httpAction(async (ctx, request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!isAuthorized(request)) return json({ error: "Unauthorized" }, 401);

  const body = await request.json().catch(() => null) as (OwnedImageBody & {
    variationCount?: number;
    modificationMode?: string;
    variationDetail?: string;
    aspectRatio?: string;
  }) | null;
  if (
    !body?.imageId ||
    !body.userId ||
    !body.runId ||
    !body.dispatchId ||
    !Number.isFinite(body.variationCount)
  ) {
    return json({ error: "imageId, userId, runId, dispatchId, and variationCount are required" }, 400);
  }

  const task = "pindeck-generate-variations";
  try {
    const claim = await beginCallback(
      ctx,
      body.imageId,
      body.userId,
      body.runId,
      body.dispatchId,
      task,
    );
    if (claim.cachedResult) return json(claim.cachedResult);
    const image = await getImagePayload(ctx, body.imageId, body.userId, true);
    if (!image) {
      throw new OrchestrationHttpError("Image not found or unavailable to this user", 404);
    }

    const result = await ctx.runAction((internal as any).vision.internalGenerateRelatedImages, {
      originalImageId: body.imageId,
      requestedBy: body.userId,
      storageId: image.storageId,
      imageUrl: image.imageUrl,
      previewUrl: image.previewUrl,
      sourceUrl: image.sourceUrl,
      derivativeUrls: image.derivativeUrls,
      description: image.description || "",
      category: image.category,
      style: image.style,
      title: image.title,
      aspectRatio: body.aspectRatio,
      group: image.group,
      sref: image.sref,
      colors: image.colors,
      variationCount: body.variationCount,
      modificationMode: body.modificationMode || "shot-variation",
      variationDetail: body.variationDetail,
    });
    if (!result.ok) {
      throw new OrchestrationHttpError(result.error || "Variation generation did not complete", 422);
    }
    const response = {
      ok: true,
      requested: result.requested,
      generated: result.generated,
    };
    await setProgress(ctx, body.imageId, body.runId, body.dispatchId, task, "generated");
    await completeCallback(ctx, body.imageId, body.runId, body.dispatchId, task, response);
    return json(response);
  } catch (error) {
    return orchestrationFailure(ctx, body.imageId, body.runId, body.dispatchId, task, error);
  }
});

async function runOwnedImageCallback(
  ctx: any,
  request: Request,
  task: string,
  handler: (
    ctx: any,
    body: {
      imageId: string;
      userId: string;
      runId: string;
      dispatchId: string;
      task: string;
      progress?: string;
    },
  ) => Promise<Record<string, unknown>>,
) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!isAuthorized(request)) return json({ error: "Unauthorized" }, 401);
  const body = await readOwnedImageBody(request);
  if (!body?.imageId || !body.userId || !body.runId || !body.dispatchId) {
    return json({ error: "imageId, userId, runId, and dispatchId are required" }, 400);
  }

  try {
    const claim = await beginCallback(
      ctx,
      body.imageId,
      body.userId,
      body.runId,
      body.dispatchId,
      task,
    );
    if (claim.cachedResult) return json(claim.cachedResult);
    const result = await handler(ctx, {
      imageId: body.imageId,
      userId: body.userId,
      runId: body.runId,
      dispatchId: body.dispatchId,
      task,
      progress: claim.progress,
    });
    await completeCallback(ctx, body.imageId, body.runId, body.dispatchId, task, result);
    return json(result);
  } catch (error) {
    return orchestrationFailure(ctx, body.imageId, body.runId, body.dispatchId, task, error);
  }
}

async function beginCallback(
  ctx: any,
  imageId: string,
  userId: string,
  runId: string,
  dispatchId: string,
  task: string,
) {
  const image = await getImagePayload(
    ctx,
    imageId,
    userId,
    task === "pindeck-generate-variations",
  );
  if (!image) {
    throw new OrchestrationHttpError("Image not found or not owned by user", 404);
  }
  if (
    image.orchestrationDispatchId !== dispatchId ||
    image.orchestrationTask !== task ||
    (image.orchestrationRunId && image.orchestrationRunId !== runId)
  ) {
    throw new OrchestrationHttpError("Callback does not match the image's current Trigger run", 409);
  }
  if (image.orchestrationStatus === "completed") {
    return {
      progress: image.orchestrationStep as string | undefined,
      cachedResult: parseCachedResult(image.orchestrationResult),
    };
  }
  const applied = await setState(ctx, imageId, runId, dispatchId, task, "running");
  if (!applied) {
    throw new OrchestrationHttpError("Trigger run was superseded before callback execution", 409);
  }
  return { progress: image.orchestrationStep as string | undefined };
}

function parseCachedResult(value: unknown) {
  if (typeof value !== "string" || !value) {
    return { ok: true, alreadyCompleted: true };
  }
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return { ...parsed, alreadyCompleted: true };
  } catch {
    return { ok: true, alreadyCompleted: true };
  }
}

async function setProgress(
  ctx: any,
  imageId: string,
  runId: string,
  dispatchId: string,
  task: string,
  step: string,
) {
  const applied = await setState(ctx, imageId, runId, dispatchId, task, "running", undefined, {
    step,
  });
  if (!applied) {
    throw new OrchestrationHttpError("Trigger run was superseded while recording progress", 409);
  }
}

async function completeCallback(
  ctx: any,
  imageId: string,
  runId: string,
  dispatchId: string,
  task: string,
  result: Record<string, unknown>,
) {
  const applied = await setState(ctx, imageId, runId, dispatchId, task, "completed", undefined, {
    resultJson: JSON.stringify(result),
  });
  if (!applied) {
    throw new OrchestrationHttpError("Trigger run was superseded before completion", 409);
  }
}

async function runAnalysisOnce(
  ctx: any,
  args: {
    imageId: string;
    userId: string;
    runId: string;
    dispatchId: string;
    task: string;
    progress?: string;
    paletteUrl: string;
    forcePalette?: boolean;
    runMetadata?: boolean;
  },
) {
  if (args.progress === "analyzed") {
    return {
      ok: true,
      paletteOk: true,
      metadataRan: args.runMetadata !== false,
      metadataOk: true,
      alreadyCompleted: true,
    };
  }
  if (args.progress === "analysis-started") {
    const current = await getImagePayload(ctx, args.imageId, args.userId);
    if (current?.aiStatus === "completed") {
      await setProgress(
        ctx,
        args.imageId,
        args.runId,
        args.dispatchId,
        args.task,
        "analyzed",
      );
      return {
        ok: true,
        paletteOk: true,
        metadataRan: args.runMetadata !== false,
        metadataOk: true,
        reconciledAfterRetry: true,
      };
    }
    throw new OrchestrationHttpError(
      "Metadata analysis outcome is ambiguous; automatic replay was stopped to avoid duplicate provider work",
      422,
    );
  }

  await setProgress(
    ctx,
    args.imageId,
    args.runId,
    args.dispatchId,
    args.task,
    "analysis-started",
  );
  const analysis = await ctx.runAction(
    (internal as any).images.internalRefreshMetadataAfterPalette,
    {
      imageId: args.imageId,
      userId: args.userId,
      paletteUrl: args.paletteUrl,
      forcePalette: args.forcePalette,
      runMetadata: args.runMetadata,
    },
  );
  if (!analysis.paletteOk || !analysis.metadataOk) {
    throw new OrchestrationHttpError(
      analysis.error || "Palette or metadata analysis did not complete",
      422,
    );
  }
  await setProgress(
    ctx,
    args.imageId,
    args.runId,
    args.dispatchId,
    args.task,
    "analyzed",
  );
  return { ok: true, ...analysis };
}

async function getImagePayload(
  ctx: any,
  imageId: string,
  userId: string,
  allowActiveShared = false,
) {
  return await ctx.runQuery((internal as any).images.internalGetMetadataRefreshPayload, {
    imageId,
    userId,
    allowActiveShared,
  });
}

async function readOwnedImageBody(request: Request) {
  return await request.json().catch(() => null) as OwnedImageBody | null;
}

async function setState(
  ctx: any,
  imageId: string,
  runId: string,
  dispatchId: string,
  task: string,
  status: "queued" | "running" | "completed" | "failed",
  error?: string,
  progress?: { step?: string; resultJson?: string },
) {
  return await ctx.runMutation((internal as any).images.internalSetOrchestrationState, {
    imageId,
    task,
    runId,
    dispatchId,
    status,
    error,
    requireDispatchIdMatch: true,
    step: progress?.step,
    resultJson: progress?.resultJson,
  });
}

async function orchestrationFailure(
  ctx: any,
  imageId: string,
  runId: string,
  dispatchId: string,
  task: string,
  error: unknown,
) {
  const message = error instanceof Error ? error.message : String(error);
  await setState(ctx, imageId, runId, dispatchId, task, "failed", message);
  const status = error instanceof OrchestrationHttpError ? error.status : 500;
  return json({ error: message }, status);
}

function isAuthorized(request: Request) {
  const configuredToken = process.env.PINDECK_ORCHESTRATION_TOKEN?.trim();
  const authorization = request.headers.get("authorization");
  const suppliedToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : undefined;
  return Boolean(configuredToken && suppliedToken === configuredToken);
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function isPermanentMediaError(message: string) {
  return /\b404\b|NoSuchKey|no recoverable|not found|unsupported|invalid image/i.test(message);
}

class OrchestrationHttpError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}
