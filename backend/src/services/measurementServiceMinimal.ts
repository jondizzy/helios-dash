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

export interface LatestFetchedState {
  value_number: number;
  fetchedAt: Date;
}
const latestFetchedState = new Map<number, LatestFetchedState>();

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

//check for xx:00 + 5 mins fetch. if it's gone, remove this version and use ln. 115 instead
// export async function processMeasurement(
//   tag: ActivePlcTag,
//   value: number,
//   fetchedAt: Date,
// ): Promise<ProcessMeasurementResult> {
//   if (!initialized) {
//     throw new Error("Measurement service has not been initialized.");
//   }

//   if (!Number.isFinite(value)) {
//     throw new Error(`Invalid value for ${tag.tagName}: ${String(value)}`);
//   }

//   latestFetchedState.set(tag.tagId, {
//     value_number: value,
//     fetchedAt,
//   });

//   const previousState = measurementStates.get(tag.tagId);

//   const decision = evaluateDeadband({
//     tag,
//     currentValue: value,
//     fetchedAt,
//     previousState,
//   });

//   console.log("Measurement decision:", {
//     tagId: tag.tagId,
//     value,
//     previousState:
//       previousState === undefined
//         ? null
//         : {
//             value: previousState.lastSavedValue,
//             savedAt: previousState.lastSavedAt.toISOString(),
//           },
//     shouldSave: decision.shouldSave,
//     reason: decision.reason,
//   });

//   if (decision.shouldSave === false) {
//     return {
//       saved: false,
//       reason: decision.reason,
//     };
//   }

//   const saveMeasurement = await insertMeasurement({
//     tagId: tag.tagId,
//     value_number: value,
//     fetchedAt,
//   });

//   // Only update after PostgreSQL confirms the insert.
//   measurementStates.set(tag.tagId, {
//     lastSavedValue: saveMeasurement.value_number,
//     lastSavedAt: saveMeasurement.fetchedAt,
//   });

//   return {
//     saved: true,
//     reason: decision.reason,
//     measurement: saveMeasurement,
//   };
// }

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

  // Keep the newest valid PLC reading in memory.
  // The hourly job will save this value at exactly xx:00.
  latestFetchedState.set(tag.tagId, {
    value_number: value,
    fetchedAt,
  });

  return {
    saved: false,
    reason: "cached for hourly fetch",
  };
}
export function getLatestFetchedState(
  tagId: number,
): LatestFetchedState | undefined {
  return latestFetchedState.get(tagId);
}

export function synchronizeSavedMeasurementStates(
  measurements: SaveMeasurement[],
): void {
  for (const measurement of measurements) {
    measurementStates.set(measurement.tagId, {
      lastSavedValue: measurement.value_number,
      lastSavedAt: measurement.fetchedAt,
    });
  }
}
