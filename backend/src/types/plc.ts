export type DeadbandType = "none" | "absolute" | "percentage";

export interface ActivePlcTag {
  tagId: number;
  tagName: string;
  symbolicAddress: string;
  absoluteAddress: string;
  dataType: string;
  unit: string;

  plcId: number;
  plcName: string;
  ipAddress: string;
  rack: number;
  slot: number;

  pollInterval: number;
  deadbandType: DeadbandType;
  deadbandValue: number;
  maxSaveIntervalSeconds: number;
}

export interface PlcConnectionConfig {
  plcId: number;
  plcName: string;
  ipAddress: string;
  rack: number;
  slot: number;
}

export interface MeasurementState {
  lastSavedValue: number;
  lastSavedAt: Date;
}

export interface PlcReadResult {
  tagId: number;
  value: number;
  fetchedAt: Date;
}

export interface SaveMeasurementInput {
  tagId: number;
  value_number: number;
  fetchedAt: Date;
}

export interface SaveMeasurement {
  id: number;
  tagId: number;
  value_number: number;
  fetchedAt: Date;
}
