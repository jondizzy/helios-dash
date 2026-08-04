import { getActivePlcTags } from "../repositories/tagRepository";
import { processMeasurement } from "../services/measurementService";
import { readPlcTag } from "../services/plcService";

import type { ActivePlcTag } from "../types/plc";

interface TagPoller {
  tag: ActivePlcTag;
  timer: NodeJS.Timeout;
  running: boolean;
}

const pollers = new Map<number, TagPoller>();

let configurationRefreshTimer: NodeJS.Timeout | null = null;

async function pollTag(poller: TagPoller): Promise<void> {
  if (poller.running) {
    console.warn(
      `Skipped overlapping poll for tag: ` + `${poller.tag.tagName}`,
    );
    return;
  }
  poller.running = true;

  try {
    const { value, fetchedAt } = await readPlcTag(poller.tag);
    const result = await processMeasurement(poller.tag, value, fetchedAt);
    const timestamp = fetchedAt.toISOString();
    if (result.saved) {
      console.log(
        `${timestamp} | SAVED | ` +
          `${poller.tag.plcName} | ` +
          `${poller.tag.tagName} | ` +
          `${value} ${poller.tag.unit ?? ""} | ` +
          `${result.reason} | `,
      );
    } else {
      console.log(
        `${timestamp} | SKIPPED | ` +
          `${poller.tag.plcName} | ` +
          `${poller.tag.tagName} | ` +
          `${value} ${poller.tag.unit ?? ""} | ` +
          `${result.reason} | `,
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `${new Date().toISOString()} | ` +
        `Polling failed | ` +
        `${poller.tag.plcName} | ` +
        `${poller.tag.tagName} | ` +
        `${message} | `,
    );
  } finally {
    poller.running = false;
  }
}

function startTagPoller(tag: ActivePlcTag): void {
  if (pollers.has(tag.tagId)) {
    return;
  }

  const poller: TagPoller = {
    tag,
    running: false,
    timer: setInterval(() => {
      void pollTag(poller);
    }, tag.pollInterval),
  };

  pollers.set(tag.tagId, poller);

  console.log(
    `Started poller: ${tag.plcName} / ` +
      `${tag.tagName} every ` +
      `${tag.pollInterval} ms `,
  );
  void pollTag(poller);
}

function stopTagPoller(tagId: number): void {
  const poller = pollers.get(tagId);
  if (!poller) {
    return;
  }

  clearInterval(poller.timer);
  pollers.delete(tagId);
  console.log(`Stopper poller for tag ID ${tagId}`);
}

function tagConfigurationChanged(
  current: ActivePlcTag,
  incoming: ActivePlcTag,
): boolean {
  return (
    current.plcId !== incoming.plcId ||
    current.ipAddress !== incoming.ipAddress ||
    current.rack !== incoming.rack ||
    current.slot !== incoming.slot ||
    current.absoluteAddress !== incoming.absoluteAddress ||
    current.pollInterval !== incoming.pollInterval ||
    current.deadbandType !== incoming.deadbandType ||
    current.deadbandValue !== incoming.deadbandValue ||
    current.maxSaveIntervalSeconds !== incoming.maxSaveIntervalSeconds
  );
}
async function syncPollers(): Promise<void> {
  const activeTags = await getActivePlcTags();
  const incomingTagIds = new Set(activeTags.map((tag) => tag.tagId));

  for (const tag of activeTags) {
    const existing = pollers.get(tag.tagId);
    if (!existing) {
      startTagPoller(tag);
      continue;
    }

    if (tagConfigurationChanged(existing.tag, tag)) {
      stopTagPoller(tag.tagId);
      startTagPoller(tag);
    }
  }
  console.log(
    `PLC poller sync complete.` + `${pollers.size} active tag pollers.`,
  );
}

export async function startPlcPollingJob(): Promise<void> {
  await syncPollers();

  const refreshInterval = Number(process.env.PLC_CONFIG_REFRESH_MS ?? 60_000);

  configurationRefreshTimer = setInterval(() => {
    void syncPollers().catch((error) => {
      console.error("Failed to refresh configuration", error);
    });
  }, refreshInterval);
}

export function stopPlcPollingJob(): void {
  if (configurationRefreshTimer) {
    clearInterval(configurationRefreshTimer);
    configurationRefreshTimer = null;
  }

  for (const tagId of Array.from(pollers.keys())) {
    stopTagPoller(tagId);
  }
  console.log("PLC polling job stopped");
}
