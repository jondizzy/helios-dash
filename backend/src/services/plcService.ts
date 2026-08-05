import NodeS7 from "nodes7";

import type { ActivePlcTag, PlcConnectionConfig } from "../types/plc";

interface PlcClientState {
  client: NodeS7;
  config: PlcConnectionConfig;
  connected: boolean;
  connectingPromise: Promise<void> | null;
  operationQueue: Promise<void>;
  activeItem: string | null;
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
    operationQueue: Promise.resolve(),
    activeItem: null,
    tagAddress,
  };
}

/**
 * nodes7 keeps a mutable item list on the client. All tags belonging to one
 * PLC therefore have to configure and read that client sequentially.
 */
function enqueuePlcOperation<T>(
  state: PlcClientState,
  operation: () => Promise<T>,
): Promise<T> {
  const result = state.operationQueue.then(operation, operation);
  state.operationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
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
              `Could not connect to ` +
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

// function readAllItems(state: PlcClientState): Promise<Record<string, unknown>> {
//   return new Promise((resolve, reject) => {
//     state.client.readAllItems((error, values) => {
//       if (error) {
//         state.connected = false;
//         reject(
//           new Error(
//             `PLC read failed for` +
//               `${state.config.plcName}` +
//               `${state.config.ipAddress}` +
//               `${error.message}`,
//           ),
//         );
//         return;
//       }
//       resolve(values);
//     });
//   });
// }

function readAllItems(state: PlcClientState): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    state.client.readAllItems((anythingBad, values) => {
      if (!values) {
        reject(new Error(`PLC ${state.config.plcName} returned no values.`));
        return;
      }

      if (anythingBad) {
        console.warn(
          `PLC ${state.config.plcName} returned one or more bad-quality tags.`,
        );
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

  return enqueuePlcOperation(state, async () => {
    await connectPlc(state);

    const internalTagName = createInternalTagName(tag.tagId);
    state.tagAddress.set(internalTagName, tag.absoluteAddress);

    if (state.activeItem !== null) {
      state.client.removeItems(state.activeItem);
    }
    state.client.addItems(internalTagName);
    state.activeItem = internalTagName;

    try {
      const values = await readAllItems(state);
      const rawValue = values[internalTagName];

      if (typeof rawValue !== "number" || !Number.isFinite(rawValue)) {
        throw new Error(
          `Tag ${tag.tagName} (${tag.absoluteAddress}) returned invalid value: ` +
            `${JSON.stringify(rawValue)}`,
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
  });
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
