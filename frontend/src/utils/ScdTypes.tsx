export type PipeStatus = "Normal" | "Warning" | "Offline";

export type Pipe = {
  id: string;
  site: string;
  location: string;
  transmission: { flowrate: number; totalizer: number; status: PipeStatus };
  distribution: { flowrate: number; totalizer: number; status: PipeStatus };
};
