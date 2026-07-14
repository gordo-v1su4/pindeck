import { describe, expect, test } from "bun:test";

import {
  formatActivityDuration,
  groupActivityRuns,
  hasActivityFailure,
  normalizeActivityRun,
  WORK_ACTIVITY_RETRY_MS,
  workActivityReconnectDelay,
  workActivityTokenRefreshDelay,
} from "../src/lib/workActivity";

describe("work activity", () => {
  test("uses exact item progress and run timings", () => {
    const item = normalizeActivityRun(
      {
        id: "run_parent",
        taskIdentifier: "pindeck-generate-variations",
        status: "EXECUTING",
        queuedAt: "2026-07-13T12:00:00.000Z",
        startedAt: "2026-07-13T12:00:02.000Z",
        durationMs: 10_000,
        metadata: {
          progressMode: "exact",
          processedItems: 2,
          completedItems: 1,
          failedItems: 1,
          totalItems: 4,
        },
      },
      Date.parse("2026-07-13T12:00:12.000Z"),
    );

    expect(item.progressPercent).toBe(50);
    expect(item.queuedMs).toBe(2_000);
    expect(item.runtimeMs).toBe(10_000);
    expect(item.active).toBe(true);
  });

  test("uses finishedAt for completed totals instead of the current clock", () => {
    const item = normalizeActivityRun(
      {
        id: "run_done",
        taskIdentifier: "pindeck-image-refresh",
        status: "COMPLETED",
        queuedAt: "2026-07-13T12:00:00.000Z",
        startedAt: "2026-07-13T12:00:01.000Z",
        finishedAt: "2026-07-13T12:00:05.000Z",
        durationMs: 4_000,
      },
      Date.parse("2026-07-13T13:00:00.000Z"),
    );
    expect(item.totalMs).toBe(5_000);
    expect(item.runtimeMs).toBe(4_000);
  });

  test("advances active runtime even when Trigger reports a zero duration", () => {
    const run = normalizeActivityRun(
      {
        id: "run_active",
        taskIdentifier: "pindeck-generate-variations",
        status: "EXECUTING",
        queuedAt: "2026-07-13T20:00:00.000Z",
        startedAt: "2026-07-13T20:00:01.000Z",
        durationMs: 0,
      },
      new Date("2026-07-13T20:00:06.000Z").getTime(),
    );

    expect(run.runtimeMs).toBe(5_000);
  });

  test("does not invent provider percentages", () => {
    const item = normalizeActivityRun({
      id: "run_child",
      taskIdentifier: "pindeck-generate-variation-item",
      status: "EXECUTING",
      metadata: { progressMode: "provider", providerStatus: "IN_PROGRESS" },
    });
    expect(item.progressMode).toBe("provider");
    expect(item.progressPercent).toBeUndefined();
  });

  test("refreshes a 15-minute token before expiry", () => {
    const now = Date.parse("2026-07-13T12:00:00.000Z");
    expect(workActivityTokenRefreshDelay(now + 15 * 60_000, now)).toBe(
      13.5 * 60_000,
    );
  });

  test("retries expired-token and connection recovery without a tight loop", () => {
    const now = Date.parse("2026-07-13T12:00:00.000Z");
    expect(workActivityTokenRefreshDelay(now - 1, now)).toBe(
      WORK_ACTIVITY_RETRY_MS,
    );
  });

  test("immediately rotates an invalid realtime token", () => {
    expect(
      workActivityReconnectDelay(
        'HTTP Error 401: {"error":"Public Access Token is invalid"}',
      ),
    ).toBe(0);
  });

  test("backs off non-auth realtime reconnects", () => {
    expect(workActivityReconnectDelay("Realtime connection interrupted")).toBe(
      WORK_ACTIVITY_RETRY_MS,
    );
  });

  test("groups child runs beneath their parent in item order", () => {
    const grouped = groupActivityRuns([
      {
        id: "child-2",
        taskIdentifier: "pindeck-generate-variation-item",
        status: "QUEUED",
        metadata: { parentRunId: "parent", itemIndex: 1 },
      },
      {
        id: "parent",
        taskIdentifier: "pindeck-generate-variations",
        status: "EXECUTING",
      },
      {
        id: "child-1",
        taskIdentifier: "pindeck-generate-variation-item",
        status: "COMPLETED",
        metadata: { parentRunId: "parent", itemIndex: 0 },
      },
    ]);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].children.map((child) => child.id)).toEqual([
      "child-1",
      "child-2",
    ]);
  });

  test("surfaces partial and child failures on the parent group", () => {
    const [parent] = groupActivityRuns([
      {
        id: "parent-partial",
        taskIdentifier: "pindeck-generate-variations",
        status: "COMPLETED",
        metadata: { completedItems: 1, failedItems: 1, totalItems: 2 },
      },
      {
        id: "child-failed",
        taskIdentifier: "pindeck-generate-variation-item",
        status: "FAILED",
        metadata: { parentRunId: "parent-partial", itemIndex: 1 },
      },
    ]);
    expect(hasActivityFailure(parent)).toBe(true);
  });

  test("formats durations for realtime display", () => {
    expect(formatActivityDuration(820)).toBe("820ms");
    expect(formatActivityDuration(4_200)).toBe("4.2s");
    expect(formatActivityDuration(72_000)).toBe("1m 12s");
  });
});
