export interface Measurement {
  id: number;
  tagId: number;
  tagName: string;
  plcId: number;
  plcName: string;
  value_number: number;
  unit: string | null;
  fetchedAt: string;
}

interface MeasurementResponse {
  count: number;
  data: Measurement[];
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export async function getMeasurements(
  signal?: AbortSignal,
  limit = 1000,
): Promise<Measurement[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/measurements?limit=${limit}`,
    { signal },
  );

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;
    throw new Error(body?.message ?? `Measurement request failed (${response.status})`);
  }

  const body = (await response.json()) as MeasurementResponse;
  return body.data;
}

export async function getReportMeasurements(
  dateFrom: string,
  dateTo: string,
): Promise<Measurement[]> {
  const query = new URLSearchParams({ from: dateFrom, to: dateTo });
  const response = await fetch(`${API_BASE_URL}/api/measurements/report?${query}`);
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `Report request failed (${response.status})`);
  }
  const body = (await response.json()) as MeasurementResponse;
  return body.data;
}
