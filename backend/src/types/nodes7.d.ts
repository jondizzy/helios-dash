declare module "nodes7" {
  export interface NodeS7ConnectionOptions {
    host: string;
    port?: number;
    rack?: number;
    slot?: number;
    timeout?: number;
  }

  export type TranslationCallback = (tagName: string) => string | undefined;

  export type ConnectionCallback = (error?: Error | null) => void;

  export type ReadCallback = (
    error: Error | null,
    values: Record<string, unknown>,
  ) => void;

  export default class NodeS7 {
    initiateConnection(
      options: NodeS7ConnectionOptions,
      callback: ConnectionCallback,
    ): void;

    dropConnection(callback?: () => void): void;

    setTranslationCB(callback: TranslationCallback): void;

    addItems(Items: string | string[]): void;
    removeItems(Items: string | string[]): void;
    readAllItems(callback: ReadCallback): void;
  }
}
