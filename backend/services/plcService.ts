import NodeS7 from "nodes7";

import type { ActivePlcTag, PlcConnectionConfig } from "../types/plc";
import { LargeNumberLike } from "crypto";

interface PlcClientState {
  client: NodeS7;
  config: PlcConnectionConfig;
  connected: boolean;
  connectingPromise: Promise<void> | null;
  tagAddress: Map<string, string>;
}

const plcClients = new Map<number, PlcClientState>();

function createInternalTagName(tagId: number): string {
  return `TAG_${tagId}`;
}

function createPlcClientState(config: PlcConnectionConfig): PlcClientState {
  const client = new NodeS7();
  const tagAddress = new Map<string, string>();

  client.setTranslationCB((internalTagName) => {
    return tagAddress.get(internalTagName);
  });

  return {
    client,
    config,
    connected: false,
    connectingPromise: null,
    tagAddress,
  };
}

function getOrCreatePlcClient(config: PlcConnectionConfig): PlcClientState {
  const existing = plcClients.get(config.plcId);

  if (existing) {
    return existing;
  }

  const state = createPlcClientState(config);

  plcClients.set(config.plcId, state);
  return state;
}

async function connectPlc(state: PlcClientState): Promise<void> {
  if (state.connected) {
    return;
  }

  if (state.connectingPromise) {
    return state.connectingPromise;
  }

  state.connectingPromise = new Promise<void>((resolve, reject) => {
    state.client.initiateConnection(
      {
        host: state.config.ipAddress,
        port: 102,
        rack: state.config.rack,
        slot: state.config.slot,
        timeout: 5000,
      },
      (error) => {
        state.connectingPromise = null;

        if (error) {
          state.connected = false;
          reject(
            new Error(
              `Could not connect to` +
                `${state.config.plcName}` +
                `${state.config.ipAddress}` +
                `${error.message}`,
            ),
          );
          return;
        }

        state.connected = true;

        console.log(
          `PLC connected: ${state.config.plcName}` +
            `${state.config.ipAddress}`,
        );

        resolve();
      },
    );
  });
  return state.connectingPromise;
}

function readAllItems(state: PlcClientState): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    state.client.readAllItems((error, values) => {
      if (error) {
        state.connected = false;
        reject(
          new Error(
            `PLC read failed for` +
              `${state.config.plcName}` +
              `${state.config.ipAddress}` +
              `${error.message}`,
          ),
        );
        return;
      }
      resolve(values);
    });
  });
}

export async function readPlcTag(tag: ActivePlcTag): Promise<{
  value: number;
  fetchedAt: Date;
}> {
  const config: PlcConnectionConfig = {
    plcId: tag.plcId,
    plcName: tag.plcName,
    ipAddress: tag.ipAddress,
    rack: tag.rack,
    slot: tag.slot,
  };

  const state = getOrCreatePlcClient(config);

  await connectPlc(state);

  const internalTagName = createInternalTagName(tag.tagId);

  state.tagAddress.set(internalTagName, tag.absoluteAddress);

  state.client.removeItems(internalTagName);
  state.client.addItems(internalTagName);

  try {
    const values = await readAllItems(state);
    const rawValue = values[internalTagName];

    if (typeof rawValue !== "number" || !Number.isFinite(rawValue)) {
      throw new Error(
        `Tag ${tag.tagName} returned invalid` + `${JSON.stringify(rawValue)}`,
      );
    }

    return {
      value: rawValue,
      fetchedAt: new Date(),
    };
  } catch (error) {
    state.connected = false;
    throw error;
  }
}

export async function disconnectAllPlcs(): Promise<void> {
  const disconnectPromises = Array.from(plcClients.values()).map(
    (state) =>
      new Promise<void>((resolve) => {
        try {
          state.client.dropConnection(() => {
            state.connected = false;
            resolve();
          });
        } catch {
          state.connected = false;
          resolve();
        }
      }),
  );

  await Promise.all(disconnectPromises);

  plcClients.clear();

  console.log("All PLC connections closed.");
}
