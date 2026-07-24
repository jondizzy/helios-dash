import { useEffect, useMemo, useState } from "react";
import "./App.css";
import type { PipeStatus, Pipe } from "./assets/utils/ScdTypes";
import Icon from "./assets/utils/NonLibShapes";
import { formatTotal } from "./assets/pages/helpers/Calculations";

const sites: Pipe[] = [
  {
    id: "S-001",
    site: "Cikarang",
    location: "West Java",
    transmission: { flowrate: 1842.6, totalizer: 12850432, status: "Normal" },
    distribution: { flowrate: 1721.4, totalizer: 11984720, status: "Normal" },
  },
  {
    id: "S-002",
    site: "Karawang",
    location: "West Java",
    transmission: { flowrate: 1624.1, totalizer: 10294718, status: "Normal" },
    distribution: { flowrate: 1498.8, totalizer: 9871543, status: "Normal" },
  },
  {
    id: "S-003",
    site: "Bekasi",
    location: "West Java",
    transmission: { flowrate: 1218.7, totalizer: 8342571, status: "Normal" },
    distribution: { flowrate: 1084.3, totalizer: 7812639, status: "Warning" },
  },
  {
    id: "S-004",
    site: "Tangerang",
    location: "Banten",
    transmission: { flowrate: 934.2, totalizer: 6439821, status: "Normal" },
    distribution: { flowrate: 876.5, totalizer: 6021458, status: "Normal" },
  },
  {
    id: "S-005",
    site: "Serang",
    location: "Banten",
    transmission: { flowrate: 748.9, totalizer: 4928210, status: "Normal" },
    distribution: { flowrate: 0, totalizer: 4387004, status: "Offline" },
  },
  {
    id: "S-006",
    site: "Bogor",
    location: "West Java",
    transmission: { flowrate: 884.5, totalizer: 5581744, status: "Normal" },
    distribution: { flowrate: 812.6, totalizer: 5112397, status: "Normal" },
  },
];

function Status({ status }: { status: PipeStatus }) {
  return (
    <span className={`status status--${status.toLowerCase()}`}>
      <i />
      {status}
    </span>
  );
}

function App() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"All sites" | PipeStatus>("All sites");
  const [active, setActive] = useState("Overview");
  const [fetchInterval, setFetchInterval] = useState<60 | 30 | 5>(60);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredSites = useMemo(
    () =>
      sites.filter((site) => {
        const matchesQuery = `${site.site} ${site.location} ${site.id}`
          .toLowerCase()
          .includes(query.toLowerCase());
        const matchesStatus =
          filter === "All sites" ||
          site.transmission.status === filter ||
          site.distribution.status === filter;
        return matchesQuery && matchesStatus;
      }),
    [query, filter],
  );

  const totalFlow = sites.reduce(
    (sum, s) => sum + s.transmission.flowrate + s.distribution.flowrate,
    0,
  );
  const totalVolume = sites.reduce(
    (sum, s) => sum + s.transmission.totalizer + s.distribution.totalizer,
    0,
  );
  const intervalLabel =
    fetchInterval === 60 ? "1 hour" : `${fetchInterval} minutes`;
  const reportRows = useMemo(() => {
    const anchor = new Date(2026, 6, 23, 14, 0, 0);
    return Array.from({ length: 12 }, (_, index) => {
      const point = new Date(anchor.getTime() - index * fetchInterval * 60_000);
      const elapsedHours = (index * fetchInterval) / 60;
      return {
        day: point.toLocaleDateString("en-US", { weekday: "long" }),
        date: point.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        hour: point.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        fetched: new Date(
          point.getTime() + 5 * 60_000 + (index % 6) * 1000,
        ).toLocaleTimeString("en-GB"),
        tf: Number(
          (7253 - index * 18.7 + Math.sin(index * 1.4) * 52).toFixed(1),
        ),
        tt: Math.round(58_437_496 - elapsedHours * 7_253),
        df: Number(
          (6432 - index * 16.2 + Math.cos(index * 1.2) * 44).toFixed(1),
        ),
        dt: Math.round(53_289_641 - elapsedHours * 6_432),
      };
    });
  }, [fetchInterval]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <i />
            <i />
            <i />
          </span>
          <div>
            <b>
              FLOW<span>OPS</span>
            </b>
            <small>CONTROL CENTER</small>
          </div>
        </div>
        <nav>
          <p>MONITORING</p>
          {[
            ["Overview", "grid"],
            ["Pipe Network", "pipe"],
            ["Trends", "chart"],
            ["Alarms", "alarm"],
          ].map(([label, icon]) => (
            <button
              key={label}
              className={active === label ? "active" : ""}
              onClick={() => setActive(label)}
            >
              <Icon name={icon as "grid"} />
              {label}
              {label === "Alarms" && <em>2</em>}
            </button>
          ))}
          <p className="manage-label">MANAGEMENT</p>
          <button
            className={active === "System settings" ? "active" : ""}
            onClick={() => setActive("System settings")}
          >
            <Icon name="settings" />
            System settings
          </button>
          <p className="manage-label">LOGS</p>
          <button
            className={active === "Reporting" ? "active" : ""}
            onClick={() => setActive("Reporting")}
          >
            <Icon name="chart" />
            Reporting
          </button>
        </nav>
        <div className="sidebar-foot">
          <div className="operator">
            <span>OP</span>
            <div>
              <b>Operator 01</b>
              <small>Control room</small>
            </div>
            <Icon name="chevron" />
          </div>
          <button className="signout">
            <Icon name="logout" />
            Sign out
          </button>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div className="mobile-brand">
            FLOW<span>OPS</span>
          </div>
          <div className="system-state">
            <i /> SYSTEM ONLINE <span>•</span> ALL SERVICES OPERATIONAL
          </div>
          <div className="top-actions">
            <div className="clock">
              <b>
                {time.toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}{" "}
                WIB
              </b>
              <small>
                {time
                  .toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                  .toUpperCase()}
              </small>
            </div>
            <button className="notification" aria-label="Notifications">
              <Icon name="bell" />
              <i />
            </button>
          </div>
        </header>

        {active === "Reporting" ? (
          <div className="content reporting-page">
            <section className="page-heading">
              <div>
                <p className="eyebrow">OPERATIONS LOG</p>
                <h1>Reporting</h1>
                <p>
                  Hourly transmission and distribution measurements across all
                  active sites.
                </p>
              </div>
              <div className="live">
                <i /> Auto-fetch active <span>Every {intervalLabel}</span>
              </div>
            </section>
            <section className="report-panel">
              <div className="report-toolbar">
                <div>
                  <h2>Hourly flow report</h2>
                  <p>23 July 2026 · All sites combined</p>
                </div>
                <div className="report-actions">
                  <label>
                    <span>FETCH INTERVAL</span>
                    <select
                      value={fetchInterval}
                      onChange={(event) =>
                        setFetchInterval(
                          Number(event.target.value) as 60 | 30 | 5,
                        )
                      }
                    >
                      <option value={60}>1 hour</option>
                      <option value={30}>30 minutes</option>
                      <option value={5}>5 minutes</option>
                    </select>
                  </label>
                  <label>
                    <span>DATE</span>
                    <input type="date" defaultValue="2026-07-23" />
                  </label>
                  <button className="export-button">Export CSV</button>
                </div>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th rowSpan={2}>Day</th>
                      <th rowSpan={2}>Date</th>
                      <th rowSpan={2}>Hour</th>
                      <th rowSpan={2}>Hours fetched</th>
                      <th colSpan={2} className="group transmission-group">
                        Transmission
                      </th>
                      <th colSpan={2} className="group distribution-group">
                        Distribution
                      </th>
                    </tr>
                    <tr>
                      <th>
                        Flowrate <small>m³/h</small>
                      </th>
                      <th>
                        Totalizer <small>m³</small>
                      </th>
                      <th>
                        Flowrate <small>m³/h</small>
                      </th>
                      <th>
                        Totalizer <small>m³</small>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportRows.map((row) => (
                      <tr key={row.hour}>
                        <td>{row.day}</td>
                        <td>{row.date}</td>
                        <td className="mono bright">{row.hour}</td>
                        <td>
                          <span className="fetched">
                            <i />
                            {row.fetched}
                          </span>
                        </td>
                        <td className="mono flow-value">
                          {formatTotal(row.tf)}
                        </td>
                        <td className="mono">{formatTotal(row.tt)}</td>
                        <td className="mono flow-value distribution-value">
                          {formatTotal(row.df)}
                        </td>
                        <td className="mono">{formatTotal(row.dt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="table-footer">
                <span>
                  Showing {reportRows.length} records · {intervalLabel} interval
                </span>
                <span>Last fetched at {reportRows[0].fetched} WIB</span>
              </div>
            </section>
          </div>
        ) : (
          <div className="content">
            <section className="page-heading">
              <div>
                <p className="eyebrow">NETWORK MONITORING</p>
                <h1>System overview</h1>
                <p>
                  Real-time transmission and distribution performance across all
                  sites.
                </p>
              </div>
              <div className="live">
                <i /> Live data <span>Updated just now</span>
              </div>
            </section>

            <section className="summary-grid">
              <article>
                <div className="summary-icon blue">
                  <Icon name="pipe" />
                </div>
                <div>
                  <span>ACTIVE SITES</span>
                  <strong>
                    {sites.length}
                    <small> / {sites.length}</small>
                  </strong>
                  <p>
                    <i /> All sites reporting
                  </p>
                </div>
              </article>
              <article>
                <div className="summary-icon cyan">
                  <Icon name="chart" />
                </div>
                <div>
                  <span>COMBINED FLOWRATE</span>
                  <strong>
                    {formatTotal(Math.round(totalFlow))}
                    <small> m³/h</small>
                  </strong>
                  <p>Transmission + distribution</p>
                </div>
              </article>
              <article>
                <div className="summary-icon purple">
                  <Icon name="grid" />
                </div>
                <div>
                  <span>TOTAL VOLUME</span>
                  <strong>
                    {(totalVolume / 1_000_000).toFixed(2)}
                    <small> M m³</small>
                  </strong>
                  <p>Lifetime accumulated</p>
                </div>
              </article>
              <article>
                <div className="summary-icon amber">
                  <Icon name="alarm" />
                </div>
                <div>
                  <span>ATTENTION REQUIRED</span>
                  <strong>
                    2<small> points</small>
                  </strong>
                  <p className="amber-text">1 warning · 1 offline</p>
                </div>
              </article>
            </section>

            <section className="site-section">
              <div className="section-head">
                <div>
                  <h2>Site performance</h2>
                  <p>
                    {filteredSites.length} of {sites.length} sites shown
                  </p>
                </div>
                <div className="controls">
                  <label className="search">
                    <Icon name="search" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search site..."
                    />
                  </label>
                  <div className="filters">
                    {(
                      ["All sites", "Normal", "Warning", "Offline"] as const
                    ).map((item) => (
                      <button
                        key={item}
                        onClick={() => setFilter(item)}
                        className={filter === item ? "active" : ""}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="site-grid">
                {filteredSites.map((site) => (
                  <article className="site-card" key={site.id}>
                    <div className="card-head">
                      <div className="site-avatar">
                        {site.site.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3>{site.site}</h3>
                        <p>
                          {site.location} <span>•</span> {site.id}
                        </p>
                      </div>
                      <button aria-label={`Open ${site.site}`}>
                        <Icon name="chevron" />
                      </button>
                    </div>
                    <div className="pipe-row">
                      <div className="pipe-title">
                        <span className="pipe-symbol transmission">
                          <i />
                          <i />
                        </span>
                        <div>
                          <b>Transmission</b>
                          <small>Primary inlet pipeline</small>
                        </div>
                        <Status status={site.transmission.status} />
                      </div>
                      <div className="metrics">
                        <div>
                          <span>FLOWRATE</span>
                          <strong>
                            {formatTotal(site.transmission.flowrate)}{" "}
                            <small>m³/h</small>
                          </strong>
                        </div>
                        <div>
                          <span>TOTALIZER</span>
                          <strong>
                            {formatTotal(site.transmission.totalizer)}{" "}
                            <small>m³</small>
                          </strong>
                        </div>
                      </div>
                    </div>
                    <div className="pipe-row">
                      <div className="pipe-title">
                        <span className="pipe-symbol distribution">
                          <i />
                          <i />
                          <i />
                        </span>
                        <div>
                          <b>Distribution</b>
                          <small>Local supply network</small>
                        </div>
                        <Status status={site.distribution.status} />
                      </div>
                      <div className="metrics">
                        <div>
                          <span>FLOWRATE</span>
                          <strong
                            className={
                              site.distribution.status === "Offline"
                                ? "muted-value"
                                : ""
                            }
                          >
                            {formatTotal(site.distribution.flowrate)}{" "}
                            <small>m³/h</small>
                          </strong>
                        </div>
                        <div>
                          <span>TOTALIZER</span>
                          <strong>
                            {formatTotal(site.distribution.totalizer)}{" "}
                            <small>m³</small>
                          </strong>
                        </div>
                      </div>
                    </div>
                    <div className="card-foot">
                      <span>Last update: 2 sec ago</span>
                      <button>
                        View details <Icon name="chevron" />
                      </button>
                    </div>
                  </article>
                ))}
                {filteredSites.length === 0 && (
                  <div className="empty">
                    No sites match your search and status filter.
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
