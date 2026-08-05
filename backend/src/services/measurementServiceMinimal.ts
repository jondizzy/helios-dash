import {
  getLatestMeasurementStates,
  insertMeasurement,
} from "../repositories/measurementRepository.js";

import { evaluateDeadband, type SaveReason } from "./deadbandServiceMinimal.js";

import type {
  ActivePlcTag,
  MeasurementState,
  SaveMeasurement,
} from "../types/plc.js";

export interface ProcessMeasurementResult {
  saved: boolean;
  reason: SaveReason;
  measurement?: SaveMeasurement;
}

const measurementStates = new Map<number, MeasurementState>();

let initialized = false;

export async function initializeMeasurementService(): Promise<void> {
  measurementStates.clear();

  const states = await getLatestMeasurementStates();

  for (const [tagId, state] of states) {
    measurementStates.set(tagId, state);
  }

  initialized = true;

  console.log("Measurement service initialized:", {
    loadedStateCount: measurementStates.size,
    loadedTagIds: Array.from(measurementStates.keys()),
  });
}

export async function processMeasurement(
  tag: ActivePlcTag,
  value: number,
  fetchedAt: Date,
): Promise<ProcessMeasurementResult> {
  if (!initialized) {
    throw new Error("Measurement service has not been initialized.");
  }

  if (!Number.isFinite(value)) {
    throw new Error(`Invalid value for ${tag.tagName}: ${String(value)}`);
  }

  const previousState = measurementStates.get(tag.tagId);

  const decision = evaluateDeadband({
    tag,
    currentValue: value,
    fetchedAt,
    previousState,
  });

  console.log("Measurement decision:", {
    tagId: tag.tagId,
    value,
    previousState:
      previousState === undefined
        ? null
        : {
            value: previousState.lastSavedValue,
            savedAt: previousState.lastSavedAt.toISOString(),
          },
    shouldSave: decision.shouldSave,
    reason: decision.reason,
  });

  if (decision.shouldSave === false) {
    return {
      saved: false,
      reason: decision.reason,
    };
  }

  const saveMeasurement = await insertMeasurement({
    tagId: tag.tagId,
    value_number: value,
    fetchedAt,
  });

  // Only update after PostgreSQL confirms the insert.
  measurementStates.set(tag.tagId, {
    lastSavedValue: saveMeasurement.value_number,
    lastSavedAt: saveMeasurement.fetchedAt,
  });

  return {
    saved: true,
    reason: decision.reason,
    measurement: saveMeasurement,
  };
}
