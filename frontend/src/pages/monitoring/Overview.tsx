import { useMemo, useState } from "react";
import { formatTotal } from "../../helpers/Calculations";
import Icon from "../../utils/NonLibShapes";
import type { Pipe, PipeStatus } from "../../utils/ScdTypes";

const sites: Pipe[] = [
  { id: "S-001", site: "Cikarang", location: "West Java", transmission: { flowrate: 1842.6, totalizer: 12850432, status: "Normal" }, distribution: { flowrate: 1721.4, totalizer: 11984720, status: "Normal" } },
  { id: "S-002", site: "Karawang", location: "West Java", transmission: { flowrate: 1624.1, totalizer: 10294718, status: "Normal" }, distribution: { flowrate: 1498.8, totalizer: 9871543, status: "Normal" } },
  { id: "S-003", site: "Bekasi", location: "West Java", transmission: { flowrate: 1218.7, totalizer: 8342571, status: "Normal" }, distribution: { flowrate: 1084.3, totalizer: 7812639, status: "Warning" } },
  { id: "S-004", site: "Tangerang", location: "Banten", transmission: { flowrate: 934.2, totalizer: 6439821, status: "Normal" }, distribution: { flowrate: 876.5, totalizer: 6021458, status: "Normal" } },
  { id: "S-005", site: "Serang", location: "Banten", transmission: { flowrate: 748.9, totalizer: 4928210, status: "Normal" }, distribution: { flowrate: 0, totalizer: 4387004, status: "Offline" } },
  { id: "S-006", site: "Bogor", location: "West Java", transmission: { flowrate: 884.5, totalizer: 5581744, status: "Normal" }, distribution: { flowrate: 812.6, totalizer: 5112397, status: "Normal" } },
];

function Status({ status }: { status: PipeStatus }) {
  return <span className={`status status--${status.toLowerCase()}`}><i />{status}</span>;
}

function PipeMetrics({ label, pipe }: { label: "Transmission" | "Distribution"; pipe: Pipe["transmission"] }) {
  const distribution = label === "Distribution";
  return (
    <div className="pipe-row">
      <div className="pipe-title">
        <span className={`pipe-symbol ${label.toLowerCase()}`}><i /><i />{distribution && <i />}</span>
        <div><b>{label}</b><small>{distribution ? "Local supply network" : "Primary inlet pipeline"}</small></div>
        <Status status={pipe.status} />
      </div>
      <div className="metrics">
        <div><span>FLOWRATE</span><strong className={pipe.status === "Offline" ? "muted-value" : ""}>{formatTotal(pipe.flowrate)} <small>m³/h</small></strong></div>
        <div><span>TOTALIZER</span><strong>{formatTotal(pipe.totalizer)} <small>m³</small></strong></div>
      </div>
    </div>
  );
}

export default function Overview() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"All sites" | PipeStatus>("All sites");
  const filteredSites = useMemo(() => sites.filter((site) =>
    `${site.site} ${site.location} ${site.id}`.toLowerCase().includes(query.toLowerCase()) &&
    (filter === "All sites" || site.transmission.status === filter || site.distribution.status === filter),
  ), [query, filter]);
  const totalFlow = sites.reduce((sum, site) => sum + site.transmission.flowrate + site.distribution.flowrate, 0);
  const totalVolume = sites.reduce((sum, site) => sum + site.transmission.totalizer + site.distribution.totalizer, 0);

  return <div className="content">
    <section className="page-heading"><div><p className="eyebrow">NETWORK MONITORING</p><h1>System overview</h1><p>Real-time transmission and distribution performance across all sites.</p></div><div className="live"><i /> Live data <span>Updated just now</span></div></section>
    <section className="summary-grid">
      <article><div className="summary-icon blue"><Icon name="pipe" /></div><div><span>ACTIVE SITES</span><strong>{sites.length}<small> / {sites.length}</small></strong><p><i /> All sites reporting</p></div></article>
      <article><div className="summary-icon cyan"><Icon name="chart" /></div><div><span>COMBINED FLOWRATE</span><strong>{formatTotal(Math.round(totalFlow))}<small> m³/h</small></strong><p>Transmission + distribution</p></div></article>
      <article><div className="summary-icon purple"><Icon name="grid" /></div><div><span>TOTAL VOLUME</span><strong>{(totalVolume / 1_000_000).toFixed(2)}<small> M m³</small></strong><p>Lifetime accumulated</p></div></article>
      <article><div className="summary-icon amber"><Icon name="alarm" /></div><div><span>ATTENTION REQUIRED</span><strong>2<small> points</small></strong><p className="amber-text">1 warning · 1 offline</p></div></article>
    </section>
    <section className="site-section">
      <div className="section-head"><div><h2>Site performance</h2><p>{filteredSites.length} of {sites.length} sites shown</p></div><div className="controls"><label className="search"><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search site..." /></label><div className="filters">{(["All sites", "Normal", "Warning", "Offline"] as const).map((item) => <button key={item} onClick={() => setFilter(item)} className={filter === item ? "active" : ""}>{item}</button>)}</div></div></div>
      <div className="site-grid">{filteredSites.map((site) => <article className="site-card" key={site.id}><div className="card-head"><div className="site-avatar">{site.site.slice(0, 2).toUpperCase()}</div><div><h3>{site.site}</h3><p>{site.location} <span>•</span> {site.id}</p></div><button aria-label={`Open ${site.site}`}><Icon name="chevron" /></button></div><PipeMetrics label="Transmission" pipe={site.transmission} /><PipeMetrics label="Distribution" pipe={site.distribution} /><div className="card-foot"><span>Last update: 2 sec ago</span><button>View details <Icon name="chevron" /></button></div></article>)}{filteredSites.length === 0 && <div className="empty">No sites match your search and status filter.</div>}</div>
    </section>
  </div>;
}
