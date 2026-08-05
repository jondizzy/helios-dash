import {
  getLatestMeasurementStates,
  insertMeasurement,
} from "../repositories/measurementRepository";

import {
  evaluateDeadband,
  type SaveReason,
} from "./deadbandServiceMinimal";

import type {
  ActivePlcTag,
  MeasurementState,
  SaveMeasurement,
} from "../types/plc";

export interface ProcessMeasurementResult {
  saved: boolean;
  reason: SaveReason;
  measurement?: SaveMeasurement;
}

const measurementStates = new Map<number, MeasurementState>();
let stateInitialized = false;

export async function initializeMeasurementService(): Promise<void> {
  if (stateInitialized) {
    return;
  }

  const savedStates = await getLatestMeasurementStates();

  measurementStates.clear();

  for (const [tagId, state] of savedStates) {
    measurementStates.set(tagId, state);
  }

  stateInitialized = true;
  console.log(
    `Measurement state initialized for` + `${measurementStates.size} tags.`,
  );
}

export async function processMeasurement(
  tag: ActivePlcTag,
  value_number: number,
  fetchedAt: Date,
): Promise<ProcessMeasurementResult> {
  if (!stateInitialized) {
    throw new Error("Measurement service not initialized");
  }

  if (!Number.isFinite(value_number)) {
    throw new Error(
      `Cannot save invalid values for tag` +
        `${tag.tagName}: ${String(value_number)}`,
    );
  }

  const previousState = measurementStates.get(tag.tagId);
  const decision = evaluateDeadband({
    tag,
    currentValue: value_number,
    fetchedAt,
    previousState,
  });

  if (!decision.shouldSave) {
    return {
      saved: false,
      reason: decision.reason,
    };
  }

  const measurement = await insertMeasurement({
    tagId: tag.tagId,
    value_number,
    fetchedAt,
  });

  measurementStates.set(tag.tagId, {
    lastSavedValue: measurement.value_number,
    lastSavedAt: measurement.fetchedAt,
  });

  return {
    saved: true,
    reason: decision.reason,
    measurement,
  };
}

export function getMeasurementState(
  tagId: number,
): MeasurementState | undefined {
  return measurementStates.get(tagId);
}

export function removeMeasurementState(tagId: number): void {
  measurementStates.delete(tagId);
}
