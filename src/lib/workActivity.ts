export type ActivityRunInput = {
  id: string;
  taskIdentifier: string;
  status: string;
  metadata?: Record<string, unknown>;
  queuedAt?: Date | string;
  startedAt?: Date | string;
  finishedAt?: Date | string;
  durationMs?: number;
  completedAt?: Date | string;
  createdAt?: Date | string;
  error?: { message?: string } | string;
};

export type WorkActivityItem = {
  id: string;
  taskIdentifier: string;
  taskLabel: string;
  status: string;
  statusLabel: string;
  stage: string;
  stageLabel: string;
  progressMode: "exact" | "provider" | "indeterminate";
  progressPercent?: number;
  processedItems?: number;
  completedItems?: number;
  failedItems?: number;
  totalItems?: number;
  providerStatus?: string;
  providerMessage?: string;
  parentRunId?: string;
  queuedMs?: number;
  runtimeMs?: number;
  totalMs?: number;
  timestamp: number;
  active: boolean;
  failed: boolean;
  error?: string;
  children: WorkActivityItem[];
};

export const WORK_ACTIVITY_RETRY_MS = 30_000;

export function workActivityReconnectDelay(error: string) {
  return /(?:\b401\b|public access token is invalid|token (?:is )?expired)/i.test(
    error,
  )
    ? 0
    : WORK_ACTIVITY_RETRY_MS;
}

export function workActivityTokenRefreshDelay(
  expiresAt: number,
  now = Date.now(),
) {
  return Math.max(WORK_ACTIVITY_RETRY_MS, expiresAt - now - 90_000);
}

const terminalStatuses = new Set([
  "COMPLETED",
  "FAILED",
  "CRASHED",
  "SYSTEM_FAILURE",
  "CANCELED",
  "EXPIRED",
  "INTERRUPTED",
  "TIMED_OUT",
]);

const failedStatuses = new Set([
  "FAILED",
  "CRASHED",
  "SYSTEM_FAILURE",
  "EXPIRED",
  "INTERRUPTED",
  "TIMED_OUT",
]);

const taskLabels: Record<string, string> = {
  "pindeck-generate-variations": "Generate variations",
  "pindeck-generate-variation-item": "Render variation",
  "pindeck-image-refresh": "Analyze image",
  "pindeck-finalize-upload": "Finalize upload",
  "pindeck-external-ingest": "Import external image",
  "pindeck-media-repair": "Repair media",
};

export function normalizeActivityRun(
  run: ActivityRunInput,
  now = Date.now(),
): WorkActivityItem {
  const metadata = run.metadata ?? {};
  const queuedAt = timestamp(run.queuedAt ?? run.createdAt);
  const startedAt = timestamp(run.startedAt);
  const finishedAt = timestamp(run.finishedAt ?? run.completedAt);
  const terminal = terminalStatuses.has(run.status);
  const processedItems = finiteNumber(metadata.processedItems);
  const completedItems = finiteNumber(metadata.completedItems);
  const failedItems = finiteNumber(metadata.failedItems);
  const totalItems = finiteNumber(metadata.totalItems);
  const measuredItems =
    processedItems ??
    (completedItems !== undefined || failedItems !== undefined
      ? (completedItems ?? 0) + (failedItems ?? 0)
      : undefined);
  const progressPercent =
    totalItems && measuredItems !== undefined
      ? Math.max(
          0,
          Math.min(100, Math.round((measuredItems / totalItems) * 100)),
        )
      : terminal && run.status === "COMPLETED"
        ? 100
        : undefined;
  const error = typeof run.error === "string" ? run.error : run.error?.message;

  return {
    id: run.id,
    taskIdentifier: run.taskIdentifier,
    taskLabel: taskLabels[run.taskIdentifier] ?? humanize(run.taskIdentifier),
    status: run.status,
    statusLabel: humanize(run.status),
    stage: stringValue(metadata.stage) ?? "queued",
    stageLabel:
      stringValue(metadata.stageLabel) ??
      humanize(stringValue(metadata.stage) ?? run.status),
    progressMode: progressMode(metadata.progressMode, progressPercent),
    progressPercent,
    processedItems,
    completedItems,
    failedItems,
    totalItems,
    providerStatus: stringValue(metadata.providerStatus),
    providerMessage: stringValue(metadata.providerMessage),
    parentRunId: stringValue(metadata.parentRunId),
    queuedMs:
      queuedAt !== undefined && startedAt !== undefined
        ? Math.max(0, startedAt - queuedAt)
        : undefined,
    runtimeMs:
      terminal &&
      typeof run.durationMs === "number" &&
      Number.isFinite(run.durationMs)
        ? Math.max(0, run.durationMs)
        : startedAt !== undefined
          ? Math.max(0, (finishedAt ?? now) - startedAt)
          : undefined,
    totalMs:
      queuedAt !== undefined
        ? Math.max(0, (finishedAt ?? now) - queuedAt)
        : undefined,
    timestamp: queuedAt ?? startedAt ?? finishedAt ?? 0,
    active: !terminal,
    failed: failedStatuses.has(run.status),
    error,
    children: [],
  };
}

export function groupActivityRuns(
  runs: ActivityRunInput[],
  now = Date.now(),
): WorkActivityItem[] {
  const normalized = runs.map((run) => normalizeActivityRun(run, now));
  const byId = new Map(normalized.map((run) => [run.id, run]));
  const roots: WorkActivityItem[] = [];
  for (const run of normalized) {
    const parent = run.parentRunId ? byId.get(run.parentRunId) : undefined;
    if (parent) parent.children.push(run);
    else roots.push(run);
  }
  for (const root of roots) {
    root.children.sort((a, b) => {
      const aIndex =
        finiteNumber(
          runs.find((run) => run.id === a.id)?.metadata?.itemIndex,
        ) ?? 0;
      const bIndex =
        finiteNumber(
          runs.find((run) => run.id === b.id)?.metadata?.itemIndex,
        ) ?? 0;
      return aIndex - bIndex;
    });
  }
  return roots.sort((a, b) => b.timestamp - a.timestamp);
}

export function hasActivityFailure(item: WorkActivityItem): boolean {
  return (
    item.failed ||
    (item.failedItems ?? 0) > 0 ||
    item.children.some(hasActivityFailure)
  );
}

export function formatActivityDuration(value?: number) {
  if (value === undefined) return "—";
  if (value < 1_000) return `${Math.round(value)}ms`;
  if (value < 60_000)
    return `${(value / 1_000).toFixed(value < 10_000 ? 1 : 0)}s`;
  const minutes = Math.floor(value / 60_000);
  const seconds = Math.floor((value % 60_000) / 1_000);
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

function progressMode(
  value: unknown,
  exactPercent?: number,
): WorkActivityItem["progressMode"] {
  if (value === "exact" && exactPercent !== undefined) return "exact";
  if (value === "provider") return "provider";
  return "indeterminate";
}

function timestamp(value?: Date | string) {
  if (!value) return undefined;
  const result =
    value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(result) ? result : undefined;
}

function finiteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function humanize(value: string) {
  return value
    .replace(/^pindeck-/, "")
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
