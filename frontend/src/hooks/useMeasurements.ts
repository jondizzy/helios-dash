import { useCallback, useEffect, useState } from "react";
import { getMeasurements, type Measurement } from "../api/measurementApi";

export function useMeasurements(refreshSeconds: number) {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await getMeasurements(signal);
      setMeasurements(data);
      setLastUpdatedAt(new Date());
      setError(null);
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === "AbortError") return;
      setError(requestError instanceof Error ? requestError.message : "Unable to fetch measurements");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void refresh(controller.signal);
    const timer = window.setInterval(() => void refresh(), refreshSeconds * 1000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [refresh, refreshSeconds]);

  return { measurements, loading, error, lastUpdatedAt, refresh };
}
