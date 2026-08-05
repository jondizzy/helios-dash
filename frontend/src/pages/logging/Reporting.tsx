import { useEffect, useMemo, useState } from "react";
import { getReportMeasurements, type Measurement } from "../../api/measurementApi";
import { exportMeasurementsExcel } from "../../helpers/exportMeasurementsExcel";
import { formatTotal } from "../../helpers/Calculations";
import { useMeasurements } from "../../hooks/useMeasurements";

type RefreshInterval = 5 | 30 | 60;

function localDateKey(value: string | Date) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function SiteTable({ siteName, rows }: { siteName: string; rows: Measurement[] }) {
  const pageSize = 10;
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const firstRow = rows.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRow = Math.min(page * pageSize, rows.length);

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  return <section className="report-panel site-report-panel">
    <div className="site-report-heading"><div><span className="site-report-badge">{siteName.slice(0, 2).toUpperCase()}</span><div><h2>{siteName}</h2><p>PLC measurement log</p></div></div><strong>{rows.length} records</strong></div>
    <div className="table-scroll"><table className="site-report-table"><thead><tr><th>ID</th><th>Tag</th><th>Value</th><th>Unit</th><th>Date</th><th>Fetched at</th></tr></thead><tbody>{pageRows.map((row) => { const fetchedAt = new Date(row.fetchedAt); return <tr key={row.id}><td className="mono">{row.id}</td><td className="bright">{row.tagName}</td><td className="mono flow-value">{formatTotal(row.value_number)}</td><td>{row.unit ?? "—"}</td><td>{fetchedAt.toLocaleDateString("en-GB")}</td><td><span className="fetched"><i />{fetchedAt.toLocaleTimeString("en-GB")} WIB</span></td></tr>; })}</tbody></table></div>
    <div className="table-footer paginated-footer"><span>Showing {firstRow}–{lastRow} of {rows.length} · Latest first</span><div className="pagination"><button type="button" onClick={() => setPage((current) => current - 1)} disabled={page === 1} aria-label={`Previous page for ${siteName}`}>‹</button><span>Page {page} of {pageCount}</span><button type="button" onClick={() => setPage((current) => current + 1)} disabled={page === pageCount} aria-label={`Next page for ${siteName}`}>›</button></div></div>
  </section>;
}

export default function Reporting() {
  const [refreshSeconds, setRefreshSeconds] = useState<RefreshInterval>(5);
  const [selectedDate, setSelectedDate] = useState(() => localDateKey(new Date()));
  const [exporting, setExporting] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportFrom, setExportFrom] = useState(() => localDateKey(new Date()));
  const [exportTo, setExportTo] = useState(() => localDateKey(new Date()));
  const [exportError, setExportError] = useState<string | null>(null);
  const { measurements, loading, error, lastUpdatedAt, refresh } = useMeasurements(refreshSeconds);
  const rows = useMemo(() => measurements
    .filter((measurement) => localDateKey(measurement.fetchedAt) === selectedDate)
    .sort((left, right) => new Date(right.fetchedAt).getTime() - new Date(left.fetchedAt).getTime()),
  [measurements, selectedDate]);
  const siteGroups = useMemo(() => {
    const groups = new Map<string, Measurement[]>();
    for (const row of rows) groups.set(row.plcName, [...(groups.get(row.plcName) ?? []), row]);
    return Array.from(groups, ([siteName, siteRows]) => ({ siteName, rows: siteRows }));
  }, [rows]);

  async function exportExcel() {
    if (exportFrom > exportTo) {
      setExportError("From date must be before or equal to To date.");
      return;
    }
    setExporting(true);
    setExportError(null);
    try {
      const reportMeasurements = await getReportMeasurements(exportFrom, exportTo);
      if (reportMeasurements.length === 0) {
        setExportError("No measurements were found in this date range.");
        return;
      }
      await exportMeasurementsExcel(reportMeasurements, `${exportFrom}-to-${exportTo}`);
      setExportMenuOpen(false);
    } catch (exportFailure) {
      setExportError(exportFailure instanceof Error ? exportFailure.message : "Unable to create Excel report.");
    } finally {
      setExporting(false);
    }
  }

  return <div className="content reporting-page">
    <section className="page-heading"><div><p className="eyebrow">OPERATIONS LOG</p><h1>Reporting</h1><p>Measurements received from the PLC polling backend.</p></div><div className={`live${error ? " live--error" : ""}`}><i /> {error ? "Connection issue" : "Auto-fetch active"}<span>Every {refreshSeconds} seconds</span></div></section>
    <section className="report-panel report-controls-panel">
      <div className="report-toolbar"><div><h2>PLC measurement log</h2><p>{selectedDate} · {siteGroups.length} active sites</p></div><div className="report-actions"><label><span>REFRESH INTERVAL</span><select value={refreshSeconds} onChange={(event) => setRefreshSeconds(Number(event.target.value) as RefreshInterval)}><option value={5}>5 seconds</option><option value={30}>30 seconds</option><option value={60}>1 minute</option></select></label><label><span>DATE</span><input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></label><div className="export-menu-wrap"><button className="export-button" onClick={() => { setExportMenuOpen((open) => !open); setExportError(null); }} aria-expanded={exportMenuOpen}>Export Excel</button>{exportMenuOpen && <div className="export-menu"><h3>Export date range</h3><p>Create one worksheet per site.</p><div className="export-date-fields"><label><span>FROM</span><input type="date" value={exportFrom} onChange={(event) => setExportFrom(event.target.value)} max={exportTo} /></label><label><span>TO</span><input type="date" value={exportTo} onChange={(event) => setExportTo(event.target.value)} min={exportFrom} /></label></div>{exportError && <div className="export-error">{exportError}</div>}<div className="export-menu-actions"><button type="button" className="export-cancel" onClick={() => setExportMenuOpen(false)} disabled={exporting}>Cancel</button><button type="button" className="export-button" onClick={() => void exportExcel()} disabled={exporting || !exportFrom || !exportTo}>{exporting ? "Creating…" : "Generate Excel"}</button></div></div>}</div><button className="export-button refresh-button" onClick={() => void refresh()} disabled={loading}>Refresh</button></div></div>
      {error && <div className="report-message report-message--error">{error}. Make sure the backend is running on port 3000.</div>}
      {loading && rows.length === 0 && <div className="report-message">Loading measurements…</div>}
      {!loading && !error && rows.length === 0 && <div className="report-message">No measurements found for {selectedDate}.</div>}
      <div className="table-footer"><span>Showing {rows.length} of {measurements.length} fetched records</span><span>{lastUpdatedAt ? `Last refreshed at ${lastUpdatedAt.toLocaleTimeString("en-GB")} WIB` : "Waiting for backend"}</span></div>
    </section>
    <div className="site-report-grid">{siteGroups.map((site) => <SiteTable key={site.siteName} siteName={site.siteName} rows={site.rows} />)}</div>
  </div>;
}
