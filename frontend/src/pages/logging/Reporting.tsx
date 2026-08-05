import { useMemo, useState } from "react";
import { formatTotal } from "../../helpers/Calculations";

type FetchInterval = 60 | 30 | 5;

export default function Reporting() {
  const [fetchInterval, setFetchInterval] = useState<FetchInterval>(60);
  const intervalLabel = fetchInterval === 60 ? "1 hour" : `${fetchInterval} minutes`;
  const rows = useMemo(() => {
    const anchor = new Date(2026, 6, 23, 14);
    return Array.from({ length: 12 }, (_, index) => {
      const point = new Date(anchor.getTime() - index * fetchInterval * 60_000);
      const elapsedHours = (index * fetchInterval) / 60;
      return {
        day: point.toLocaleDateString("en-US", { weekday: "long" }),
        date: point.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
        hour: point.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        fetched: new Date(point.getTime() + 300_000 + (index % 6) * 1000).toLocaleTimeString("en-GB"),
        tf: Number((7253 - index * 18.7 + Math.sin(index * 1.4) * 52).toFixed(1)),
        tt: Math.round(58_437_496 - elapsedHours * 7_253),
        df: Number((6432 - index * 16.2 + Math.cos(index * 1.2) * 44).toFixed(1)),
        dt: Math.round(53_289_641 - elapsedHours * 6_432),
      };
    });
  }, [fetchInterval]);

  return <div className="content reporting-page">
    <section className="page-heading"><div><p className="eyebrow">OPERATIONS LOG</p><h1>Reporting</h1><p>Hourly transmission and distribution measurements across all active sites.</p></div><div className="live"><i /> Auto-fetch active <span>Every {intervalLabel}</span></div></section>
    <section className="report-panel">
      <div className="report-toolbar"><div><h2>Hourly flow report</h2><p>23 July 2026 · All sites combined</p></div><div className="report-actions"><label><span>FETCH INTERVAL</span><select value={fetchInterval} onChange={(event) => setFetchInterval(Number(event.target.value) as FetchInterval)}><option value={60}>1 hour</option><option value={30}>30 minutes</option><option value={5}>5 minutes</option></select></label><label><span>DATE</span><input type="date" defaultValue="2026-07-23" /></label><button className="export-button">Export CSV</button></div></div>
      <div className="table-scroll"><table><thead><tr><th rowSpan={2}>Day</th><th rowSpan={2}>Date</th><th rowSpan={2}>Hour</th><th rowSpan={2}>Hours fetched</th><th colSpan={2} className="group transmission-group">Transmission</th><th colSpan={2} className="group distribution-group">Distribution</th></tr><tr><th>Flowrate <small>m³/h</small></th><th>Totalizer <small>m³</small></th><th>Flowrate <small>m³/h</small></th><th>Totalizer <small>m³</small></th></tr></thead><tbody>{rows.map((row) => <tr key={row.hour}><td>{row.day}</td><td>{row.date}</td><td className="mono bright">{row.hour}</td><td><span className="fetched"><i />{row.fetched}</span></td><td className="mono flow-value">{formatTotal(row.tf)}</td><td className="mono">{formatTotal(row.tt)}</td><td className="mono flow-value distribution-value">{formatTotal(row.df)}</td><td className="mono">{formatTotal(row.dt)}</td></tr>)}</tbody></table></div>
      <div className="table-footer"><span>Showing {rows.length} records · {intervalLabel} interval</span><span>Last fetched at {rows[0].fetched} WIB</span></div>
    </section>
  </div>;
}
