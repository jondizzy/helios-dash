import type { ActivePlcTag, MeasurementState } from "../types/plc";

export interface DeadbandDecision {
  shouldSave: boolean;
  reason:
    | "first-read"
    | "max-interval"
    | "deadband-exceeded"
    | "unchanged"
    | "within-deadband";
}

interface DeadbandDecisionInput {
  tag: ActivePlcTag;
  currentValue: number;
  fetchedAt: Date;
  previousState: MeasurementState | undefined;
}

export function evaluateDeadband({
  tag,
  currentValue,
  fetchedAt,
  previousState,
}: DeadbandDecisionInput): DeadbandDecision {
  if (!Number.isFinite(currentValue)) {
    throw new Error(`Tag ${tag.tagName} returned a non-finite value.`);
  }

  if (!previousState) {
    return {
      shouldSave: true,
      reason: "first-read",
    };
  }

  const elapsedMilliseconds =
    fetchedAt.getTime() - previousState.lastSavedAt.getTime();

  const maximumIntervalMilliseconds = tag.maxSaveIntervalSeconds * 1000;

  if (elapsedMilliseconds >= maximumIntervalMilliseconds) {
    return {
      shouldSave: true,
      reason: "max-interval",
    };
  }

  const absoluteChange = Math.abs(currentValue - previousState.lastSavedValue);

  switch (tag.deadbandType) {
    case "none": {
      const changed = currentValue !== previousState.lastSavedValue;

      return {
        shouldSave: changed,
        reason: changed ? "deadband-exceeded" : "unchanged",
      };
    }

    case "absolute": {
      const exceeded = absoluteChange >= tag.deadbandValue;

      return {
        shouldSave: exceeded,
        reason: exceeded ? "deadband-exceeded" : "within-deadband",
      };
    }

    case "percentage": {
      const previousValue = previousState.lastSavedValue;

      if (previousValue === 0) {
        const changed = currentValue !== 0;

        return {
          shouldSave: changed,
          reason: changed ? "deadband-exceeded" : "unchanged",
        };
      }

      const percentageChange = (absoluteChange / Math.abs(previousValue)) * 100;

      const exceeded = percentageChange >= tag.deadbandValue;

      return {
        shouldSave: exceeded,
        reason: exceeded ? "deadband-exceeded" : "within-deadband",
      };
    }

    default: {
      const exhaustiveCheck: never = tag.deadbandType;

      throw new Error(`Unsupported deadband type: ${exhaustiveCheck}`);
    }
  }
}
