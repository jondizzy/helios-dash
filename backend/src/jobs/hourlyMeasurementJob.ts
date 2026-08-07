import { insertHourlyMeasurements } from "../repositories/measurementRepository";
import { getActivePlcTags } from "../repositories/tagRepository";
import {
  getLatestFetchedState,
  synchronizeSavedMeasurementStates,
} from "../services/measurementServiceMinimal";
import type { SaveMeasurementInput } from "../types/plc";

let hourlyTimer: NodeJS.Timeout | null = null;
let jobRunning = false;
let stopped = true;

export function millisecondsUntilNextHour(now = new Date()): number {
  const nextHour = new Date(now);
  nextHour.setHours(now.getHours() + 1, 0, 0, 0);
  return Math.max(0, nextHour.getTime() - now.getTime());
}

export function beginningOfCurrentHour(date = new Date()): Date {
  const hour = new Date(date);
  hour.setMinutes(0, 0, 0);
  return hour;
}

async function saveHourlyMeasurements(snapshotTime: Date): Promise<void> {
  if (jobRunning) {
    console.warn("Hourly save is already running; skipping duplicate run.");
    return;
  }

  jobRunning = true;
  try {
    const activeTags = await getActivePlcTags();
    const inputs: SaveMeasurementInput[] = [];

    for (const tag of activeTags) {
      const latestState = getLatestFetchedState(tag.tagId);
      if (!latestState) {
        console.warn(
          `Hourly snapshot has no fetched value for ${tag.plcName} / ${tag.tagName}.`,
        );
        continue;
      }

      inputs.push({
        tagId: tag.tagId,
        value_number: latestState.value_number,
        fetchedAt: snapshotTime,
      });
    }

    const saved = await insertHourlyMeasurements(inputs);
    synchronizeSavedMeasurementStates(saved);
    console.log(
      `${new Date().toISOString()} | HOURLY SNAPSHOT | ` +
        `${snapshotTime.toISOString()} | ${saved.length}/${inputs.length} values saved`,
    );
  } finally {
    jobRunning = false;
  }
}

function scheduleNextHour(): void {
  if (stopped) return;

  const now = new Date();
  const delay = millisecondsUntilNextHour(now);
  const scheduledFor = new Date(now.getTime() + delay);
  console.log(
    `Next hourly measurement snapshot: ${scheduledFor.toISOString()}`,
  );

  hourlyTimer = setTimeout(() => {
    hourlyTimer = null;
    const snapshotTime = beginningOfCurrentHour(new Date());
    void saveHourlyMeasurements(snapshotTime)
      .catch((error) => {
        console.error("Hourly measurement snapshot failed", error);
      })
      .finally(() => scheduleNextHour());
  }, delay);
}

export function startHourlyMeasurementJob(): void {
  if (!stopped) return;
  stopped = false;
  scheduleNextHour();
}

export function stopHourlyMeasurementJob(): void {
  stopped = true;
  if (hourlyTimer) {
    clearTimeout(hourlyTimer);
    hourlyTimer = null;
  }
  console.log("Hourly measurement job stopped");
}
