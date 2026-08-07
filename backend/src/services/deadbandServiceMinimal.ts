import type { ActivePlcTag, MeasurementState } from "../types/plc.js";

export type SaveReason =
  | "first-reading"
  | "maximum-interval"
  | "deadband-exceeded"
  | "unchanged"
  | "within-deadband"
  | "cached for hourly fetch";

export interface DeadbandDecision {
  shouldSave: boolean;
  reason: SaveReason;
}

interface EvaluateDeadbandInput {
  tag: ActivePlcTag;
  currentValue: number;
  fetchedAt: Date;
  previousState?: MeasurementState;
}

export function evaluateDeadband({
  tag,
  currentValue,
  fetchedAt,
  previousState,
}: EvaluateDeadbandInput): DeadbandDecision {
  // An unseen tag must always save its first valid reading.
  if (previousState === undefined) {
    return {
      shouldSave: true,
      reason: "first-reading",
    };
  }

  const elapsedMilliseconds =
    fetchedAt.getTime() - previousState.lastSavedAt.getTime();

  const maximumIntervalMilliseconds = tag.maxSaveIntervalSeconds * 1000;

  if (elapsedMilliseconds >= maximumIntervalMilliseconds) {
    return {
      shouldSave: true,
      reason: "maximum-interval",
    };
  }

  const absoluteChange = Math.abs(currentValue - previousState.lastSavedValue);

  if (tag.deadbandType === "none") {
    const changed = currentValue !== previousState.lastSavedValue;

    return {
      shouldSave: changed,
      reason: changed ? "deadband-exceeded" : "unchanged",
    };
  }

  if (tag.deadbandType === "absolute") {
    const exceeded = absoluteChange >= tag.deadbandValue;

    return {
      shouldSave: exceeded,
      reason: exceeded ? "deadband-exceeded" : "within-deadband",
    };
  }

  if (tag.deadbandType === "percentage") {
    if (previousState.lastSavedValue === 0) {
      const changed = currentValue !== 0;

      return {
        shouldSave: changed,
        reason: changed ? "deadband-exceeded" : "unchanged",
      };
    }

    const percentageChange =
      (absoluteChange / Math.abs(previousState.lastSavedValue)) * 100;

    const exceeded = percentageChange >= tag.deadbandValue;

    return {
      shouldSave: exceeded,
      reason: exceeded ? "deadband-exceeded" : "within-deadband",
    };
  }

  throw new Error(`Unsupported deadband type: ${tag.deadbandType}`);
}
