import Icon from "../../utils/NonLibShapes";
import type { PageName } from "../../utils/ScdTypes";

export default function Sidebar({
  active,
  setActive,
}: {
  active: PageName;
  setActive: (label: PageName) => void;
}) {
  return (
    <div className="sidebar">
      <div className="brand">
        <span className="brand-mark">
          <i />
          <i />
          <i />
        </span>
        <div>
          <b>
            HEL/<span>OS</span>
          </b>
          <small>Hardware Entity Logging Operating System</small>
        </div>
      </div>
      <nav>
        <p>MONITORING</p>
        {(
          [
            ["Overview", "grid"],
            ["Pipe Network", "pipe"],
            ["Trends", "chart"],
            ["Alarms", "alarm"],
          ] as const
        ).map(([label, icon]) => (
          <button
            key={label}
            className={active === label ? "active" : ""}
            onClick={() => setActive(label)}
          >
            <Icon name={icon} />
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
    </div>
  );
}
