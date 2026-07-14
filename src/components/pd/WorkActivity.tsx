import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAction } from "convex/react";
import { useRealtimeRunsWithTag } from "@trigger.dev/react-hooks";

import { api } from "../../../convex/_generated/api";
import { PinIcon } from "@/components/ui/pindeck";
import {
  formatActivityDuration,
  groupActivityRuns,
  hasActivityFailure,
  WORK_ACTIVITY_RETRY_MS,
  workActivityReconnectDelay,
  workActivityTokenRefreshDelay,
  type ActivityRunInput,
  type WorkActivityItem,
} from "@/lib/workActivity";

type WorkActivityProps = {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
};

type ActivityCredentials = {
  accessToken: string;
  baseURL: string;
  tag: string;
  expiresAt: number;
};

export function WorkActivity({ open, onToggle, onClose }: WorkActivityProps) {
  const createToken = useAction(api.triggerDispatch.createWorkActivityToken);
  const [credentials, setCredentials] = useState<ActivityCredentials>();
  const [credentialVersion, setCredentialVersion] = useState(0);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [tokenError, setTokenError] = useState<string>();
  const [realtimeError, setRealtimeError] = useState<string>();
  const [realtimeRuns, setRealtimeRuns] = useState<ActivityRunInput[]>([]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let cancelled = false;
    let refreshTimer: number | undefined;
    const refresh = async () => {
      try {
        const next = await createToken({});
        if (cancelled) return;
        setCredentials(next);
        setCredentialVersion((value) => value + 1);
        setTokenError(undefined);
        setRealtimeError(undefined);
        const refreshIn = workActivityTokenRefreshDelay(next.expiresAt);
        refreshTimer = window.setTimeout(refresh, refreshIn);
      } catch (error) {
        if (cancelled) return;
        setTokenError(error instanceof Error ? error.message : String(error));
        refreshTimer = window.setTimeout(refresh, WORK_ACTIVITY_RETRY_MS);
      }
    };
    void refresh();
    return () => {
      cancelled = true;
      if (refreshTimer !== undefined) window.clearTimeout(refreshTimer);
    };
  }, [createToken, refreshNonce]);

  useEffect(() => {
    if (!realtimeError) return;
    const timer = window.setTimeout(
      () => setRefreshNonce((value) => value + 1),
      workActivityReconnectDelay(realtimeError),
    );
    return () => window.clearTimeout(timer);
  }, [realtimeError]);

  const handleRealtimeSnapshot = useCallback(
    (nextRuns: ActivityRunInput[], error?: string) => {
      setRealtimeRuns(nextRuns);
      setRealtimeError(error);
    },
    [],
  );

  const activity = useMemo(
    () => groupActivityRuns(realtimeRuns, now),
    [realtimeRuns, now],
  );
  const active = activity.filter((run) => run.active);
  const failed = activity.filter(hasActivityFailure);
  const primary = active[0];

  useEffect(() => {
    if (!active.length) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [active.length]);

  const connectionError = tokenError || realtimeError;

  return (
    <>
      {credentials && (
        <WorkActivitySubscription
          key={credentialVersion}
          credentials={credentials}
          subscriptionId={`pindeck-work-activity-${credentialVersion}`}
          onSnapshot={handleRealtimeSnapshot}
        />
      )}
      <button
        type="button"
        className={`pd-work-trigger${open ? " is-active" : ""}${active.length ? " has-live-work" : ""}`}
        onClick={onToggle}
        aria-expanded={open}
        aria-controls="pindeck-work-activity"
        title="Work activity"
      >
        <span className="pd-work-trigger-signal" aria-hidden="true" />
        <span className="pd-work-trigger-label">Work</span>
        <span className="pd-work-trigger-value">
          {active.length
            ? primary?.progressPercent !== undefined
              ? `${primary.progressPercent}%`
              : active.length
            : failed.length
              ? "!"
              : "0"}
        </span>
      </button>

      {open && (
        <section
          id="pindeck-work-activity"
          className="pd-glass-panel pd-fade-in pd-work-panel"
          aria-label="Work activity"
        >
          <header className="pd-glass-header pd-work-panel-header">
            <div className="pd-work-panel-title">
              <PinIcon name="sparkle" size={12} />
              <span>Work activity</span>
              <span className="pd-work-panel-live">
                <span className="pd-work-panel-live-dot" /> realtime
              </span>
            </div>
            <button
              type="button"
              className="pd-work-close"
              onClick={onClose}
              aria-label="Close work activity"
            >
              <PinIcon name="close" size={11} />
            </button>
          </header>

          <div className="pd-work-summary pd-mono">
            <span>
              <b>{active.length}</b> active
            </span>
            <span>
              <b>
                {activity.filter((run) => run.status === "COMPLETED").length}
              </b>{" "}
              completed
            </span>
            <span className={failed.length ? "is-failed" : ""}>
              <b>{failed.length}</b> failed
            </span>
            <span className="pd-work-summary-window">last 24h</span>
          </div>

          <div className="pd-work-list pd-scroll">
            {connectionError ? (
              <div className="pd-work-empty is-error">
                <strong>Realtime connection interrupted</strong>
                <span>{connectionError}</span>
              </div>
            ) : !credentials ? (
              <div className="pd-work-empty">
                <span className="pd-work-loading-bar" />
                <span>Connecting to Pindeck work…</span>
              </div>
            ) : activity.length === 0 ? (
              <div className="pd-work-empty">
                <PinIcon name="film" size={22} stroke={1.2} />
                <strong>No work in the last 24 hours</strong>
                <span>
                  Uploads, imports, analysis, repairs, and generations will
                  appear here live.
                </span>
              </div>
            ) : (
              activity.map((item) => <ActivityRow key={item.id} item={item} />)
            )}
          </div>
        </section>
      )}
    </>
  );
}

function WorkActivitySubscription({
  credentials,
  subscriptionId,
  onSnapshot,
}: {
  credentials: ActivityCredentials;
  subscriptionId: string;
  onSnapshot: (runs: ActivityRunInput[], error?: string) => void;
}) {
  const { runs, error } = useRealtimeRunsWithTag(credentials.tag, {
    id: subscriptionId,
    accessToken: credentials.accessToken,
    baseURL: credentials.baseURL,
    createdAt: "1d",
    skipColumns: ["payload", "output"],
    throttleInMs: 100,
  });

  useEffect(() => {
    onSnapshot(runs as unknown as ActivityRunInput[], error?.message);
  }, [error?.message, onSnapshot, runs]);

  return null;
}

function ActivityRow({
  item,
  child = false,
}: {
  item: WorkActivityItem;
  child?: boolean;
}) {
  const [expanded, setExpanded] = useState(
    item.active || hasActivityFailure(item),
  );
  const hasDetails =
    item.children.length > 0 || item.providerMessage || item.error;
  return (
    <article
      className={`pd-work-row${child ? " is-child" : ""}${item.failed ? " is-failed" : ""}`}
    >
      <button
        type="button"
        className="pd-work-row-main"
        onClick={() => hasDetails && setExpanded((value) => !value)}
        aria-expanded={hasDetails ? expanded : undefined}
      >
        <span className={`pd-work-status-dot is-${activityTone(item)}`} />
        <span className="pd-work-row-copy">
          <span className="pd-work-row-heading">
            <strong>{item.taskLabel}</strong>
            <span className="pd-mono">
              {formatActivityDuration(item.totalMs)}
            </span>
          </span>
          <span className="pd-work-row-stage">{item.stageLabel}</span>
        </span>
        {item.progressPercent !== undefined ? (
          <span className="pd-work-row-percent pd-mono">
            {item.progressPercent}%
          </span>
        ) : item.active ? (
          <span className="pd-work-row-spinner" aria-label="In progress" />
        ) : hasDetails ? (
          <PinIcon
            name={expanded ? "chevron-down" : "chevron-right"}
            size={11}
          />
        ) : null}
      </button>

      <div
        className={`pd-work-progress${item.progressPercent === undefined && item.active ? " is-indeterminate" : ""}`}
      >
        <span
          style={{
            width: `${item.progressPercent ?? (item.active ? 38 : 100)}%`,
          }}
        />
      </div>

      <div className="pd-work-row-meta pd-mono">
        {item.totalItems !== undefined && (
          <span>
            {item.processedItems ??
              (item.completedItems ?? 0) + (item.failedItems ?? 0)}
            /{item.totalItems} items
          </span>
        )}
        {item.queuedMs !== undefined && (
          <span>queue {formatActivityDuration(item.queuedMs)}</span>
        )}
        {item.runtimeMs !== undefined && (
          <span>run {formatActivityDuration(item.runtimeMs)}</span>
        )}
        {item.providerStatus && (
          <span>{item.providerStatus.toLowerCase().replaceAll("_", " ")}</span>
        )}
      </div>

      {expanded && hasDetails && (
        <div className="pd-work-row-details">
          {item.providerMessage && <p>{item.providerMessage}</p>}
          {item.error && <p className="is-error">{item.error}</p>}
          {item.children.map((childItem) => (
            <ActivityRow key={childItem.id} item={childItem} child />
          ))}
        </div>
      )}
    </article>
  );
}

function activityTone(item: WorkActivityItem) {
  if (hasActivityFailure(item)) return "failed";
  if (item.status === "COMPLETED") return "completed";
  if (item.active) return "active";
  return "muted";
}
